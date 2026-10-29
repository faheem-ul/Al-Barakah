import type { Metadata } from "next";
import React from "react";

import ContactUs from "@/components/Contact";
import { pageCanonicalAlternates } from "@/lib/seo/metadata-canonical";

export const metadata: Metadata = {
  alternates: pageCanonicalAlternates("/contact-us"),
};

const ContactUsPage = () => {
  return (
    <div className="min-h-screen">
      <ContactUs />
    </div>
  );
};

export default ContactUsPage;
