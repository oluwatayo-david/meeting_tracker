/** Single list of projects, shared by the UI and validated by the API. */
export const PROJECTS = [
  'Vaccine Financing',
  'Innovation',
  'Spark',
  'Sage',
  'Talent Team',
] as const;

/** Alias for backward compatibility across the codebase where DEPARTMENTS was previously imported */
export const DEPARTMENTS = PROJECTS;

/** Normalize legacy department names like 'Monitoring & Evaluation' or variations to official project names */
export function normalizeProject(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (/monitor/i.test(trimmed)) return 'Vaccine Financing';
  if (/vaccine/i.test(trimmed)) return 'Vaccine Financing';
  if (/innovat/i.test(trimmed)) return 'Innovation';
  if (/spark/i.test(trimmed)) return 'Spark';
  if (/sage/i.test(trimmed)) return 'Sage';
  if (/talent/i.test(trimmed)) return 'Talent Team';
  return trimmed;
}

export function isValidDepartment(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const normalized = normalizeProject(value);
  const list: readonly string[] = PROJECTS;
  return list.includes(normalized) || list.includes(value);
}

export const ROLES = ['ADMIN', 'MANAGER', 'STAFF'] as const;

export function isValidRole(value: unknown): value is (typeof ROLES)[number] {
  if (typeof value !== 'string') return false;
  if (value === 'PRINCIPAL') return true;
  const list: readonly string[] = ROLES;
  return list.includes(value);
}

export function formatRoleName(role?: string | null): string {
  if (!role) return 'Staff';
  if (role === 'ADMIN' || role === 'PRINCIPAL') return 'Principal';
  if (role === 'MANAGER') return 'Project Manager';
  if (role === 'STAFF') return 'Staff';
  return role;
}
