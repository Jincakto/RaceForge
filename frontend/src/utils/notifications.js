export function visibleNotifications(all, user) {
  return all.filter(n => {
    if (n.clubId && n.clubId !== user.clubId) return false;
    if (user.role === 'groom' && ['training', 'lock', 'race', 'plan', 'session'].includes(n.type)) return false;
    if (!n.toRoles && !n.toUserIds) return true;
    return !!(n.toUserIds?.includes(user.id) || (user.role && n.toRoles?.includes(user.role)));
  });
}

export function newNotif(n) {
  return { ...n, id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`, time: 'Vừa xong', read: false };
}

export function trainerTarget(h) {
  return h.headTrainerId ? { toUserIds: [h.headTrainerId] } : { toRoles: ['head_trainer'] };
}
