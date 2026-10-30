"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { DeliveryTruckIcon } from "@/components/ui/Icons";

import Text from "../ui/Text";
import { cn } from "@/lib/utils";
import { shouldShowFreeDeliveryBar } from "@/lib/show-free-delivery-bar";

const TopBar = () => {
  const pathname = usePathname();
  const show = shouldShowFreeDeliveryBar(pathname);

  return (
    <div className={cn("w-full", show ? "block" : "hidden")}>
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
