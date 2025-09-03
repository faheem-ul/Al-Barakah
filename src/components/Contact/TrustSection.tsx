import React from "react";
import Image, { StaticImageData } from "next/image";

import chemicalfree from "@/public/icons/social/chemical-free.svg";
import preminumHoney from "@/public/icons/social/premium-honey.svg";

import Text from "../ui/Text";

const TrustSection = () => {
  return (
    <section className=" pt-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap md:flex-nowrap gap-8 items-center">
          {/* Left Column - Text & Features */}
          <div className="space-y-5 max-w-[550px]">
            <div>
              <Text className="md:text-[40px] md:leading-[50px] text-[30px] font-bold text-black mb-2 leading-[40px]">
                Building Relationships Based On Trust, Integrity.
              </Text>
              <Text className="text-[18px] text-black font-light leading-[25px]">
                {`
                At Al Baraka Honey, We Believe In Honesty And Authenticity. Our Honey Is Harvested Naturally, 
                Without Artificial Additives, Ensuring Every Drop Is Pure, Safe, And Packed With Nutrition. 
                From Hive To Home, We Deliver Nature's Sweetness With Integrity And Care.
               `}
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeatureBox
                icon={preminumHoney}
                title="3+"
                subtitle="Premium Honey Varieties"
                description="We Proudly Offer Rare Wild Honey From Apis Mellifera, Apis Florea, And The Unique Berry Bee Honey, Giving You Rich Flavors From Nature's Finest Sources."
              />
              <FeatureBox
                icon={chemicalfree}
                title="100%"
                subtitle="Natural & Chemical-Free"
                description="Our Honey Is Free From Preservatives, Sugar Syrups, And Chemicals – Just Pure, Raw Goodness As Nature Intended."
              />
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative">
            <Image
              src="/images/contactus/build relationship.png"
              alt="Beekeeper with honey"
              width={600}
              height={800}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const FeatureBox = ({
  icon,
  title,
  subtitle,
  description,
}: {
  icon: StaticImageData;
  title: string;
  subtitle: string;
  description: string;
}) => {
  return (
    <div className="">
      <div className="bg-[#302A25] w-[76px] h-[67px] rounded-[10px] flex justify-center items-center">
        <Image src={icon} alt="icon" />
      </div>
      <Text className="text-[32px] font-bold text-bold mb-0 mt-4">{title}</Text>
      <Text className="text-[16px] font-medium text-black mb-3">
        {subtitle}
      </Text>
      <Text className="text-sm text-blsck leading-relaxed">{description}</Text>
    </div>
  );
};

export default TrustSection;
