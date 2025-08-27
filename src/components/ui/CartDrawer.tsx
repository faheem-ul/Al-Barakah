import React from "react";
import { SVGProps } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/ui/drawer";
import Text from "@/ui/Text";
import useMediaQuery from "@/hooks/useMedia";
import { useCartStore } from "@/stores/useCartStore";

interface PropTypes {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const CartDrawer = (props: PropTypes) => {
  const { isOpen, onClose, children } = props;

  const isMobile = useMediaQuery("(max-width: 768px)");
  const cartItems = useCartStore((state) => state.cartItems);

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={isOpen}
      onClose={onClose}
    >
      <DrawerContent className="no-scrollbar md:rounded-b-0 w-full !max-w-[605px] items-start overflow-x-hidden overflow-y-scroll bg-[#FAFAFA] px-6 md:!max-h-screen md:rounded-l-[20px] md:py-[32px]">
        {/* Screen Reader Only */}
        <DrawerHeader className="sr-only">
          <DrawerTitle>Are you absolutely sure?</DrawerTitle>
          <DrawerDescription>This action cannot be undone.</DrawerDescription>
        </DrawerHeader>
        {/* Screen Reader Only */}

        <div className="flex w-full items-start justify-between border-b pb-4">
          <div>
            <Text className="text-[28px] leading-7 font-semibold text-[#302A25]">
              Shopping Cart
            </Text>

            {cartItems?.length > 0 && (
              <Text className="text-caption mt-3 text-[16px] font-medium">
                Items in your bag not reserved - check out now to make them
                yours.
              </Text>
            )}
          </div>

          <button
            onClick={onClose}
            className="sticky top-0 w-fit cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        {isMobile ? (
          <div className="h-full w-full">{children}</div>
        ) : (
          <div className="!mb-0 flex h-full w-full items-start justify-center md:mb-10">
            {" "}
            {children}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default CartDrawer;

const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={40}
    height={40}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="m15.834 15.833 8.333 8.334M15.833 24.167l8.333-8.334"
      stroke="#292D32"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      opacity={0.12}
      x={1}
      y={1}
      width={38}
      height={38}
      rx={9}
      stroke="#292D32"
      strokeWidth={2}
    />
  </svg>
);
