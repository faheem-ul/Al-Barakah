"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Star } from "lucide-react";

import { cn } from "@/lib/utils";

import { AdminSidebarLink } from "./AdminSidebarItem";

const NAV_ITEMS = [
  { href: "/admin/sales", label: "Sales Dashboard", icon: LayoutDashboard },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
] as const;

type AdminNavProps = {
  className?: string;
  variant?: "header" | "sidebar";
  onNavigate?: () => void;
};

const AdminNav: React.FC<AdminNavProps> = ({
  className,
  variant = "header",
  onNavigate,
}) => {
  const pathname = usePathname();

  if (variant === "sidebar") {
    return (
      <nav className={cn("flex flex-col gap-1", className)}>
        {NAV_ITEMS.map((item) => (
          <AdminSidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname.startsWith(item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    );
  }

  return (
    <nav className={cn("flex flex-wrap gap-2", className)}>
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
              active
                ? "bg-black text-white"
                : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default AdminNav;
