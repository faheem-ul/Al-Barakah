import React from "react";
import Image from "next/image";

const OrderBanner = () => {
  return (
    <section className="py-20 px-6">
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
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                From Our Company To Your Home. Order Online For Delivery Or Pick-Up
              </h2>
            </div>
            
            <div className="flex-shrink-0">
              <button className="bg-white text-black font-semibold py-4 px-8 rounded-lg hover:bg-gray-100 transition-colors text-lg">
                Order Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrderBanner;
