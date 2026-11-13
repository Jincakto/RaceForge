import { type Lifecycle, type Horse, getLifecycle, LIFECYCLE_LABEL, LIFECYCLE_ORDER } from "../../../shared/data/data";
import { useRef } from "react";

const LIFECYCLE_STYLE: Record<Lifecycle, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  awaiting_vet: "bg-sky-100 text-sky-700 border-sky-200",
  ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  training: "bg-blue-100 text-blue-800 border-blue-200",
  locked: "bg-red-100 text-red-700 border-red-300",
};

export function LifecycleBadge({ horse }: { horse: Horse }) {
  const lc = getLifecycle(horse);
  const rejected = horse.approvalStatus === "rejected";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${rejected ? "bg-red-100 text-red-700 border-red-200" : LIFECYCLE_STYLE[lc]}`}
    >
      {lc === "locked" ? "🔒 " : ""}
      {rejected ? "Rejected" : LIFECYCLE_LABEL[lc]}
    </span>
  );
}

export function LifecycleStepper({ horse }: { horse: Horse }) {
  const lc = getLifecycle(horse);
  const steps: Lifecycle[] = [
    "pending",
    "awaiting_vet",
    "ready",
    "training",
    "locked",
  ];
  const idx = LIFECYCLE_ORDER.indexOf(lc);
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {steps.map((st, i) => {
        const cur = st === lc;
        const done = i < idx;
        return (
          <div key={st} className="flex items-center gap-1 flex-1 min-w-fit">
            <div
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${cur ? (st === "locked" ? "bg-red-600 text-white border-red-600" : "bg-[#c9973b] text-white border-[#c9973b]") : done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-gray-400 border-gray-200"}`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${cur ? "bg-white/30" : done ? "bg-emerald-500 text-white" : "bg-gray-100"}`}
              >
                {done ? "✓" : i + 1}
              </span>
              {LIFECYCLE_LABEL[st]}
            </div>
            {i < steps.length - 1 && (
              <span className="text-gray-300 text-xs">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PedigreeBlock({ horse }: { horse: Horse }) {
  if (!horse.sire && !horse.dam && !horse.medicalHistory) return null;
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      {[
        ["Cha (Sire)", horse.sire],
        ["Dam", horse.dam],
      ].map(([k, v]) => (
        <div
          key={k as string}
          className="p-2.5 bg-gray-50 rounded-lg border border-gray-100"
        >
          <div className="text-[11px] text-gray-400 uppercase">
            {k as string}
          </div>
          <div className="font-medium">{(v as string) || "—"}</div>
        </div>
      ))}
      {horse.medicalHistory && (
        <div className="col-span-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-[11px] text-gray-400 uppercase">
            Medical history
          </div>
          <div className="text-gray-700">{horse.medicalHistory}</div>
        </div>
      )}
    </div>
  );
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
}: {
  value: string;
  onChange: (url: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Horse image
      </label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden h-40">
          <img src={value} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity">
            <button
              onClick={() => fileRef.current?.click()}
              className="bg-white text-[#1a2844] px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              🔄 Change image
            </button>
            <button
              onClick={onRemove}
              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              🗑 Delete
            </button>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
            Hover to change
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#c9973b] hover:bg-amber-50 transition-all"
        >
          <span className="text-3xl">📸</span>
          <span className="text-sm text-gray-500">
            Click to upload an image
          </span>
          <span className="text-xs text-gray-400">JPG, PNG — up to 5 MB</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <div className="mt-2 flex gap-2 flex-wrap">
        {[
          {
            url: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=600&h=400&fit=crop",
            label: "Bay",
          },
          {
            url: "https://images.unsplash.com/photo-1534073928676-67ae3c1f5c03?w=600&h=400&fit=crop",
            label: "Grey",
          },
          {
            url: "https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=600&h=400&fit=crop",
            label: "Chestnut",
          },
          {
            url: "https://images.unsplash.com/photo-1566288623394-377af472d81b?w=600&h=400&fit=crop",
            label: "Black",
          },
        ].map((opt) => (
          <button
            key={opt.label}
            onClick={() => onChange(opt.url)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${value === opt.url ? "bg-[#c9973b] text-white border-[#c9973b]" : "border-gray-200 text-gray-500 hover:border-[#c9973b]"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
