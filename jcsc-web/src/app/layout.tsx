import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "JCSC - مركز دعم التعداد السكاني",
  description: "Jordan Census Support Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${notoSansArabic.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
