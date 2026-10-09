import { Sidebar } from './Sidebar';
import { getLifecycle } from '../../utils/horse';
import { visibleNotifications } from '../../utils/notifications';

export function AppLayout({ user, page, title, navigate, children, state }) {
  const unread = visibleNotifications(state.notifications, user).filter(n => !n.read).length;
  const myClub = state.clubs.find(c => c.managerId === user.id);
  const pendingMembers = myClub ? state.memberRequests.filter(r => r.clubId === myClub.id && r.status === 'pending').length : 0;
  const pendingHorses = myClub ? state.horseClubRequests.filter(r => r.clubId === myClub.id && r.status === 'pending').length : 0;
  const grantedPages = state.userPermissions[user.id] || [];
  const clubHorses = state.horses.filter(h => h.clubId === user.clubId);
  const rehabCount = myClub ? clubHorses.filter(h => h.lock && !h.rehab).length : 0;
  const vetTodoCount = user.role === 'veterinarian'
    ? clubHorses.filter(h => ['awaiting_vet', 'locked', 'rehab'].includes(getLifecycle(h))).length
      + state.trainingSessions.filter(s => s.status === 'Completed' && !s.postExamDone && clubHorses.some(h => h.id === s.horseId)).length
    : 0;
  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f7]">
      <Sidebar user={user} page={page} navigate={navigate} memberReqCount={pendingMembers} horseReqCount={pendingHorses} vetTodoCount={vetTodoCount} rehabCount={rehabCount} grantedPages={grantedPages} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1"><h1 className="text-base font-semibold text-[#0f1729]">{title}</h1></div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('notifications')} className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
              🔔{unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unread}</span>}
            </button>
            <button onClick={() => navigate('profile')} className="w-8 h-8 rounded-full bg-[#1a2844] flex items-center justify-center text-white text-xs font-bold">{user.avatar}</button>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
