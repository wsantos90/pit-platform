import { NextResponse } from "next/server";
import { hasAnyRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export type ModeratorAuthSuccess = {
  ok: true;
  user: {
    id: string;
    email: string | null;
  };
};

export type ModeratorAuthFailure = {
  ok: false;
  response: NextResponse;
};

type ModeratorAuthResult = ModeratorAuthSuccess | ModeratorAuthFailure;

export async function requireModeratorOrAdmin(): Promise<ModeratorAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: byId } = await supabase
    .from("users")
    .select("id,email,roles,is_active")
    .eq("id", user.id)
    .maybeSingle();

  let profile = byId;
  if (!profile && user.email) {
    const { data: byEmail } = await supabase
      .from("users")
      .select("id,email,roles,is_active")
      .eq("email", user.email)
      .maybeSingle();
    profile = byEmail;
  }

  const roles = (profile?.roles ?? []) as UserRole[];
  const isActive = profile?.is_active ?? true;

  if (!isActive || !hasAnyRole(roles, ["moderator", "admin"])) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  };
}
