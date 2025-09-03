import React from "react";
import Image from "next/image";

const ContactHero = () => {
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
        <h1 className="md:text-[60px] text-[40px] md:leading-[80px] leading-[45px] font-bold mb-2 text-white w-full">
          Contact Us
        </h1>
        <p className="text-[18px] font-light capitalize leading-relaxed text-white max-w-[661px]">
          At Al Baraka Honey, we bring you pure and natural honey harvested from
          trusted hives. From Apis mellifera and Apis florea wild honey to the
          rare Berry Bee Honey, every jar is filled with nature’s goodness.
        </p>
      </div>
    </section>
  );
};

export default ContactHero;
