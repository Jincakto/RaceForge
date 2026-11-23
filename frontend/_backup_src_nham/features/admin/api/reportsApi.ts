import { request, requestCsv } from '../../../shared/api/api';

export interface RevenueBreakdown { label: string; orderCount: number; amount: number }
export interface RevenueSummary {
  currency: 'VND'; metric: 'GROSS_CONFIRMED_COLLECTIONS';
  totalCollected: number; paidOrderCount: number; averagePayment: number;
  notAppliedCount: number; historicalUndatedPaidCount: number;
  byType: RevenueBreakdown[]; byMonth: RevenueBreakdown[];
}
export interface RevenueTransaction {
  orderCode: number; horsePackageId: string; packageId: string; packageName: string;
  packageType: string; amount: number; paymentState: string; applied: boolean;
  confirmedAtUtc: string | null;
}
export type RevenueFilter = { from?: string; to?: string; packageType?: string };
function query(filter: RevenueFilter): string {
  const params = new URLSearchParams();
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  if (filter.packageType) params.set('packageType', filter.packageType);
  return params.toString() ? `?${params}` : '';
}
export const revenueSummary = (filter: RevenueFilter) => request<RevenueSummary>(`/reports/revenue/summary${query(filter)}`);
export const revenueTransactions = (filter: RevenueFilter) => request<RevenueTransaction[]>(`/reports/revenue/transactions${query(filter)}`);
export const revenueExport = (filter: RevenueFilter) => requestCsv(`/reports/revenue/export${query(filter)}`);
