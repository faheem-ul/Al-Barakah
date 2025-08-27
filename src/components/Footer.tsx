import React from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";

import Text from "@/ui/Text";
import { APPLE_APP_STORE, GOOGLE_PLAY_STORE } from "@/lib/constants";

import appleStore from "@/public/icons/apple-store.svg";
import playStore from "@/public/icons/play-store.svg";

import instagram from "@/public/icons/social/instagram.svg";
import facebook from "@/public/icons/social/facebook.svg";
import youtube from "@/public/icons/social/youtube.svg";
import dot from "@/public/icons/social/dot.svg";

const Footer = () => {
  return (
    <footer className="bg-primary">
      <div className="container mx-auto max-w-7xl px-[20px] md:px-0">
        <div className="flex w-full">
          {/* Left */}

          <div className="items-left border-r-caption tab:items-center flex w-[35%] flex-col border-r-[0.5px] md:col-span-1 md:mr-0 md:w-[30%] md:items-center">
            <div className="nav-items flex flex-col gap-6 py-[30px] transition duration-500 md:pt-[50px] md:pb-[0px]">
              <Link href="https://www.groundsapp.co">
                <h4 className="text-left text-[18px] leading-6 font-semibold md:text-[20px]">
                  Home
                </h4>
              </Link>

              <a href="mailto:support@groundsapp.co">
                <h4 className="text-[18px] leading-6 font-semibold md:text-[20px]">
                  Support
                </h4>
              </a>

              <Link
                href="https://www.groundsapp.co/terms-and-conditions"
                className="hidden md:block"
              >
                <h4 className="text-[18px] leading-6 font-semibold md:text-[20px]">
                  Terms & Conditions
                </h4>
              </Link>

              <Link
                href="https://www.groundsapp.co/privacy-policy"
                className="hidden md:block"
              >
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
          <div className="col-span-4 mb-[18px] flex w-[65%] flex-col items-center pt-[24px] pl-[20px] md:col-span-3 md:mb-[40px] md:w-[40%] md:pt-[50px] md:pl-[0px]">
            <Text className="text-dark-brown text-[24px] leading-[40px] font-bold md:text-[32px]">
              GROUNDS
            </Text>

            <Text className="mx-auto mt-[20px] max-w-[216px] text-center text-[13px] leading-5 font-normal text-[#979797] md:max-w-[445px] md:text-[16px]">
              Challenge yourself now to become the best you possible. Get the
              Grounds app!
            </Text>

            <div className="mt-[22px] flex items-center gap-[15px] md:mt-[42px] md:gap-[11px]">
              <a
                href="https://www.instagram.com/grounds_app/"
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
                href="https://www.facebook.com/profile.php?id=61551930973017"
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
                href="https://www.youtube.com/@grounds_app"
                className="text-[14px] leading-6 font-medium text-[#302A25] md:text-[16px]"
              >
                <Image
                  src={youtube}
                  alt="youtube"
                  className="h-[30px] w-[30px] md:h-[35px] md:w-[35px]"
                />
              </a>
            </div>
          </div>

          {/* Right */}
          <div className="border-l-caption col-span-1 hidden w-[30%] border-l-[0.5px] pb-[45px] text-center md:block">
            <div className="flex flex-col items-center gap-5 pt-[50px]">
              <a href={APPLE_APP_STORE}>
                <Image src={appleStore} alt="Apple store" />
              </a>

              <a href={GOOGLE_PLAY_STORE}>
                <Image src={playStore} alt="Play store" />
              </a>
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
          <div className="tab:justify-center flex items-center gap-5 pt-[24px]">
            <a href={APPLE_APP_STORE}>
              <Image src={appleStore} alt="Apple store" />
            </a>

            <a href={GOOGLE_PLAY_STORE}>
              <Image src={playStore} alt="Play store" />
            </a>
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

      <div className="container mx-auto max-w-7xl px-[20px] md:px-4">
        <Text className="text-brown py-[24px] text-center text-[14px] leading-6 font-medium md:ml-[75px] md:py-[41px] md:text-left md:text-[16px]">
          © 2023 Grounds App LLC
        </Text>
      </div>

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
