"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  AdminAuthProvider,
  useAdminAuth,
} from "@/components/Admin/AdminAuthProvider";
import Spinner from "@/components/ui/Spinner";

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (loading) return;
    if (!user && !isLogin) {
      router.replace("/admin/login");
    } else if (user && isLogin) {
      router.replace("/admin/reviews");
    }
  }, [user, loading, isLogin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] overflow-y-scroll">
        <Spinner fill="#000000" />
      </div>
    );
  }

  if (!user && !isLogin) return null;
  if (user && isLogin) return null;

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminGate>{children}</AdminGate>
    </AdminAuthProvider>
  );
}
