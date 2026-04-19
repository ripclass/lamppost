import 'server-only';
import { NextResponse } from 'next/server';
import { getSession, type SessionUser } from './server';
import { ADMIN_ROLES, type AdminRole, type UserRole } from './roles';

/**
 * Admin-role access hierarchy. `super_admin` sits at the top; `read_only` is
 * deliberately below the writing roles even though it has sidebar access to
 * every section — writes (generation, refunds, etc.) require a role above
 * read_only.
 *
 * Note: the existing role model in `lib/auth/roles.ts` is section-scoped, not
 * strictly hierarchical — `ADMIN_SECTION_ACCESS` maps each role to which
 * sidebar sections it can see. This hierarchy is a synthetic gate for API
 * routes whose permission boundary happens to line up with "content-editing
 * or higher." For endpoints with non-content permission shapes, prefer
 * section-scoped gating via `canAccessAdminSection` instead.
 */
const ADMIN_ROLE_LEVEL: Record<AdminRole, number> = {
  super_admin: 100,
  content_editor: 50,
  support_agent: 40,
  finance_viewer: 30,
  infra_engineer: 30,
  read_only: 10,
};

export type AdminGuardResult =
  | { ok: true; session: SessionUser & { role: AdminRole } }
  | { ok: false; response: NextResponse };

/**
 * Require the caller to be signed in with an admin role at or above `minRole`.
 *
 * Usage in Route Handlers:
 *
 *   const guard = await requireAdminRole('content_editor');
 *   if (!guard.ok) return guard.response;
 *
 * Returns a 403 NextResponse rather than throwing so callers don't have to
 * wrap in try/catch just to handle the forbidden branch.
 */
export async function requireAdminRole(minRole: AdminRole): Promise<AdminGuardResult> {
  const session = await getSession();
  if (!session) return forbidden('Admin access required');
  if (!isAdminRole(session.role)) return forbidden('Admin access required');
  if (ADMIN_ROLE_LEVEL[session.role] < ADMIN_ROLE_LEVEL[minRole]) {
    return forbidden(`Requires ${minRole} or higher`);
  }
  return { ok: true, session: session as SessionUser & { role: AdminRole } };
}

function forbidden(error: string): AdminGuardResult {
  return {
    ok: false,
    response: NextResponse.json(
      { success: false as const, code: 'FORBIDDEN', error },
      { status: 403 },
    ),
  };
}

function isAdminRole(role: UserRole): role is AdminRole {
  return (ADMIN_ROLES as readonly UserRole[]).includes(role);
}
