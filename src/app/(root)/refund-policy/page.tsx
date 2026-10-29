import type { Metadata } from "next";
import React from "react";

import RefundHero from "@/components/RefundPolicy/Hero";
import { pageCanonicalAlternates } from "@/lib/seo/metadata-canonical";

export const metadata: Metadata = {
  alternates: pageCanonicalAlternates("/refund-policy"),
};
import RefundContent from "@/components/RefundPolicy/Content";

const RefundPolicyPage = () => {
  return (
    <>
      <RefundHero />
      <RefundContent />
    </>
  );
};

export default RefundPolicyPage;
