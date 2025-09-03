import React from "react";
import Image from "next/image";

const PrivacyHero = () => {
  return (
    <section className="relative min-h-[735px] flex items-center mt-[-180px]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/contactus/banner.png"
          alt="Honeycomb Background"
          fill
          className="object-cover rounded-b-[40px] min-h-[735px]"
          priority
        />
        <div className="absolute inset-0 bg-black/10 rounded-b-[40px]" />
      </div>

      {/* Content */}
      <div className="w-full relative z-10 max-w-[1117px] mx-auto px-6 text-left mt-16">
        <h1 className="text-[60px] font-bold mb-2 text-white w-full text-center">
          Privacy Policy
        </h1>
      </div>
    </section>
  );
};

export default PrivacyHero;
