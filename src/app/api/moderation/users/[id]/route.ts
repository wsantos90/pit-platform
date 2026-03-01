import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasRole, normalizeRoles } from "@/lib/auth/roles";
import { requireModeratorOrAdmin } from "../../_auth";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateSchema = z.object({
  is_active: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "invalid_user_id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = updateSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const targetUserId = parsedParams.data.id;
  const adminClient = createAdminClient();

  const { data: targetUser, error: targetError } = await adminClient
    .from("users")
    .select("id,email,display_name,roles,is_active,created_at")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: "failed_to_load_target_user" }, { status: 500 });
  }
  if (!targetUser) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  if (!parsedBody.data.is_active && hasRole(targetUser.roles, "admin")) {
    return NextResponse.json(
      {
        error: "cannot_deactivate_admin",
      },
      { status: 403 }
    );
  }

  const { data: updatedUser, error: updateError } = await adminClient
    .from("users")
    .update({ is_active: parsedBody.data.is_active })
    .eq("id", targetUserId)
    .select("id,email,display_name,roles,is_active,created_at")
    .single();

  if (updateError || !updatedUser) {
    return NextResponse.json({ error: "failed_to_update_user" }, { status: 500 });
  }

  return NextResponse.json({
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      display_name: updatedUser.display_name,
      roles: normalizeRoles(updatedUser.roles),
      is_active: updatedUser.is_active,
      created_at: updatedUser.created_at,
    },
    actor_user_id: auth.user.id,
  });
}
