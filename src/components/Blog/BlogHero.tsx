import React from "react";
import Image from "next/image";

type Props = {
  title: string;
  subtitle?: string;
};

export default function BlogHero({ title, subtitle }: Props) {
  return (
    <section className="relative flex min-h-[420px] items-center mt-[-180px] md:min-h-[520px]">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/contactus/banner.png"
          alt="Honeycomb Background"
          fill
          className="min-h-[420px] rounded-b-[40px] object-cover md:min-h-[520px]"
          priority
        />
        <div className="absolute inset-0 rounded-b-[40px] bg-black/10" />
      </div>

      <div className="relative z-10 mx-auto mt-16 w-full max-w-[1117px] px-6 text-center">
        <h1 className="text-[32px] font-bold leading-tight text-white md:text-[52px] md:leading-[1.15]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mx-auto mt-4 max-w-2xl text-[16px] font-light text-white/95 md:text-[18px]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
