/**
 * Super ERP - Export Limits & Policies
 * Defines how much data each role can export to prevent data leakage.
 */

export type ExportRoleLimit = {
  maxRows: number;
  dailyLimit: number;
  allowBulkExport: boolean;
}

export const EXPORT_LIMITS: Record<string, ExportRoleLimit> = {
  admin: {
    maxRows: 50000,
    dailyLimit: 100,
    allowBulkExport: true,
  },
  management: {
    maxRows: 25000,
    dailyLimit: 50,
    allowBulkExport: true,
  },
  user: {
    maxRows: 5000,
    dailyLimit: 10,
    allowBulkExport: false,
  },
  bayi: {
    maxRows: 1000,
    dailyLimit: 5,
    allowBulkExport: false,
  },
  default: {
    maxRows: 500,
    dailyLimit: 2,
    allowBulkExport: false,
  }
};

export function getExportLimits(role: string): ExportRoleLimit {
  return EXPORT_LIMITS[role] || EXPORT_LIMITS.default;
}

export function canUserExport(role: string, rowCount: number): boolean {
  const limits = getExportLimits(role);
  return rowCount <= limits.maxRows;
}