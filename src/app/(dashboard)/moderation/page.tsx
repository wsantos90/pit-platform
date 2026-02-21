'use client';

import { RoleGuard } from "@/components/layout/RoleGuard";

export default function ModerationPage() {
  return (
    <RoleGuard requiredRoles={["moderator", "admin"]}>
      <div>moderation</div>
    </RoleGuard>
  );
}

