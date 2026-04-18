import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { serverConfig } from '@/lib/config/server';
import type { UserRole } from './roles';

/**
 * Supabase client bound to the current request's cookies.
 * Use inside Server Components, Server Actions, and Route Handlers.
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    serverConfig.NEXT_PUBLIC_SUPABASE_URL,
    serverConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from Server Components; silently ignore.
            // The proxy and Route Handlers are the write path.
          }
        },
      },
    },
  );
}

export interface SessionUser {
  id: string; // users.id
  authId: string; // auth.users.id
  role: UserRole;
  displayName: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Resolve the current session into a SessionUser (joined users row) or null.
 */
export async function getSession(): Promise<SessionUser | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('id, auth_id, role, display_name, email, phone')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!profile) return null;
  return {
    id: profile.id,
    authId: profile.auth_id,
    role: profile.role,
    displayName: profile.display_name,
    email: profile.email,
    phone: profile.phone,
  };
}

/**
 * Return the current session or throw — use in Server Actions / Route Handlers
 * that must not run without an authenticated user.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHENTICATED');
  return session;
}
