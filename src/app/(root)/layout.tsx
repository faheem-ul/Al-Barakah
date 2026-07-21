import type { Metadata } from "next";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TopBar from "@/components/TopBar";

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
      {children}
      <Footer />
    </>
  );
}
