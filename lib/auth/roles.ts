export type UserRole =
  | 'student'
  | 'parent'
  | 'super_admin'
  | 'content_editor'
  | 'support_agent'
  | 'finance_viewer'
  | 'infra_engineer'
  | 'read_only';

export const ADMIN_ROLES = [
  'super_admin',
  'content_editor',
  'support_agent',
  'finance_viewer',
  'infra_engineer',
  'read_only',
] as const satisfies readonly UserRole[];

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: UserRole): role is AdminRole {
  return (ADMIN_ROLES as readonly UserRole[]).includes(role);
}

/**
 * Which admin sections each role can access in the admin portal sidebar.
 * Super admin sees everything; others see a focused subset.
 */
export const ADMIN_SECTION_ACCESS: Record<AdminRole, readonly AdminSection[]> = {
  super_admin: [
    'overview',
    'users',
    'billing',
    'content',
    'flywheel',
    'costs',
    'system',
    'notifications',
    'team',
  ],
  content_editor: ['content', 'flywheel'],
  support_agent: ['users', 'billing'],
  finance_viewer: ['billing', 'costs'],
  infra_engineer: ['system', 'costs'],
  read_only: [
    'overview',
    'users',
    'billing',
    'content',
    'flywheel',
    'costs',
    'system',
    'notifications',
    'team',
  ],
} as const;

export type AdminSection =
  | 'overview'
  | 'users'
  | 'billing'
  | 'content'
  | 'flywheel'
  | 'costs'
  | 'system'
  | 'notifications'
  | 'team';

export function canAccessAdminSection(role: UserRole, section: AdminSection): boolean {
  if (!isAdminRole(role)) return false;
  return ADMIN_SECTION_ACCESS[role].includes(section);
}
