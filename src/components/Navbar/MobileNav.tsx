import React from "react";
import Link from "next/link";
import Image from "next/image";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CloseIcon } from "@/ui/Icons";
import { NAV_ITEMS } from "@/lib/constants";

import logo from "@/public/logo.svg";
// import appStore from "@/public/icons/apple-store-outlined.svg";
// import playStore from "@/public/icons/play-store-outlined.svg";

interface PropTypes {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNav = (props: PropTypes) => {
  const { isOpen, onClose } = props;
  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="left"
        className="w-full p-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left duration-300 ease-out"
      >
        <SheetHeader className="mt-3 flex flex-row items-center justify-between">
          {/* <SheetTitle>Are you absolutely sure?</SheetTitle> */}
          <SheetTitle>
            <Link href={"/"}>
              <Image src={logo} alt="logo" className="w-[105px]" />
            </Link>
          </SheetTitle>

          <CloseIcon onClick={onClose} />

          <SheetDescription className="sr-only">navbar menu</SheetDescription>
        </SheetHeader>

        <div className="flex h-[86vh] flex-col justify-between pt-[30px]">
          <div className="flex flex-col gap-8 px-5">
            {NAV_ITEMS.map((item) => (
              <Link
                href={item.path}
                key={item.title}
                className="text-foreground text-[24px] leading-6 font-semibold"
                onClick={onClose}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
