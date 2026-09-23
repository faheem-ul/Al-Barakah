"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      richColors
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-black group-[.toaster]:border-black/10 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[#6B6B6B]",
          actionButton:
            "group-[.toast]:bg-black group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#F7F7F7] group-[.toast]:text-black",
        },
      }}
      style={{ zIndex: 99999 }}
      {...props}
    />
  );
};

export { Toaster };
