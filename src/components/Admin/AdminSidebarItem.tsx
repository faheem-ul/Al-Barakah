"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function sidebarItemClass(active: boolean) {
  return cn(
    "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors cursor-pointer",
    active ? "bg-black text-white" : "text-black hover:bg-black/5",
  );
}

type AdminSidebarLinkProps = {
  href: string;
  label: React.ReactNode;
  icon: LucideIcon;
  active?: boolean;
  onNavigate?: () => void;
};

export const AdminSidebarLink: React.FC<AdminSidebarLinkProps> = ({
  href,
  label,
  icon: Icon,
  active = false,
  onNavigate,
}) => (
  <Link
    href={href}
    onClick={onNavigate}
    className={sidebarItemClass(active)}
  >
    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
    <span className="min-w-0">{label}</span>
  </Link>
);

type AdminSidebarButtonProps = {
  label: React.ReactNode;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
};

export const AdminSidebarButton: React.FC<AdminSidebarButtonProps> = ({
  label,
  icon: Icon,
  active = false,
  onClick,
}) => (
  <button type="button" onClick={onClick} className={sidebarItemClass(active)}>
    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
    <span className="min-w-0 text-left">{label}</span>
  </button>
);

export { sidebarItemClass };
