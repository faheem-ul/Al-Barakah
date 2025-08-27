import type { Metadata } from "next";

import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Grounds Shop",
  description: "Grounds Shop market place",
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
