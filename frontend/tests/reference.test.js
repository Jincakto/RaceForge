import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const manifest = JSON.parse(fs.readFileSync(new URL('./reference-manifest.json', import.meta.url), 'utf8'))
const digest = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex')

test('selected pages and shared declarations preserve the supplied JSX', () => {
  for (const expected of manifest.declarations) {
    const source = fs.readFileSync(path.join(root, expected.file), 'utf8')
    const ast = ts.createSourceFile(expected.file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const node = ast.statements.find(statement => (statement.name?.text || statement.declarationList?.declarations[0]?.name.getText(ast)) === expected.name)
    assert.ok(node, expected.name)
    assert.equal(digest(node.getText(ast).replace(/^export (default )?/, '')), expected.sha256, expected.name)
  }
  for (const expected of manifest.files) assert.equal(digest(fs.readFileSync(path.join(root, expected.file), 'utf8')), expected.sha256, expected.file)
})

test('every supplied page, OTP and the sidebar layout render successfully', async context => {
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })
  context.after(() => server.close())
  const data = await server.ssrLoadModule('/src/data.ts')
  const manager = data.SEED_USERS.find(user => user.role === 'manager')
  const fixture = {
    user: manager, page: 'dashboard', users: data.SEED_USERS, clubs: data.SEED_CLUBS,
    memberRequests: data.SEED_REQUESTS, horses: data.HORSES, horseClubRequests: data.SEED_HORSE_CLUB_REQUESTS,
    healthRecords: data.MEDICAL_RECORDS, trainingPlans: data.TRAINING_PLANS,
    trainingSessions: data.TRAINING_SESSIONS, tasks: data.GROOM_TASKS, notifications: data.NOTIFICATIONS,
    selectedHorseId: data.HORSES[0].id, trainerSelectHorseId: data.HORSES[0].id,
    viewTrainerId: data.SEED_USERS.find(user => user.role === 'head_trainer').id,
    showSuccess: null, userPermissions: {},
  }
  const noop = () => {}
  const roles = { VetDashboard: 'veterinarian', VetHealthFormPage: 'veterinarian', GroomDashboard: 'groom', CareHubPage: 'groom', OwnerDashboard: 'owner', MyHorsesPage: 'owner', HorseCreatePage: 'owner', TrainerSelectPage: 'owner', HeadTrainerDashboard: 'head_trainer', TrainingHubPage: 'head_trainer' }
  for (const page of manifest.pages) await context.test(page.name, async () => {
    const module = await server.ssrLoadModule('/' + page.file)
    const user = roles[page.name] ? data.SEED_USERS.find(person => person.role === roles[page.name]) : manager
    const state = { ...fixture, user }
    const props = { state, user, navigate: noop, users: state.users, clubs: state.clubs, horses: state.horses,
      role: user.role, clubId: user.clubId, memberRequests: state.memberRequests,
      notifications: state.notifications, trainerId: state.viewTrainerId,
      onLogin: noop, onRegister: noop, onLogout: noop, onCreateClub: noop, onJoinRequest: noop,
      onSelectHorse: noop, onUpdateHorse: noop, onShowSuccess: noop, onCreateHorse: noop,
      onSubmitToCenter: noop, onSelectTrainer: noop, onApproveRequest: noop, onApprove: noop,
      onReject: noop, onViewTrainer: noop, onSave: noop, onSaveRecord: noop, onTaskUpdate: noop,
      onUpdatePermissions: noop, onMarkRead: noop }
    const html = renderToStaticMarkup(React.createElement(module[page.name], props))
    assert.ok(html.length > 100, page.name + ' should contain its supplied UI')
  })
  await context.test('OTPModal', async () => {
    const { OTPModal } = await server.ssrLoadModule('/src/components/common/OTPModal.tsx')
    const html = renderToStaticMarkup(React.createElement(OTPModal, { email: 'demo@example.com', code: '123456', onVerify: noop, onClose: noop }))
    assert.ok(html.includes('123456'))
    assert.ok(html.includes('Xác thực OTP'))
  })
  await context.test('AppLayout and sidebar', async () => {
    const { AppLayout } = await server.ssrLoadModule('/src/components/layout/AppLayout.tsx')
    const html = renderToStaticMarkup(React.createElement(AppLayout, { user: manager, state: fixture, page: 'dashboard', title: 'Dashboard', navigate: noop }, 'content'))
    assert.ok(html.includes('Ngựa trong trung tâm'))
    assert.ok(html.includes('content'))
  })
  await context.test('App entrypoint', async () => {
    const { default: App } = await server.ssrLoadModule('/src/App.tsx')
    const html = renderToStaticMarkup(React.createElement(App))
    assert.ok(html.includes('RaceForce'))
  })
})
