import { ROLE_LABELS } from '../../data/constants';
import { GRANTABLE_PAGES, NAV_ITEMS } from '../../data/navigation';

export function Sidebar({ user, page, navigate, memberReqCount, horseReqCount, vetTodoCount, rehabCount, grantedPages }) {
  const roleItems = NAV_ITEMS[user.role] || [];
  const rolePages = new Set(roleItems.map(i => i.page));
  const extraItems = GRANTABLE_PAGES
    .filter(g => grantedPages.includes(g.page) && !rolePages.has(g.page))
    .map(g => ({ icon: g.icon, label: g.label, page: g.page }));
  const items = [...roleItems, ...extraItems];
  return (
    <div className="w-60 min-h-screen bg-[#0f1729] flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#c9973b] flex items-center justify-center text-white text-lg">🐎</div>
          <div><div className="text-white font-serif font-bold text-base leading-tight">RaceForce</div><div className="text-[#c9973b] text-xs">Horse Racing Management</div></div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {items.map(item => {
          const badge = 'badge' in item ? (item).badge : undefined;
          const bc = badge === 'memberReqs' ? memberReqCount : badge === 'horseReqs' ? horseReqCount : badge === 'vetTodo' ? vetTodoCount : badge === 'rehabReqs' ? rehabCount : 0;
          const active = page === item.page;
          return (
            <button key={item.page} onClick={() => navigate(item.page)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${active ? 'bg-[#c9973b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-base">{item.icon}</span><span className="flex-1">{item.label}</span>
              {bc > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{bc}</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button onClick={() => navigate('profile')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-all">
          <div className="w-8 h-8 rounded-full bg-[#c9973b] flex items-center justify-center text-white text-xs font-bold">{user.avatar}</div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-white text-sm font-medium truncate">{user.name}</div>
            <div className="text-gray-400 text-xs">{ROLE_LABELS[user.role]}</div>
          </div>
        </button>
      </div>
    </div>
  );
}
