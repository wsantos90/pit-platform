'use client';

import { RoleGuard } from "@/components/layout/RoleGuard";

export default function AdminPage() {
  return (
    <RoleGuard requiredRoles={["admin"]}>
      <div>admin</div>
    </RoleGuard>
  );
}

