import type { Metadata } from "next";
import React from "react";

import TermsHero from "@/components/TermsAndConditions'/Hero";
import { pageCanonicalAlternates } from "@/lib/seo/metadata-canonical";

export const metadata: Metadata = {
  alternates: pageCanonicalAlternates("/terms-and-conditions"),
};
import Terms from "@/components/TermsAndConditions'/Terms";
const page = () => {
  return (
    <>
      <TermsHero />
      <Terms />
    </>
  );
};

export default page;
