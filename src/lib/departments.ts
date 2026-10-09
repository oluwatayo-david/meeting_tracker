/** Single list of departments, shared by the UI and validated by the API. */
export const DEPARTMENTS = [
  'Engineering',
  'Programs',
  'Finance',
  'Communications',
  'Monitoring & Evaluation',
  'Operations',
  'Human Resources',
  'Research',
  'Executive Office',
  'Field Operations',
  'Digital Health Solutions',
  'Leadership & Program Strategy',
] as const;

export function isValidDepartment(value: unknown): value is string {
  return typeof value === 'string' && (DEPARTMENTS as readonly string[]).includes(value);
}

export const ROLES = ['ADMIN', 'MANAGER', 'STAFF'] as const;

export function isValidRole(value: unknown): value is (typeof ROLES)[number] {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
