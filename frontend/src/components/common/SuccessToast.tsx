

export function SuccessToast({ message }: { message: string }) {
  return (
    <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
      <span className="text-lg">✓</span><span className="font-medium text-sm">{message}</span>
    </div>
  );
}
