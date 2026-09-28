import type { Metadata } from "next";

import AzadiSalePromo from "@/components/AzadiSalePromo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SalesPopup from "@/components/SalesPopup";
import TopBar from "@/components/TopBar";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const siteTitle = "Albaraka Honey";
const siteDescription = "Albaraka Honey – Pure Blessings in Every Drop";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "/",
    siteName: siteTitle,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-share.png",
        width: 1200,
        height: 1200,
        alt: siteDescription,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-share.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <TopBar />
      <Navbar />
      {/* <AzadiSalePromo /> */}
      {children}
      <Footer />
      <SalesPopup />
      <WhatsAppFloat />
    </>
  );
}
