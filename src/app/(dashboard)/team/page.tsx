'use client';

import { RoleGuard } from "@/components/layout/RoleGuard";

export default function TeamPage() {
  return (
    <RoleGuard requiredRoles={["manager", "moderator", "admin"]}>
      <div>team</div>
    </RoleGuard>
  );
}

