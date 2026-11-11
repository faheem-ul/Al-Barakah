import React from "react";
import Image from "next/image";

import Text from "@/ui/Text";

const LICENSE_IMAGE = "/images/Food License Certificate.webp";

const licenseDetails = [
  { label: "Business Name", value: "Albaraka Honey" },
  { label: "Issued By", value: "Punjab Food Authority" },
  { label: "License Number", value: "LHR/M-B/79380624" },
  { label: "Valid From", value: "30 September 2026" },
  { label: "Valid Until", value: "29 September 2027" },
  { label: "License Category", value: "M-B" },
];

const FoodLicenseContent = () => {
  return (
    <div className="mx-auto mt-[50px] max-w-[1117px] px-6 py-8 md:pb-20">
      {/* intro */}
      <div>
        <Text
          as="h2"
          className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
        >
          Food Business License Certificate
        </Text>
        <Text className="font-poppins font-normal text-[18px] leading-[30px]">
          Al-Barakah Honey holds a valid Food Business License issued by the
          Punjab Food Authority under Section 15 of the Punjab Food Authority
          Act 2011. This license confirms that our business is registered and
          approved to operate as a food business, and that we follow the food
          safety and hygiene standards set by the authority.
        </Text>
      </div>

      {/* certificate */}
      <a
        href={LICENSE_IMAGE}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 block overflow-hidden rounded-[24px] border border-[#EDE4D3] bg-[#F2EEE6] p-2 transition hover:opacity-95 md:mt-10 md:rounded-[40px] md:p-5"
        aria-label="Open the Food License Certificate in full size"
      >
        <Image
          src={LICENSE_IMAGE}
          alt="Al-Barakah Honey Food Business License Certificate issued by the Punjab Food Authority"
          width={1754}
          height={1240}
          sizes="(max-width: 1117px) 92vw, 1069px"
          className="h-auto w-full rounded-[16px] bg-white object-contain md:rounded-[28px]"
          priority
        />
      </a>
      <Text className="mt-3 text-center text-[13px] text-[#6B6B6B] md:text-[14px]">
        Tap the certificate to view it in full size.
      </Text>

      {/* details */}
      <div className="mt-10 rounded-[24px] bg-[#F2EEE6] px-6 py-7 md:mt-12 md:rounded-[40px] md:px-10 md:py-10">
        <Text
          as="h2"
          className="font-poppins mb-6 text-[22px] leading-[30px] font-bold text-[#302A25] md:text-[26px]"
        >
          License Details
        </Text>
        <dl className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
          {licenseDetails.map((item) => (
            <div
              key={item.label}
              className="border-b border-[#302A25]/10 pb-4"
            >
              <dt className="text-[13px] font-medium tracking-wide text-[#6B5D4D] uppercase">
                {item.label}
              </dt>
              <dd className="mt-1 text-[17px] font-semibold text-[#302A25] md:text-[18px]">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        <Text className="mt-6 text-[15px] leading-[26px] text-[#302A25] md:text-[16px]">
          You can verify this license by scanning the QR code on the
          certificate with the Punjab Food Authority official app.
        </Text>
      </div>
    </div>
  );
};

export default FoodLicenseContent;
