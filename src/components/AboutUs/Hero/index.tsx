import React from "react";
import Image from "next/image";

import Text from "@/components/ui/Text";

const AboutHero = () => {
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
      <div className="w-full relative z-10 max-w-[1117px] mx-auto px-6 text-left mt-[100px] md:mt-16">
        <Text className="md:text-[60px] text-[40px]  font-bold mb-2 text-white w-full text-center">
          About us
        </Text>
        <p className="text-[18px] font-light capitalize leading-relaxed text-white max-w-[661px] text-center mx-auto">
          At Al Baraka Honey, we believe that nature’s sweetest gift should be
          enjoyed in its purest form. That’s why we bring you 100% natural, raw,
          and authentic honey, harvested responsibly from trusted hives and
          carefully packed to preserve all its natural goodness.
        </p>
      </div>
    </section>
  );
};

export default AboutHero;
