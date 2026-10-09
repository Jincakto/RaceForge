import { LIFECYCLE_LABEL, LIFECYCLE_ORDER } from '../../data/constants';
import { getLifecycle } from '../../utils/horse';

export function LifecycleStepper({ horse }) {
  const lc = getLifecycle(horse);
  const steps = ['pending', 'awaiting_vet', 'ready', 'training', 'locked', 'rehab'];
  const idx = LIFECYCLE_ORDER.indexOf(lc);
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {steps.map((st, i) => {
        const cur = st === lc; const done = i < idx;
        return (
          <div key={st} className="flex items-center gap-1 flex-1 min-w-fit">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${cur ? (st === 'locked' ? 'bg-red-600 text-white border-red-600' : 'bg-[#c9973b] text-white border-[#c9973b]') : done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-400 border-gray-200'}`}>
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${cur ? 'bg-white/30' : done ? 'bg-emerald-500 text-white' : 'bg-gray-100'}`}>{done ? '✓' : i + 1}</span>{LIFECYCLE_LABEL[st]}
            </div>
            {i < steps.length - 1 && <span className="text-gray-300 text-xs">›</span>}
          </div>
        );
      })}
    </div>
  );
}
