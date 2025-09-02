import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import Navbar from "@/components/Navbar";
import { Toaster } from "@/ui/sonner";
import Providers from "@/providers";

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "AlBarakah Shop",
  description: "AlBarakah Shop market place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <Providers>
          <Navbar />
          {children}
          {/* <Footer /> */}

          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
