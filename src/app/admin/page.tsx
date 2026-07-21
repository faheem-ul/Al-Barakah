"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/reviews");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
      <p className="text-[14px] text-[#6B6B6B] font-poppins">Redirecting...</p>
    </div>
  );
}
