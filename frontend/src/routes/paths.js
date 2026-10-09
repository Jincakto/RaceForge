// Single source of truth for URL paths. Pages still navigate by "page key"
// (e.g. navigate('horse-list')) so UI code stays decoupled from URLs.

export const PAGE_PATHS = {
  home: '/',
  login: '/login',
  register: '/register',
  onboarding: '/onboarding',
  'join-center': '/join-center',
  pending: '/pending',

  dashboard: '/dashboard',
  'horse-list': '/horses',
  'horse-create': '/horses/new',
  'my-horses': '/my-horses',
  'center-requests': '/center-requests',
  'trainer-select': '/trainer-select',
  'trainer-profile': '/trainer-profile',
  'health-records': '/health-records',
  'vet-health-form': '/health-form',
  'training-hub': '/training',
  'care-hub': '/care',
  performance: '/performance',
  'race-results': '/race-results',
  reports: '/reports',
  staff: '/staff',
  'member-requests': '/member-requests',
  notifications: '/notifications',
  profile: '/profile',
  'training-register': '/training-register',
  'post-exam': '/post-exam',
  'rehab-center': '/rehab',
  inventory: '/inventory',
  'inventory-log': '/inventory-log',
};

export const HORSE_DETAIL_PATTERN = '/horses/:horseId';

/** page key -> URL. 'horse-detail' needs the horse id. */
export function pagePath(page, { horseId } = {}) {
  if (page === 'horse-detail') return horseId ? `/horses/${horseId}` : PAGE_PATHS['horse-list'];
  return PAGE_PATHS[page] ?? PAGE_PATHS.dashboard;
}

const PATH_TO_PAGE = Object.fromEntries(Object.entries(PAGE_PATHS).map(([page, p]) => [p, page]));

/** URL -> page key (used to highlight the sidebar and pick the page title). */
export function pathToPage(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PATH_TO_PAGE[clean]) return PATH_TO_PAGE[clean];
  if (/^\/horses\/[^/]+$/.test(clean)) return 'horse-detail';
  return null;
}
