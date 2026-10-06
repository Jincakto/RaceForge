import type * as React from 'react';
import { useRef } from 'react';

export function ImageUpload({ value, onChange, onRemove }: { value: string; onChange: (url: string) => void; onRemove: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Ảnh phải nhỏ hơn 5MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh ngựa</label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden h-40">
          <img src={value} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity">
            <button onClick={() => fileRef.current?.click()} className="bg-white text-[#1a2844] px-3 py-1.5 rounded-lg text-sm font-medium">🔄 Đổi ảnh</button>
            <button onClick={onRemove} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">🗑 Xóa</button>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">Hover để thay đổi</div>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#c9973b] hover:bg-amber-50 transition-all">
          <span className="text-3xl">📸</span>
          <span className="text-sm text-gray-500">Nhấn để tải ảnh lên</span>
          <span className="text-xs text-gray-400">JPG, PNG — tối đa 5MB</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="mt-2 flex gap-2 flex-wrap">
        {[
          { url: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=600&h=400&fit=crop', label: 'Bay' },
          { url: 'https://images.unsplash.com/photo-1534073928676-67ae3c1f5c03?w=600&h=400&fit=crop', label: 'Grey' },
          { url: 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=600&h=400&fit=crop', label: 'Chestnut' },
          { url: 'https://images.unsplash.com/photo-1566288623394-377af472d81b?w=600&h=400&fit=crop', label: 'Black' },
        ].map(opt => (
          <button key={opt.label} onClick={() => onChange(opt.url)} className={`text-xs px-3 py-1 rounded-full border transition-all ${value === opt.url ? 'bg-[#c9973b] text-white border-[#c9973b]' : 'border-gray-200 text-gray-500 hover:border-[#c9973b]'}`}>{opt.label}</button>
        ))}
      </div>
    </div>
  );
}
