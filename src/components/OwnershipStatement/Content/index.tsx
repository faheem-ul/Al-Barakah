"use client";
import React from "react";
import Text from "@/ui/Text";

const OwnershipContent = () => {
  return (
    <div className="max-w-[1117px] mx-auto px-6 mt-[50px] py-8">
      <div className="space-y-6">
        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Ownership Statement
          </Text>
          <Text className="mb-4 font-poppins font-normal text-[18px] leading-[30px]">
            Last updated: August 24, 2026
          </Text>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            This Ownership Statement identifies who owns and operates the
            website https://www.albarakahoney.com/ (the {`"Website"`}) and the
            Al Barakah Honey brand as presented on the Website.
          </Text>
        </div>

        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Website Owner and Operator
          </Text>
          <Text className="mb-4 font-poppins font-normal text-[18px] leading-[30px]">
            The Website is owned and operated by <strong>Al Barakah Honey</strong>{" "}
            (also referred to as {`"the Company", "We", "Us" or "Our"`}),
            carrying on business in Pakistan.
          </Text>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            The Website is used to offer honey and related products for sale,
            provide customer information, and process orders, including payment
            through methods we enable on checkout.
          </Text>
        </div>

        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Brand, Content and Intellectual Property
          </Text>
          <Text className="mb-4 font-poppins font-normal text-[18px] leading-[30px]">
            Unless otherwise stated, Al Barakah Honey owns or is licensed to use
            all intellectual property on the Website, including the Al Barakah
            Honey name and logo, product names, text, images, graphics, layout,
            and other content.
          </Text>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            You may view and use the Website for personal, non-commercial
            shopping and information. You may not copy, reproduce, sell, or
            republish Website content without our prior written permission,
            except as allowed by applicable law.
          </Text>
        </div>

        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Domain and Online Presence
          </Text>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            The domain name albarakahoney.com and the official storefront
            operated at https://www.albarakahoney.com/ are controlled by Al
            Barakah Honey. Official social accounts linked from this Website
            (including Instagram, Facebook, TikTok and YouTube under
            thealbarakahoney) are also operated by or on behalf of Al Barakah
            Honey.
          </Text>
        </div>

        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Payments and Merchant Identity
          </Text>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            Payments taken through the Website (including cash on delivery and
            any online payment provider we enable, such as a card or wallet
            gateway) are collected for Al Barakah Honey as the merchant of
            record for those orders. Payment partners process transactions on
            our behalf and do not own the Website or the Al Barakah Honey brand.
          </Text>
        </div>

        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Contact for Ownership or Legal Notices
          </Text>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            Al Barakah Honey
            <br />
            Website: https://www.albarakahoney.com/
            <br />
            Email: support@albarakahoney.com
            <br />
            Phone / WhatsApp: +92 325 6957327
            <br />
            Country: Pakistan
          </Text>
        </div>
      </div>
    </div>
  );
};

export default OwnershipContent;
