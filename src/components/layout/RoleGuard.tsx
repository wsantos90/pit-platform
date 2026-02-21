'use client';

import { type ComponentType, type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { hasAnyRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  requiredRoles: UserRole[];
  children: ReactNode;
  fallbackPath?: string;
  loadingFallback?: ReactNode;
}

export function RoleGuard({
  requiredRoles,
  children,
  fallbackPath = "/unauthorized",
  loadingFallback,
}: RoleGuardProps) {
  const router = useRouter();
  const { roles, loading } = useRole();
  const allowed = hasAnyRole(roles, requiredRoles);

  useEffect(() => {
    if (!loading && !allowed) {
      router.replace(fallbackPath);
    }
  }, [allowed, fallbackPath, loading, router]);

  if (loading) {
    return <>{loadingFallback ?? <div>Carregando permissões...</div>}</>;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}

export function withRoleGuard<P extends object>(
  WrappedComponent: ComponentType<P>,
  requiredRoles: UserRole[],
  fallbackPath = "/unauthorized",
) {
  function GuardedComponent(props: P) {
    return (
      <RoleGuard requiredRoles={requiredRoles} fallbackPath={fallbackPath}>
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  }

  GuardedComponent.displayName = `withRoleGuard(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;
  return GuardedComponent;
}

