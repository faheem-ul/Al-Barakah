import React from "react";
import Image from "next/image";
import Text from "../ui/Text";
import { Button } from "../ui/button";

const OrderBanner = () => {
  return (
    <section className="py-14 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/images/contactus/mask.png"
              alt="Honey pour background"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 text-white">
            <div className="text-center md:text-left mb-6 md:mb-0">
              <Text className="text-[40px] font-bold mb-2 leading-[50px] max-w-[748px]">
                From Our Company To Your Home. Order Online For Delivery Or Pick-Up
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
