import { request } from '../../../shared/api/api';
import type { AuditEntry } from '../admin';

export interface AuditLogWire {
  auditId: string;
  actorId: string | null;
  horseId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  result: string | null;
  reason: string | null;
  createdAt: string | null;
}

export interface AuditLogPageResult {
  content: AuditLogWire[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditLogFilters {
  q?: string;
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  horseId?: string;
  result?: string;
  from?: string;
  to?: string;
}

export function listSystemAuditLogs(filters: AuditLogFilters = {}, page = 0, size = 20) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  for (const [key, value] of Object.entries(filters)) {
    if (value?.trim()) query.set(key, value.trim());
  }
  return request<AuditLogPageResult>(`/admin/audit-logs?${query.toString()}`);
}

/** Audit_Log's DATETIME2 column does not encode a time zone; display the stored wall-clock time. */
export function systemAuditToEntry(row: AuditLogWire): AuditEntry {
  const timestamp = row.createdAt || '';
  const time = /^\d{4}-\d{2}-\d{2}/.test(timestamp)
    ? `${timestamp.slice(8, 10)}/${timestamp.slice(5, 7)}/${timestamp.slice(0, 4)} ${timestamp.slice(11, 16)}`
    : 'Unknown time';
  return {
    id: row.auditId,
    time,
    actor: row.actorId || 'System / unknown',
    actorRole: 'Role not stored',
    action: row.action,
    target: [row.entityType, row.entityId].filter(Boolean).join(' #') || row.horseId || '—',
    reason: row.reason || undefined,
  };
}
