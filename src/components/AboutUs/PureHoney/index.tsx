import React from "react";
import Image from "next/image";
import Link from "next/link";

import Text from "@/components/ui/Text";
import { Button } from "@/components/ui/button";

import bannerbg from "@/public/images/contact-us bg.svg";

const PureHoney = () => {
  return (
    <section className="py-14 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={bannerbg}
              alt="Honey pour background"
              fill
              className="object-cover rounded-[40px] -z-10"
            />
            <div className="absolute inset-0.5 bg-black/30 z-10 rounded-[40px]" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-center md:justify-between p-8 md:p-12 text-white">
            <div className="text-center md:text-left mb-6 md:mb-0">
              <Text className="md:text-[32px] text-[30px] font-bold mb-2 leading-[35px] md:leading-[40px] max-w-[798px]">
                Pure Honey, Crafted by Nature, Shared with Love
              </Text>
              <Text className="w-full max-w-[798px]">
                At Al Baraka Honey, we believe honey should be just as nature
                intended — raw, pure, and full of life. Every jar is a
                reflection of our dedication to authenticity, sustainability,
                and care for the bees that make it possible. By choosing us,
                {`you’re`} not just enjoying honey, {`you’re`} supporting
                healthier
              </Text>
            </div>

            <div className="flex-shrink-0">
              <Link href="/">
                <Button className="bg-white text-black text-[18px] rounded-[30px] font-semibold py-4 px-8  hover:bg-gray-100 transition-colors cursor-pointer ">
                  Order Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PureHoney;
