import {
  BarChart3,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Shield,
  User,
  Volleyball,
} from "lucide-react";

export type ProfileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Meu Perfil", icon: User },
  { href: "/profile/matches", label: "Partidas", icon: Volleyball },
  { href: "/profile#performance-overview", label: "Estatisticas", icon: BarChart3 },
  { href: "/profile#club-context", label: "Clubes", icon: Shield },
  { href: "/profile/settings", label: "Configuracoes", icon: Settings },
];

export function getProfilePageMeta(pathname: string) {
  if (pathname.startsWith("/profile/matches")) {
    return {
      eyebrow: "Performance Intelligence Tracking",
      title: "Partidas do Atleta",
    };
  }

  if (pathname.startsWith("/profile/settings")) {
    return {
      eyebrow: "Performance Intelligence Tracking",
      title: "Configuracoes do Perfil",
    };
  }

  return {
    eyebrow: "Performance Intelligence Tracking",
    title: "Perfil do Atleta",
  };
}

export function isProfileNavItemActive(item: ProfileNavItem, pathname: string) {
  if (item.href.includes("#")) {
    return false;
  }

  if (item.href === "/profile") {
    return pathname === "/profile";
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
