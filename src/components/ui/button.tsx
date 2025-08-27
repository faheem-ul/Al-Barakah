import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import Spinner from "@/ui/Spinner";

const buttonVariants = cva(
  "cursor-pointer transition-all duration-300 flex items-center gap-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary-foreground text-white shadow-xs hover:opacity-80 rounded-[30px] ",
        secondary:
          "bg-accent text-white shadow-xs hover:opacity-80 rounded-[30px] ",
        link: "text-primary underline-offset-4 hover:underline",
        icon: "h-[40px] w-[40px] rounded-full bg-white flex items-center justify-center",
      },
      size: {
        default: "px-5 py-[17px] ",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  fill?: string;
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading,
  fill,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {isLoading ? <Spinner fill={fill} /> : children}
    </Comp>
  );
}

export { Button, buttonVariants };
