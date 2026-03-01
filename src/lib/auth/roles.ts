import type { UserRole } from "@/types";

export function normalizeRoles(roles: unknown): string[] {
  if (Array.isArray(roles)) {
    return roles.filter((role): role is string => typeof role === "string");
  }

  if (typeof roles === "string") {
    return roles
      .replace(/^\{/, "")
      .replace(/\}$/, "")
      .split(",")
      .map((role) => role.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  }

  return [];
}

export function hasRole(roles: unknown, required: string) {
  return normalizeRoles(roles).includes(required);
}

export function hasAnyRole(roles: unknown, requiredRoles: UserRole[]) {
  const normalizedRoles = normalizeRoles(roles);
  return requiredRoles.some((requiredRole) => normalizedRoles.includes(requiredRole));
}

