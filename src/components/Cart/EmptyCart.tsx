import React, { SVGProps } from "react";
import Link from "next/link";

import Text from "@/ui/Text";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

interface PropTypes {
  className?: string;
  onCartClose?: () => void;
}

const EmptyCart = (props: PropTypes) => {
  const { className, onCartClose } = props;
  return (
    <div
      className={cn(
        "-mt-[100px] flex min-h-screen w-full flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <Icon />

      <Text as="h1" className="mt-2 text-[24px] font-semibold md:text-[28px]">
        Your Cart is Empty{" "}
      </Text>

      <Text className="mb-2 text-center text-[14px] leading-6 font-normal text-[#272728] md:text-[18px]">
        Looks like you haven’t added anything yet—let’s fix that!
      </Text>

      <Link href="/">
        <Button
          className="px-6 text-[14px] font-medium uppercase"
          onClick={() => {
            onCartClose?.();
          }}
        >
          <BagIcon /> Shop Now
        </Button>
      </Link>
    </div>
  );
};

export default EmptyCart;

const Icon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={60}
    height={60}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width={60} height={60} rx={16} fill="#F2EEE6" />
    <path
      d="m28.667 25.333 4 4m0-4-4 4m-9.72-8.133h20.285c1.837 0 3.164 1.693 2.66 3.397l-2.205 7.467C39.347 33.211 38.26 34 37.027 34H24.816c-1.236 0-2.323-.79-2.661-1.936L18.947 21.2Zm0 0L18 18m18 24a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-10.667 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
      stroke="#000"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BagIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={17}
    height={20}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M15.5 5h-3V4a4 4 0 1 0-8 0v1h-3a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V6a1 1 0 0 0-1-1Zm-9-1a2 2 0 1 1 4 0v1h-4V4Zm8 13a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V7h2v1a1 1 0 0 0 2 0V7h4v1a1 1 0 0 0 2 0V7h2v10Z"
      fill="#FCFCFC"
    />
  </svg>
);
