import type { Metadata } from "next";
import React from "react";

import PrivacyHero from "@/components/PrivacyPolicy/Hero";
import { pageCanonicalAlternates } from "@/lib/seo/metadata-canonical";

export const metadata: Metadata = {
  alternates: pageCanonicalAlternates("/privacy-policy"),
};
import Policies from "@/components/PrivacyPolicy/Policies";
const privacyPolicy = () => {
  return (
    <>
      <PrivacyHero />
      <Policies />
    </>
  );
};

export default privacyPolicy;
