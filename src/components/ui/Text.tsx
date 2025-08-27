import React, { forwardRef } from "react";

import { cn } from "@/lib/utils";

type ComponentAs = "h1" | "h2" | "error";

interface Props {
  children: React.ReactNode;
  className?: string;
  as?: ComponentAs;
  onClick?: () => void;
}

const Text = forwardRef<HTMLHeadingElement | HTMLParagraphElement, Props>(
  (props, ref) => {
    const { children, className, as, onClick } = props;

    if (as === "h1") {
      return (
        <h1
          ref={ref}
          className={cn(
            "font-poppins text-foreground text-[24px] leading-[30px] font-bold sm:text-[48px] md:text-[40px] md:leading-[60px]",
            className,
          )}
          onClick={onClick}
        >
          {children}
        </h1>
      );
    }

    if (as === "h2") {
      return (
        <h2
          ref={ref}
          className={cn(
            "font-poppins text-[28px] leading-[36px] font-semibold",
            className,
          )}
          onClick={onClick}
        >
          {children}
        </h2>
      );
    }

    // if (as === "error") {
    //   return (
    //     <span
    //       ref={ref}
    //       className={cn(
    //         "mt-1 flex items-center gap-1 font-poppins text-[12px] font-normal leading-[18px] text-[#FF5828]",
    //         className,
    //       )}
    //       onClick={onClick}
    //     >
    //       <ErrorIcon />
    //       {children}
    //     </span>
    //   );
    // }

    return (
      <p
        ref={ref}
        className={cn(
          "font-poppins text-caption text-[16px] leading-6 font-normal",
          className,
        )}
        onClick={onClick}
      >
        {children}
      </p>
    );
  },
);

Text.displayName = "Text";

export default Text;
