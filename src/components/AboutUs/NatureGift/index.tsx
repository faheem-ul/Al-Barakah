import React from "react";
import Image from "next/image";

import Text from "@/components/ui/Text";
const NatureGift = () => {
  return (
    <section className=" pt-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex md:flex-nowrap flex-wrap gap-8 items-center">
          {/* Left Column - Text & Features */}
          <div className="space-y-5 max-w-[550px]">
            <div className="bg-black md:w-[397px] w-full h-[33px] flex justify-between items-center rounded-full">
              <Text className="text-[18px] text-white font-light text-center mx-auto">
                {`We're`} more than just beekeepers
              </Text>
            </div>
            <div>
              <Text className="md:text-[40px] text-[30px] font-bold text-black mb-5 md:leading-[50px] leading-[35px] capitalize">
                {`Nature’s`} Gift, Preserved for You
              </Text>
              <Text className="text-[18px] text-black font-light leading-[25px]">
                At Al Baraka Honey, we don’t just bottle honey — we preserve the
                richness of nature. Every jar is filled with raw, unprocessed
                honey that retains all the natural enzymes, antioxidants, and
                nutrients your body deserves. From hive to home, our honey is
                handled with care to ensure purity and freshness in every drop.
              </Text>
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative">
            <Image
              src="/images/nature-gift.png"
              alt="Beekeeper with honey"
              width={581}
              height={380}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default NatureGift;
