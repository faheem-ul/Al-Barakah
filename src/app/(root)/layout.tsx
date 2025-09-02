import type { Metadata } from "next";

import Footer from "@/components/Footer";

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
      {" "}
      {/* <Navbar /> */}
      {children}
      <Footer />
    </>
  );
}
