import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { serverConfig } from '@/lib/config/server';
import type { UserRole } from './roles';

/**
 * Proxy-bound Supabase client. Refreshes the auth cookie on every request
 * and reads the users.role via a single joined query.
 *
 * Returns:
 *   - authId: Supabase auth user id, or null if not signed in
 *   - role: users.role, or null if the profile row is missing
 *   - userId: users.id (joined profile), or null if profile row is missing
 *
 * The caller MUST use the mutated `response` as the final response
 * (so refreshed cookies are forwarded to the browser).
 */
export async function readProxySession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ authId: string | null; role: UserRole | null; userId: string | null }> {
  const supabase = createServerClient(
    serverConfig.NEXT_PUBLIC_SUPABASE_URL,
    serverConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
          toSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authId: null, role: null, userId: null };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .maybeSingle();

  return {
    authId: user.id,
    role: (profile?.role as UserRole) ?? null,
    userId: profile?.id ?? null,
  };
}
