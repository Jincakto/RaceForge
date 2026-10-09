import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { NoAccess } from '../components/ui/NoAccess';

/** Requires a logged-in user, otherwise sends them back to the landing page. */
export function RequireAuth() {
  const { state } = useApp();
  if (!state.user) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Requires a user that has finished onboarding (has a role). */
export function RequireRole() {
  const { state } = useApp();
  if (!state.user?.role) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

/**
 * Restricts a route to some roles.
 * - fallback="noAccess" shows a lock message (default)
 * - fallback={<Element/>} renders a custom element
 * - fallback={null} renders nothing
 */
export function RoleGate({ roles, children, message = 'Bạn không có quyền truy cập trang này', fallback = 'noAccess' }) {
  const { state } = useApp();
  if (roles.includes(state.user?.role)) return children;
  if (fallback === 'noAccess') return <NoAccess text={message} />;
  return fallback;
}
