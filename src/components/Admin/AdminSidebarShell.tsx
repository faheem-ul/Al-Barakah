"use client";

import React from "react";
import Image from "next/image";

import logo from "@/public/logo.png";

type AdminSidebarShellProps = {
  children: React.ReactNode;
};

const AdminSidebarShell: React.FC<AdminSidebarShellProps> = ({ children }) => (
  <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-black/10 bg-white h-full">
    <div className="px-4 py-5 border-b border-black/10 shrink-0">
      <Image src={logo} alt="Albaraka Honey" className="w-[105px]" />
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-light px-3 py-4">
      {children}
    </div>
  </aside>
);

export default AdminSidebarShell;
