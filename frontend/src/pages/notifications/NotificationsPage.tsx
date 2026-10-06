import { NOTIFICATIONS } from '../../data';
import { Btn } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export function NotificationsPage({ notifications, onMarkRead }: { notifications: typeof NOTIFICATIONS; onMarkRead: (id: string) => void }) {
  const icons: Record<string, string> = { health: '🏥', training: '🏇', race: '🏆', system: '⚙️' };
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between"><h2 className="text-xl font-serif font-bold">Thông báo</h2><Btn variant="ghost" onClick={() => notifications.forEach(n => onMarkRead(n.id))}>Đánh dấu tất cả đã đọc</Btn></div>
      {notifications.length === 0 && <Card className="p-10 text-center text-gray-400">Bạn chưa có thông báo.</Card>}
      {notifications.map(n => (
        <Card key={n.id} className={`p-4 cursor-pointer ${!n.read ? 'border-l-4 border-[#c9973b]' : ''}`} onClick={() => onMarkRead(n.id)}>
          <div className="flex items-start gap-3"><span className="text-xl mt-0.5">{icons[n.type]}</span><div className="flex-1"><div className={`text-sm ${!n.read ? 'font-semibold' : 'text-gray-600'}`}>{n.message}</div><div className="text-xs text-gray-400 mt-0.5">{n.time}</div></div>{!n.read && <div className="w-2 h-2 rounded-full bg-[#c9973b] mt-2" />}</div>
        </Card>
      ))}
    </div>
  );
}
