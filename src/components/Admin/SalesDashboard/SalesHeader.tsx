"use client";

import React from "react";
import Image from "next/image";

import Text from "@/components/ui/Text";
import { Button } from "@/components/ui/button";
import { BurgerMenuIcon } from "@/ui/Icons";
import logo from "@/public/logo.png";

type SalesHeaderProps = {
  email?: string | null;
  onOpenMenu: () => void;
  onLogout: () => void;
};

const SalesHeader: React.FC<SalesHeaderProps> = ({
  email,
  onOpenMenu,
  onLogout,
}) => (
  <>
    <header className="md:hidden bg-white border-b border-black/10 shrink-0 z-10">
      <div className="px-4 py-4 flex items-center justify-between gap-3">
        <Image src={logo} alt="Albaraka Honey" className="w-[90px] shrink-0" />
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          className="shrink-0 p-1 cursor-pointer"
        >
          <BurgerMenuIcon />
        </button>
      </div>
    </header>

    <header className="hidden md:block bg-white border-b border-black/10 shrink-0 z-10">
      <div className="w-full px-8 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Text className="text-[20px] font-semibold text-black">
            Sales Dashboard
          </Text>
          <Text className="text-[13px] text-[#6B6B6B] truncate">
            {email || "Admin"}
          </Text>
        </div>
        <Button
          type="button"
          onClick={onLogout}
          className="rounded-md bg-black text-white text-[14px] px-4 py-2 hover:opacity-90 shrink-0"
        >
          Logout
        </Button>
      </div>
    </header>
  </>
);

export default SalesHeader;
