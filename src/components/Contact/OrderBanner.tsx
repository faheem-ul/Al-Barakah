import React from "react";
import Image from "next/image";

import Text from "../ui/Text";
import { Button } from "../ui/button";

import bannerbg from "@/public/images/contact-us bg.svg";

const OrderBanner = () => {
  return (
    <section className="pt-14 md:mb-[77px] py-14 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={bannerbg}
              alt="Honey pour background"
              fill
              className="object-cover rounded-[40px] "
            />
            <div className="absolute inset-0.5 bg-black/30 rounded-[40px] z-10" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 text-white">
            <div className="text-center md:text-left mb-6 md:mb-0">
              <Text className="md:text-[40px] text-[30px] leading-[40px] font-bold mb-2 md:leading-[50px] max-w-[748px]">
                From Our Company To Your Home. Order Online For Delivery Or
                Pick-Up
              </Text>
            </div>

            <div className="flex-shrink-0">
              <Button className="bg-white text-black text-[18px] rounded-[30px] font-semibold py-4 px-8  hover:bg-gray-100 transition-colors cursor-pointer ">
                Order Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrderBanner;
