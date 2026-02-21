import type { UserRole } from "@/types";

export function hasRole(roles: string[], required: string) {
  return roles.includes(required);
}

export function hasAnyRole(roles: string[], requiredRoles: UserRole[]) {
  return requiredRoles.some((requiredRole) => hasRole(roles, requiredRole));
}

