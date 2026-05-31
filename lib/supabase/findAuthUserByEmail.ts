import type { User } from "@supabase/supabase-js";

/**
 * `auth.admin.listUsers()` return types can infer `users` elements as `never`,
 * which breaks property access on each user. Normalize to `User[]` for lookups.
 */
export function findAuthUserByEmail(
  listUsersData: { users?: unknown } | null | undefined,
  email: string
): User | undefined {
  const raw = listUsersData?.users;
  const users: User[] = Array.isArray(raw) ? (raw as User[]) : [];
  const target = email.toLowerCase();
  return users.find((u) => (u.email ?? "").toLowerCase() === target);
}
