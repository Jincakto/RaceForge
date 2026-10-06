import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
test('owner prototype workflows and views', async context => {
  const server = await createServer({ root, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
  context.after(() => server.close())
  const data = await server.ssrLoadModule('/src/data.ts')
  const actions = await server.ssrLoadModule('/src/utils/ownerActions.ts')
  const owner = data.SEED_USERS.find(user => user.email === 'owner@raceforce.vn')
  const newOwner = data.SEED_USERS.find(user => user.email === 'owner2@raceforce.vn')
  const trainer = data.SEED_USERS.find(user => user.role === 'head_trainer' && user.clubId === owner.clubId)
  function fixture(user = owner) {
    return structuredClone({ user, page: 'dashboard', users: data.SEED_USERS, clubs: data.SEED_CLUBS,
      horses: [...data.HORSES, { ...data.HORSES[0], id: 'foreign-horse', ownerId: newOwner.id, ownerName: newOwner.name }],
      memberRequests: data.SEED_REQUESTS, horseClubRequests: data.SEED_HORSE_CLUB_REQUESTS,
      healthRecords: data.MEDICAL_RECORDS, trainingPlans: data.TRAINING_PLANS,
      trainingSessions: data.TRAINING_SESSIONS, tasks: data.GROOM_TASKS, notifications: data.NOTIFICATIONS,
      selectedHorseId: data.HORSES[0].id, trainerSelectHorseId: null, viewTrainerId: null, showSuccess: null, userPermissions: {} })
  }
  function draft(state = fixture()) {
    return { ...state.horses[0], id: 'new-horse', name: ' Silver Arrow ', ownerId: state.user.id, clubId: null, color: 'Bay', age: 3,
      weight: 500, height: 160, headTrainerId: '', headTrainerName: '', healthStatus: 'Pending Vet', trainingStatus: 'Pending Approval',
      approvalStatus: 'pending', vetClearance: false, approvedAt: null, achievements: [], raceHistory: [], wins: 0, totalRaces: 0 }
  }
  await context.test('owner scope excludes another owner and linked records', () => {
    const state = fixture()
    state.healthRecords.push({ ...state.healthRecords[0], id: 'foreign-record', horseId: 'foreign-horse' })
    const view = actions.ownerView(state)
    assert.ok(view.horses.every(horse => horse.ownerId === owner.id))
    assert.ok(!view.healthRecords.some(record => record.id === 'foreign-record'))
    assert.ok(!view.notifications.some(notification => notification.id === 'n5'))
    assert.equal(actions.ownerView({ ...state, user: null }).horses.length, 0)
  })
  await context.test('new horse draft is added once and selects the correct horse for the trainer step', () => {
    const state = fixture()
    const next = actions.addOwnerHorse(state, draft(state))
    assert.equal(next.horses.at(-1).name, 'Silver Arrow')
    assert.equal(next.horses.at(-1).clubId, null)
    assert.equal(next.horses.at(-1).vetClearance, false)
    assert.equal(next.trainerSelectHorseId, 'new-horse')
    assert.equal(state.horses.length + 1, next.horses.length)
    assert.throws(() => actions.addOwnerHorse(next, draft(state)), /đã tồn tại/)
    assert.throws(() => actions.addOwnerHorse(state, { ...draft(state), ownerId: newOwner.id }), /của mình/)
  })
  await context.test('horse fields and real calendar dates are validated', () => {
    assert.ok(actions.validateHorseFields({ ...draft(), age: 0 }))
    assert.ok(actions.validateHorseFields({ ...draft(), age: 3.5 }))
    assert.ok(actions.validateHorseFields({ ...draft(), weight: NaN }))
    assert.ok(actions.validateHorseFields({ ...draft(), height: -1 }))
    assert.ok(actions.validateHorseFields({ ...draft(), name: ' ' }))
    assert.equal(actions.validDisplayDate('29/02/2024'), true)
    assert.equal(actions.validDisplayDate('29/02/2026'), false)
    assert.equal(actions.validDisplayDate('31/02/2026'), false)
    assert.equal(actions.validDisplayDate('2026-10-06'), false)
  })
  await context.test('trainer assignment accepts active verified members of the same club', () => {
    const state = actions.addOwnerHorse(fixture(), draft())
    const next = actions.assignOwnerTrainer(state, 'new-horse', trainer.id)
    assert.equal(next.horses.at(-1).headTrainerId, trainer.id)
    assert.equal(next.trainerSelectHorseId, null)
    const foreignClub = { ...state, users: state.users.map(user => user.id === trainer.id ? { ...user, clubId: 'other-club' } : user) }
    assert.throws(() => actions.assignOwnerTrainer(foreignClub, 'new-horse', trainer.id), /trung tâm/)
    const inactive = { ...state, users: state.users.map(user => user.id === trainer.id ? { ...user, status: 'pending' } : user) }
    assert.throws(() => actions.assignOwnerTrainer(inactive, 'new-horse', trainer.id), /trung tâm/)
    assert.throws(() => actions.assignOwnerTrainer(state, 'foreign-horse', trainer.id), /của bạn/)
  })
  await context.test('club submission stays pending, adds an owner notification and prevents duplicates', () => {
    const state = actions.assignOwnerTrainer(actions.addOwnerHorse(fixture(), draft()), 'new-horse', trainer.id)
    const at = new Date(2026, 9, 6, 12)
    const next = actions.submitOwnerHorse(state, 'new-horse', at)
    const request = next.horseClubRequests.at(-1)
    assert.equal(request.status, 'pending')
    assert.equal(request.ownerId, owner.id)
    assert.equal(request.clubId, owner.clubId)
    assert.equal(request.submittedAt, at.toLocaleDateString('vi-VN'))
    const expires = new Date(at); expires.setDate(expires.getDate() + 7)
    assert.equal(request.expiresAt, expires.toLocaleDateString('vi-VN'))
    assert.equal(next.horses.at(-1).clubId, null)
    assert.equal(next.horses.at(-1).headTrainerId, trainer.id)
    assert.ok(actions.ownerView(next).notifications.some(notification => notification.id === request.id))
    assert.throws(() => actions.submitOwnerHorse(next, 'new-horse', at), /chờ duyệt/)
    assert.throws(() => actions.submitOwnerHorse(state, 'foreign-horse', at), /của bạn/)
    assert.throws(() => actions.submitOwnerHorse({ ...state, user: { ...owner, clubId: null } }, 'new-horse', at), /tham gia trung tâm/)
  })
  await context.test('edits cannot change ownership, club approvals, health clearance or achievements', () => {
    const state = fixture()
    const original = state.horses[0]
    const next = actions.updateOwnerHorse(state, { ...original, name: ' Updated ', weight: 510, clubId: 'forged', vetClearance: !original.vetClearance, achievements: [] })
    const updated = next.horses[0]
    assert.equal(updated.name, 'Updated')
    assert.equal(updated.weight, 510)
    assert.equal(updated.clubId, original.clubId)
    assert.equal(updated.vetClearance, original.vetClearance)
    assert.deepEqual(updated.achievements, original.achievements)
    assert.throws(() => actions.updateOwnerHorse(state, state.horses.at(-1)), /của mình/)
    assert.throws(() => actions.updateOwnerHorse(state, { ...original, weight: 0 }), /lớn hơn 0/)
  })
  await context.test('achievements validate dates and only update the selected owned horse', () => {
    const state = fixture()
    const achievement = { id: 'new-achievement', title: ' Sprint Cup ', date: '06/10/2026', description: 'Demo', position: 1 }
    const next = actions.addOwnerAchievement(state, state.horses[0].id, achievement)
    assert.equal(next.horses[0].achievements.at(-1).title, 'Sprint Cup')
    assert.equal(next.horses[0].achievements.length, state.horses[0].achievements.length + 1)
    assert.deepEqual(next.horses.at(-1), state.horses.at(-1))
    assert.throws(() => actions.addOwnerAchievement(state, 'foreign-horse', achievement), /của mình/)
    assert.throws(() => actions.addOwnerAchievement(state, state.horses[0].id, { ...achievement, date: '31/02/2026' }), /ngày hợp lệ/)
  })
  await context.test('notification reading is scoped and profile changes persist in the current React data', () => {
    const state = fixture()
    const notification = actions.ownerView(state).notifications.find(item => !item.read)
    const read = actions.markOwnerNotification(state, notification.id)
    assert.equal(read.notifications.find(item => item.id === notification.id).read, true)
    assert.equal(actions.markOwnerNotification(state, 'n5'), state)
    const updated = actions.updateOwnerProfile(state, ' Nguyễn Minh Long ')
    assert.equal(updated.user.name, 'Nguyễn Minh Long')
    assert.equal(updated.user.avatar, 'ML')
    assert.equal(updated.users.find(user => user.id === owner.id).name, updated.user.name)
    assert.ok(updated.horses.filter(horse => horse.ownerId === owner.id).every(horse => horse.ownerName === updated.user.name))
    assert.throws(() => actions.updateOwnerProfile(state, ' '), /họ tên/)
  })
  const pages = {
    OwnerDashboard: 'dashboard', MyHorsesPage: 'horses', HorseCreatePage: 'horses', HorseDetailPage: 'horses',
    TrainerSelectPage: 'staff', HealthRecordsPage: 'health', PerformancePage: 'performance',
    RaceResultsPage: 'performance', NotificationsPage: 'notifications', ProfilePage: 'profile',
  }
  for (const [name, folder] of Object.entries(pages)) {
    const module = await server.ssrLoadModule(`/src/pages/${folder}/${name}.tsx`)
    for (const empty of [false, true]) await context.test(`${name} renders with ${empty ? 'no' : 'owned'} horses`, () => {
      const state = fixture(empty ? newOwner : owner)
      if (empty) state.horses = []
      const scoped = actions.ownerView(state)
      const noop = () => {}
      const props = { state: scoped, user: scoped.user, horses: scoped.horses, notifications: scoped.notifications,
        navigate: noop, onSelectHorse: noop, onSubmitToCenter: noop, onCreateHorse: noop,
        onUpdateHorse: noop, onShowSuccess: noop, onAddAchievement: noop, onSelectTrainer: noop,
        onMarkRead: noop, onLogout: noop, onSave: noop, onUpdateName: noop }
      const html = renderToStaticMarkup(React.createElement(module[name], props))
      assert.ok(html.length > 50)
      if (name === 'HorseDetailPage' && empty) assert.ok(html.includes('Không tìm thấy ngựa của bạn'))
    })
  }
})
