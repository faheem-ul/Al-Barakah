import type { Metadata } from "next";
import React from "react";

import BlogHero from "@/components/Blog/BlogHero";
import FoodLicenseContent from "@/components/FoodLicense/Content";
import { pageCanonicalAlternates } from "@/lib/seo/metadata-canonical";

const title = "Food License – Punjab Food Authority Certified | Al-Barakah";
const description =
  "Al-Barakah Honey is licensed by the Punjab Food Authority. View our Food Business License certificate and license details.";

export const metadata: Metadata = {
  title,
  description,
  alternates: pageCanonicalAlternates("/food-license"),
  openGraph: {
    title,
    description,
    url: "/food-license",
    type: "website",
  },
};

const FoodLicensePage = () => {
  return (
    <>
      <BlogHero
        title="Food License"
        subtitle="Licensed by the Punjab Food Authority"
      />
      <FoodLicenseContent />
    </>
  );
};

export default FoodLicensePage;
