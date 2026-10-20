/** One local calendar date shared by forms, eligibility checks and schedules. */
export const today = () => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date());
export const TODAY = today();
