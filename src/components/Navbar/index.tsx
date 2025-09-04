"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";

import { BurgerMenuIcon, CartIcon } from "@/ui/Icons";
import useDisclosure from "@/hooks/useDisclosure";
import { NAV_ITEMS } from "@/lib/constants";
import useShoppingCart from "@/hooks/useShoppingCart";
import { cn } from "@/lib/utils";
import CartDrawer from "@/ui/CartDrawer";

import Cart from "@/components/Cart";

import logo from "@/public/logo.png";

import MobileNav from "./MobileNav";

const Navbar = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { cartItemCount, onCartOpen, onCartClose, isCartOpen } =
    useShoppingCart();

  return (
    <nav className="relative z-10 mx-auto max-w-[1117px] py-[22px] sm:pt-10 sm:pb-[53px] px-4">
      <div className=" bg-[#F2EEE6] flex w-full items-center justify-between rounded-[40px] px-5 md:py-0 py-5 sm:h-[78px] sm:px-8">
        <Link href="/">
          <Image src={logo} alt="logo" className="w-[105px]" />
        </Link>

        <div className=" nav-items flex items-center gap-9 md:pr-5">
          {NAV_ITEMS.map((item) => (
            <Link
              href={item.path}
              key={item.title}
              className={cn(
                "text-foreground text-[16px] leading-6 font-semibold hidden sm:block",
                item.title === "Merch" && "font-bold"
              )}
            >
              {item.title}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-7">
          <button onClick={onCartOpen} className="relative cursor-pointer">
            <span className="bg-foreground absolute top-[-5px] right-[-5px] flex h-[15px] w-[15px] items-center justify-center rounded-full text-[10px] font-normal text-white">
              {cartItemCount}
            </span>

            <CartIcon />
          </button>

          {/* <Link href="/profile">
            <ProfileIcon />
          </Link> */}

          <BurgerMenuIcon className="block sm:hidden" onClick={onOpen} />
        </div>
      </div>

      <MobileNav isOpen={isOpen} onClose={onClose} />

      <CartDrawer isOpen={isCartOpen} onClose={onCartClose}>
        <Cart onCartClose={onCartClose} />
      </CartDrawer>
    </nav>
  );
};

export default Navbar;
