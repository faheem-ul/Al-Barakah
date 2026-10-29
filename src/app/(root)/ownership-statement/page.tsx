import type { Metadata } from "next";
import React from "react";

import OwnershipHero from "@/components/OwnershipStatement/Hero";
import { pageCanonicalAlternates } from "@/lib/seo/metadata-canonical";

export const metadata: Metadata = {
  alternates: pageCanonicalAlternates("/ownership-statement"),
};
import OwnershipContent from "@/components/OwnershipStatement/Content";

const OwnershipStatementPage = () => {
  return (
    <>
      <OwnershipHero />
      <OwnershipContent />
    </>
  );
};

export default OwnershipStatementPage;
