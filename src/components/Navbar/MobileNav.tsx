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
import { CloseIcon, Logo } from "@/ui/Icons";
import { NAV_ITEMS } from "@/lib/constants";

import instagram from "@/public/icons/social/instagram.svg";
import facebook from "@/public/icons/social/facebook.svg";
import youtube from "@/public/icons/social/youtube.svg";
import dot from "@/public/icons/social/dot.svg";
import appStore from "@/public/icons/apple-store-outlined.svg";
import playStore from "@/public/icons/play-store-outlined.svg";

interface PropTypes {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNav = (props: PropTypes) => {
  const { isOpen, onClose } = props;
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-full">
        <SheetHeader className="mt-3 flex flex-row items-center justify-between">
          {/* <SheetTitle>Are you absolutely sure?</SheetTitle> */}
          <SheetTitle>
            <Link href={"/"}>
              <Logo />
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
              >
                {item.title}
              </Link>
            ))}
          </div>

          <div>
            <hr className="mb-[32px]" />
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://www.instagram.com/grounds_app/"
                className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]"
              >
                <Image
                  src={instagram}
                  alt="instagram"
                  className="h-[25px] w-[25px] md:h-[30px] md:w-[35px]"
                />
              </a>
              <span className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]">
                <Image
                  src={dot}
                  alt="dot"
                  className="h-auto w-[6px] md:w-[8px]"
                />
              </span>
              <a
                href="https://www.facebook.com/profile.php?id=61551930973017"
                className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]"
              >
                <Image
                  src={facebook}
                  alt="facebook"
                  className="h-[25px] w-[25px] md:h-[30px] md:w-[35px]"
                />
              </a>
              <span className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]">
                <Image
                  src={dot}
                  alt="dot"
                  className="h-auto w-[6px] md:w-[8px]"
                />
              </span>
              <a
                href="https://www.youtube.com/@grounds_app"
                className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]"
              >
                <Image
                  src={youtube}
                  alt="youtube"
                  className="h-[30px] w-[30px] md:h-[35px] md:w-[35px]"
                />
              </a>
            </div>

            <div className="mt-8 mb-8 flex justify-center gap-4">
              <Image src={appStore} alt="app-store" />
              <Image src={playStore} alt="app-store" />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
