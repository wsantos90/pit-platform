import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnyRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

const reviewSchema = z
  .object({
    claimId: z.string().uuid("claimId deve ser UUID válido"),
    action: z.enum(["approve", "reject"]),
    rejectionReason: z.string().trim().min(10, "Motivo deve ter ao menos 10 caracteres").optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "reject" && !value.rejectionReason) {
      context.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "rejectionReason é obrigatório ao rejeitar uma claim",
      });
    }
  });

type ReviewAction = z.infer<typeof reviewSchema>["action"];

function mapReviewRpcError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("claim_not_found")) {
    return { status: 404, body: { code: "claim_not_found", error: "Claim não encontrada." } };
  }
  if (normalized.includes("claim_not_pending")) {
    return {
      status: 409,
      body: {
        code: "claim_not_pending",
        error: "A claim não está mais pendente para revisão.",
      },
    };
  }
  return {
    status: 500,
    body: {
      code: "review_failed",
      error: "Não foi possível concluir a revisão da claim.",
    },
  };
}

async function loadCurrentUserRoles(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: byId } = await supabase
    .from("users")
    .select("roles, is_active, email")
    .eq("id", userId)
    .maybeSingle();

  return {
    roles: (byId?.roles ?? []) as UserRole[],
    isActive: byId?.is_active ?? true,
  };
}

async function notifyClaimant(
  adminClient: ReturnType<typeof createAdminClient>,
  action: ReviewAction,
  claimId: string,
  payload: Record<string, unknown>,
  rejectionReason?: string
) {
  const userId = payload.user_id as string | undefined;
  if (!userId) return;

  if (action === "approve") {
    const clubName = (payload.club_name as string | undefined) ?? "seu time";
    await adminClient.from("notifications").insert({
      user_id: userId,
      type: "claim_approved",
      title: "Reivindicação aprovada",
      message: `Sua reivindicação do time ${clubName} foi aprovada.`,
      data: {
        claim_id: claimId,
        club_id: (payload.club_id as string | undefined) ?? null,
      },
    });
    return;
  }

  const reasonSuffix = rejectionReason ? ` Motivo: ${rejectionReason}` : "";
  await adminClient.from("notifications").insert({
    user_id: userId,
    type: "claim_rejected",
    title: "Reivindicação rejeitada",
    message: `Sua reivindicação foi rejeitada.${reasonSuffix}`,
    data: {
      claim_id: claimId,
      discovered_club_id: (payload.discovered_club_id as string | undefined) ?? null,
      rejection_reason: rejectionReason ?? null,
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await loadCurrentUserRoles(supabase, user.id);
  if (!profile.isActive || !hasAnyRole(profile.roles, ["moderator", "admin"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { claimId, action, rejectionReason } = parsed.data;

  const rpcName = action === "approve" ? "fn_approve_claim" : "fn_reject_claim";
  const rpcArgs =
    action === "approve"
      ? {
          p_claim_id: claimId,
          p_reviewer_id: user.id,
        }
      : {
          p_claim_id: claimId,
          p_reviewer_id: user.id,
          p_rejection_reason: rejectionReason,
        };

  const { data, error } = await adminClient.rpc(rpcName, rpcArgs);
  if (error) {
    const mappedError = mapReviewRpcError(error.message);
    return NextResponse.json(mappedError.body, { status: mappedError.status });
  }

  await notifyClaimant(
    adminClient,
    action,
    claimId,
    (data as Record<string, unknown> | null) ?? {},
    rejectionReason
  );

  const successMessage =
    action === "approve" ? "Claim aprovada com sucesso." : "Claim rejeitada com sucesso.";

  return NextResponse.json({
    success: true,
    clubId: (data as { club_id?: string } | null)?.club_id ?? null,
    message: successMessage,
  });
}
