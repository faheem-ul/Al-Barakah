"use client";

import React from "react";
import { usePathname } from "next/navigation";

import Text from "../ui/Text";
import { cn } from "@/lib/utils";

const TopBar = () => {
  const pathname = usePathname();

  const isProductRoute =
    pathname !== "/" &&
    pathname !== "/about-us" &&
    pathname !== "/contact-us" &&
    pathname !== "/cart" &&
    pathname !== "/privacy-policy" &&
    pathname !== "/terms-and-conditions";

  return (
    <div className={cn("w-full hidden", isProductRoute && "block")}>
      <div className="bg-black px-1 py-2 flex justify-center items-center">
        <Text className="text-white text-center text-[11px] md:text-[13px] uppercase font-normal">
          Free Home Delivery is applied to orders above Rs. 3000
        </Text>
      </div>
    </div>
  );
};

export default TopBar;
