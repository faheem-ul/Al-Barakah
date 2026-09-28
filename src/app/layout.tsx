import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";

import { Toaster } from "@/ui/sonner";
import Providers from "@/providers";

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const tintaArabic = localFont({
  src: "../../public/fonts/TintaArabic-Bold.otf",
  display: "swap",
  variable: "--font-tinta-arabic",
});

const siteUrl = "https://www.albarakahoney.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Albaraka Honey",
  description: "Albaraka Honey – Pure Blessings in Every Drop",
  other: {
    "facebook-domain-verification": "lax2o1fgryftao561theo2v2e2zwk4",
    "facebook-domain-verification-second": "1t5hwn4myerzsv17t2ny710umrnuey",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${tintaArabic.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
