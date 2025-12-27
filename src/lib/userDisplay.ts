import type { User } from "@supabase/supabase-js";

export function getUserDisplayName(user: User | null | undefined, guestLabel: string) {
  if (!user) return guestLabel;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  const displayName = typeof meta.display_name === "string" ? meta.display_name.trim() : "";

  if (fullName) return fullName;
  if (displayName) return displayName;

  const email = user.email ?? "";
  if (email.includes("@")) return email.split("@")[0];

  return guestLabel;
}
