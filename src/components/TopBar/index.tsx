"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { DeliveryTruckIcon } from "@/components/ui/Icons";

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
    pathname !== "/terms-and-conditions" &&
    pathname !== "/refund-policy" &&
    pathname !== "/ownership-statement";

  return (
    <div className={cn("w-full hidden", isProductRoute && "block")}>
      <div className="bg-black px-1 py-2 flex justify-center items-center gap-1.5">
        <Text className="text-white text-center text-[11px] md:text-[13px] uppercase font-normal">
          Free Delivery All Over Pakistan
        </Text>
        <DeliveryTruckIcon className="text-white size-4 shrink-0" />
      </div>
    </div>
  );
};

export default TopBar;
