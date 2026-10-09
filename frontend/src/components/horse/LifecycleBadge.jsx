import { LIFECYCLE_LABEL } from '../../data/constants';
import { getLifecycle } from '../../utils/horse';

export const LIFECYCLE_STYLE = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  awaiting_vet: 'bg-sky-100 text-sky-700 border-sky-200',
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  training: 'bg-blue-100 text-blue-800 border-blue-200',
  locked: 'bg-red-100 text-red-700 border-red-300',
  rehab: 'bg-orange-100 text-orange-800 border-orange-200',
};

export function LifecycleBadge({ horse }) {
  const lc = getLifecycle(horse);
  const rejected = horse.approvalStatus === 'rejected';
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${rejected ? 'bg-red-100 text-red-700 border-red-200' : LIFECYCLE_STYLE[lc]}`}>{lc === 'locked' ? '🔒 ' : ''}{rejected ? 'Bị từ chối' : LIFECYCLE_LABEL[lc]}</span>;
}
