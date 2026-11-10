import { useEffect, useState } from 'react';
import { Modal } from './admin';
import { Btn } from './ui';
import { TrainingAssessmentReadOnly } from './TrainingAssessmentView';
import { fetchAssessmentNotification, type TrainingAssessmentContext, type TrainingAssessmentResponse } from './trainingAssessment';

export function TrainingAssessmentNotification({ notificationId, canExamine, onClose, onExamine }: {
  notificationId: string; canExamine: boolean; onClose: () => void;
  onExamine: (context: TrainingAssessmentContext) => void;
}) {
  const [value, setValue] = useState<{target: TrainingAssessmentContext; assessment: TrainingAssessmentResponse} | null>(null);
  const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; setValue(null); setError('');
    fetchAssessmentNotification(notificationId).then(result => { if (active) setValue(result); })
      .catch(e => { if (active) setError(e.message || 'Unable to open this post-training check.'); });
    return () => { active = false; };
  }, [notificationId, attempt]);
  return <Modal title="Post-training health check" onClose={onClose} wide>
    {error ? <div role="alert" className="space-y-3 text-sm text-red-700"><p>{error}</p><Btn onClick={() => setAttempt(n => n + 1)}>Retry</Btn></div>
      : !value ? <p role="status">Loading the saved health check...</p> : <div className="space-y-4">
        <p className="text-sm text-slate-600">Horse {value.target.horseId} - Session {value.target.sessionId}</p>
        <TrainingAssessmentReadOnly assessment={value.assessment}/>
        {canExamine && !value.assessment.reviewedMedicalRecordId && <Btn variant="gold" onClick={() => onExamine(value.target)}>Open follow-up examination</Btn>}
        {value.assessment.reviewedMedicalRecordId && <p className="text-sm text-emerald-800">Reviewed in examination {value.assessment.reviewedMedicalRecordId}.</p>}
      </div>}
  </Modal>;
}
