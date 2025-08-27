import React from "react";

import Text from "@/ui/Text";
import {
  DeliveryIcon,
  QualityIcon,
  OfferIcon,
  SecurePaymentIcon,
} from "@/ui/Icons";

const Services = () => {
  return (
    <div className="max-mob:max-w-full max-mob:py-10 max-mob:px-5 mx-auto max-w-7xl py-[80px]">
      <Text as="h1" className="max-mob:text-center">
        Lorem ipsum
      </Text>

      <div className="max-mob:flex-col mt-8 flex items-center gap-8">
        <ServiceCard
          icon={DeliveryIcon}
          title="Worldwide shipping"
          description="It elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo."
        />
        <ServiceCard
          icon={QualityIcon}
          title="Best quality"
          description="It elit tellus, luctus nec ullamcorper mattis"
        />
        <ServiceCard
          icon={OfferIcon}
          title="Best offers"
          description="Use your favorite trainers code to get 10% off all merch applied at checkout."
        />
        <ServiceCard
          icon={SecurePaymentIcon}
          title="Secure Payments"
          description="Ullamcorper mattis, pulvinar dapibus leo."
        />
      </div>
    </div>
  );
};

export default Services;

// ServiceCard Component
const ServiceCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => {
  return (
    <div className="bg-primary max-mob:w-full flex h-[255px] w-[280px] flex-col items-center justify-center rounded-[24px] p-5">
      <Icon />
      <Text className="text-primary-foreground text-[22px] leading-[100px]">
        {title}
      </Text>
      <Text className="text-caption text-center text-[16px]">
        {description}
      </Text>
    </div>
  );
};
