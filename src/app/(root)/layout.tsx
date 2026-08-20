import type { Metadata } from "next";

import AzadiSalePromo from "@/components/AzadiSalePromo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SalesPopup from "@/components/SalesPopup";
import TopBar from "@/components/TopBar";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export const metadata: Metadata = {
  title: "Albaraka Honey",
  description: "Albaraka Honey – Pure Blessings in Every Drop",
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
