import React from "react";
import Link from "next/link";
import Image from "next/image";

import Text from "@/ui/Text";

import logo from "@/public/logo.svg";
import instagram from "@/public/icons/social/instagram.svg";
import facebook from "@/public/icons/social/facebook.svg";
import tiktok from "@/public/icons/social/tiktok.svg";
import dot from "@/public/icons/social/dot.svg";
import { Phone } from "./ui/Icons";

const Footer = () => {
  return (
    <footer className="bg-[#F2EEE6]">
      <div className="container mx-auto max-w-7xl px-[20px] md:px-0">
        <div className="flex w-full">
          {/* Left */}

          <div className="items-left border-r-caption tab:items-center flex w-[35%] flex-col border-r-[0.5px] md:col-span-1 md:mr-0 md:w-[30%] md:items-center">
            <div className="nav-items flex flex-col gap-6 py-[30px] transition duration-500 ">
              <Link href="/">
                <h4 className="text-left text-[18px] leading-6 font-semibold md:text-[20px]">
                  Home
                </h4>
              </Link>

              <a href="mailto:support@albarakahoney.com">
                <h4 className="text-[18px] leading-6 font-semibold md:text-[20px]">
                  Support
                </h4>
              </a>

              <Link href="/terms-and-conditions" className="hidden md:block">
                <h4 className="text-[18px] leading-6 font-semibold md:text-[20px]">
                  Terms & Conditions
                </h4>
              </Link>

              <Link href="/privacy-policy" className="hidden md:block">
                <h4 className="text-[18px] leading-6 font-semibold md:text-[20px]">
                  Privacy Policy
                </h4>
              </Link>

              {/* Mobile */}
              <Link href="/terms-and-conditions" className="block md:hidden">
                <h4 className="text-[18px] leading-6 font-semibold md:text-[20px]">
                  Terms
                </h4>
              </Link>

              <Link href="/privacy-policy" className="block md:hidden">
                <h4 className="text-[18px] leading-6 font-semibold md:text-[20px]">
                  Privacy
                </h4>
              </Link>
            </div>
          </div>

          {/* Center */}
          <div className="col-span-4 flex w-[65%] flex-col items-center justify-center md:w-[40%] md:pl-[0px]">
            <Link href="/">
              <Image src={logo} alt="logo" className="w-[186px]" />
            </Link>

            <Text className="mx-auto mt-[16px] max-w-[280px] text-center text-[13px] leading-5 font-normal text-[#979797]  md:text-[16px]">
              Albaraka Honey – <br />
              Pure Blessings in Every Drop
            </Text>
          </div>

          {/* Right */}
          <div className="border-l-caption col-span-1 hidden w-[30%] border-l-[0.5px] text-center md:block">
            <div className="flex flex-col items-center gap-6 justify-center h-full">
              <div className="flex items-center gap-[15px] md:gap-[11px]">
                <a
                  href="https://www.instagram.com/thealbarakahoney/"
                  className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]"
                >
                  <Image
                    src={instagram}
                    alt="instagram"
                    className="h-[25px] w-[25px] md:h-[30px] md:w-[35px]"
                  />
                </a>
                <span className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]">
                  <Image
                    src={dot}
                    alt="dot"
                    className="h-auto w-[6px] md:w-[8px]"
                  />
                </span>
                <a
                  href="https://www.facebook.com/profile.php?id=61579862667667"
                  className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]"
                >
                  <Image
                    src={facebook}
                    alt="facebook"
                    className="h-[25px] w-[25px] md:h-[30px] md:w-[35px]"
                  />
                </a>
                <span className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]">
                  <Image
                    src={dot}
                    alt="dot"
                    className="h-auto w-[6px] md:w-[8px]"
                  />
                </span>
                <a
                  href="https://www.tiktok.com/@albarakahoney713"
                  className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]"
                >
                  <Image
                    src={tiktok}
                    alt="tiktok"
                    className="h-[25px] w-[25px] md:h-[30px] md:w-[35px]"
                  />
                </a>
              </div>

              <div className="flex">
                <a
                  href="tel:+923041980001"
                  className="text-[#302A25] text-[21px] font-semibold flex items-center gap-1"
                >
                  {" "}
                  <Phone /> +92 304 1980001
                </a>
              </div>
              {/* <a href={APPLE_APP_STORE}>
                <Image src={appleStore} alt="Apple store" />
              </a>

              <a href={GOOGLE_PLAY_STORE}>
                <Image src={playStore} alt="Play store" />
              </a> */}
              {/* 
              <Text className=" text-[16px] font-normal leading-5 ">
                App will be available: <br />{" "}
                <span className="text-[16px] font-semibold leading-5">
                  {" "}
                  October 16th
                </span>
              </Text> */}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t-caption border-t-[0.5px]" />

      {/* Mobile  */}
      <div className="container mx-auto max-w-7xl px-[20px] md:px-[64px]">
        <div className="text-center md:hidden">
          <div className="flex flex-col items-center gap-3 pt-[30px]">
            <div className=" flex items-center gap-[15px] md:gap-[11px]">
              <a
                href="https://www.instagram.com/thealbarakahoney/"
                className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]"
              >
                <Image
                  src={instagram}
                  alt="instagram"
                  className="h-[25px] w-[25px] md:h-[30px] md:w-[35px]"
                />
              </a>
              <span className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]">
                <Image
                  src={dot}
                  alt="dot"
                  className="h-auto w-[6px] md:w-[8px]"
                />
              </span>
              <a
                href="https://www.facebook.com/profile.php?id=61579862667667"
                className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]"
              >
                <Image
                  src={facebook}
                  alt="facebook"
                  className="h-[25px] w-[25px] md:h-[30px] md:w-[35px]"
                />
              </a>
              <span className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]">
                <Image
                  src={dot}
                  alt="dot"
                  className="h-auto w-[6px] md:w-[8px]"
                />
              </span>
              <a
                href="https://www.tiktok.com/@albarakahoney713"
                className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]"
              >
                <Image
                  src={tiktok}
                  alt="facebook"
                  className="h-[25px] w-[25px] md:h-[30px] md:w-[35px]"
                />
              </a>
            </div>

            <div className="flex">
              <a
                href="tel: +92 304 1980001"
                className="text-[#302A25] text-[21px] font-semibold flex items-center gap-1"
              >
                {" "}
                <Phone /> +92 304 1980001
              </a>
            </div>
            {/* <a href={APPLE_APP_STORE}>
  <Image src={appleStore} alt="Apple store" />
</a>

<a href={GOOGLE_PLAY_STORE}>
  <Image src={playStore} alt="Play store" />
</a> */}
            {/* 
<Text className=" text-[16px] font-normal leading-5 ">
  App will be available: <br />{" "}
  <span className="text-[16px] font-semibold leading-5">
    {" "}
    October 16th
  </span>
</Text> */}
          </div>
        </div>
        {/* <Text className=" mt-[20px] text-center text-[16px] font-normal leading-5 md:hidden ">
          App will be available:{" "}
          <span className="text-[16px] font-semibold leading-5">
            October 16th
          </span>
        </Text> */}
      </div>

      <div className="border-b-caption mt-[24px] border-b-[0.5px] md:hidden" />

      <Text className="text-center text-[#302A25] py-[24px] text-[20px] leading-6 font-bold md:ml-[75px] md:py-[32px]  md:text-[16px]">
        <span className="font-normal">© 2025</span> Albaraka Honey
      </Text>

      {/* <Script
        id="load-stripe"
        dangerouslySetInnerHTML={{
          __html: `function loadScript(a){var b=document.getElementsByTagName("head")[0],c=document.createElement("script");c.type="text/javascript",c.src="https://tracker.metricool.com/resources/be.js",c.onreadystatechange=a,c.onload=a,b.appendChild(c)}loadScript(function(){beTracker.t({hash:"852b069a2cf2b2f5dd3146d807479fb2"})});`,
        }}
      /> */}
    </footer>
  );
};

export default Footer;
