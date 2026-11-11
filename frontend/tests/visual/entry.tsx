/** Standalone Vite visual fixture. Production App and its authentication flow are not mounted. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/app/index.css';
import { ResultForm } from '../../src/features/training/trainingPlans';
import {
  TrainingAssessmentDetails, TrainingAssessmentEmpty, TrainingAssessmentReadOnly,
} from '../../src/features/training/TrainingAssessmentView';
import { request } from '../../src/shared/api/api';
import { assessmentErrorMessage, type CompleteSessionInput, type TrainingVetNotificationResponse } from '../../src/features/training/trainingAssessment';
import {
  FIXTURE_HORSE_NAME, FIXTURE_SESSION_ID, SCENARIOS, installFixtureFetch, type Scenario,
} from './fixtureData';

const selected = new URLSearchParams(window.location.search).get('scenario');
const scenario: Scenario = SCENARIOS.includes(selected as Scenario) ? selected as Scenario : 'blank';
const fixture = installFixtureFetch(scenario);
const labels: Record<Scenario, string> = {
  blank: 'Complete session', normal: 'Normal', recommended: 'Vet recommended', urgent: 'Urgent vet check',
  waiting: 'Waiting for vet', history: 'Historical session', errors: 'Detail retry',
  'template-error': 'Template retry', 'submit-error': 'Save retry',
};

function VisualHarness() {
  const [assessment, setAssessment] = useState(fixture.readAssessment());
  const [saved, setSaved] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const refresh = () => setAssessment({ ...fixture.readAssessment() });
  const sendVetRequest = async (sessionId: string, reason: string) => {
    try {
      const data = await request<TrainingVetNotificationResponse>(
        '/training-sessions/' + encodeURIComponent(sessionId) + '/vet-notification', 'POST', { reason });
      refresh();
      return { ok: true as const, data };
    } catch (error) {
      return { ok: false as const, message: assessmentErrorMessage(error, 'Unable to request a vet check. Please retry.') };
    }
  };
  const complete = async (payload: CompleteSessionInput): Promise<string | null> => {
    try {
      await request('/training-sessions/' + FIXTURE_SESSION_ID + '/complete', 'PATCH', payload);
      refresh();
      setSaved(true);
      return null;
    } catch (error) {
      return assessmentErrorMessage(error, 'Unable to save the health check. Your entries have been kept. Please retry.');
    }
  };
  const isForm = scenario === 'blank' || scenario === 'template-error' || scenario === 'submit-error';
  const showSavedSummary = !isForm || saved;

  return (
    <div className="visual-fixture" data-visual-scenario={scenario}>
      <style>{`
        .visual-fixture { min-height: 100vh; background: var(--background); }
        .fixture-toolbar { padding: 12px 24px; background: #101d31; color: #edf1f7; }
        .fixture-toolbar-inner { max-width: 1100px; margin: auto; display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center; }
        .fixture-tag { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #e6bd73; font-weight: 700; }
        .fixture-nav { display: flex; flex-wrap: wrap; gap: 6px; }
        .fixture-nav a { color: #d8e0ec; border: 1px solid #334157; border-radius: 5px; padding: 5px 9px; font-size: 11px; text-decoration: none; }
        .fixture-nav a[aria-current=page] { color: #17233a; background: #e6bd73; border-color: #e6bd73; }
        .fixture-nav a:focus-visible { outline: 3px solid white; outline-offset: 2px; }
        .fixture-main { max-width: 1030px; margin: 0 auto; padding: 32px 24px 64px; }
        .fixture-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #6b7a99; margin: 0 0 12px; }
        .fixture-heading { font-family: var(--font-serif); font-size: clamp(25px, 4vw, 34px); line-height: 1.2; margin: 0; color: #15253e; font-weight: 600; }
        .fixture-subtitle { margin: 10px 0 25px; color: #6b7a99; font-size: 13px; line-height: 1.6; }
        .fixture-panel { padding: 24px; background: white; border: 1px solid #dde2eb; border-radius: 12px; box-shadow: 0 4px 16px #172b4510; }
        .fixture-session { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12px; color: #6b7a99; margin: 0 0 12px; }
        .fixture-session strong { color: #1a2844; font-weight: 600; }
        .fixture-footnote { color: #78859a; font-size: 11px; margin: 18px 0 0; line-height: 1.6; }
        @media (max-width: 600px) {
          .fixture-main { padding: 22px 14px 40px; }
          .fixture-toolbar { padding: 12px 14px; }
          .fixture-panel { padding: 16px; border-radius: 9px; }
          .fixture-nav a { font-size: 10px; padding: 5px 7px; }
        }
      `}</style>
      <header className="fixture-toolbar">
        <div className="fixture-toolbar-inner">
          <span className="fixture-tag">RaceForge · visual test fixture</span>
          <nav className="fixture-nav" aria-label="Visual test scenario">
            {SCENARIOS.map(value => <a key={value} href={'?scenario=' + value}
              aria-current={scenario === value ? 'page' : undefined}>{labels[value]}</a>)}
          </nav>
        </div>
      </header>
      <main className="fixture-main">
        <p className="fixture-eyebrow">Training / Session details</p>
        <h1 className="fixture-heading">{isForm && !saved ? 'Complete training session' : 'Post-training health check'}</h1>
        <p className="fixture-subtitle">Record observations after exercise and keep the next training decision clear.</p>
        <section className="fixture-panel" aria-label="Session assessment fixture">
          <p className="fixture-session"><span><strong>{FIXTURE_HORSE_NAME}</strong> · {FIXTURE_SESSION_ID}</span>
            <span>Foundation conditioning</span><span>10 November 2026 · 09:00–09:30</span></p>
          {isForm && !saved && !cancelled && <ResultForm onSubmit={complete} onCancel={() => setCancelled(true)} />}
          {cancelled && <p role="status">Form dismissed. Choose a scenario above to reset the fixture.</p>}
          {showSavedSummary && scenario === 'history' && <TrainingAssessmentEmpty />}
          {showSavedSummary && scenario === 'errors' && <TrainingAssessmentDetails sessionId={FIXTURE_SESSION_ID}
            overallNotes="Observed recovery after exercise. The original measurements remain in the session record."
            canRequest={false} onRequestVetCheck={sendVetRequest} />}
          {showSavedSummary && scenario !== 'history' && scenario !== 'errors' && <TrainingAssessmentReadOnly
            assessment={assessment} overallNotes={saved ? fixture.diagnostics.lastCompletion?.performanceNotes
              : 'Session completed. Observations were recorded during the post-training check.'}
            canRequest={assessment.alertLevel === 'NO_ALERT_DETECTED'} onRequestVetCheck={sendVetRequest} onRefresh={refresh} />}
        </section>
        <p className="fixture-footnote">Isolated component preview. Data and API responses are local fixtures; no account or database is accessed.</p>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<VisualHarness />);