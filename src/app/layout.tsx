import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navigation/Navbar";
import NextAuthSessionProvider from "./providers/SessionProvider";
import { Toaster } from "react-hot-toast";
import ScrollToTopWrapper from "@/components/ScrollToTopWrapper";
import Footer from "@/components/Footer";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SLS",
  description: "Points & Pay Tracking",
  icons: {
    icon: "/logos/slsturbo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.className} antialiased layout`}>
        <Toaster position="top-right" />

        <NextAuthSessionProvider>
            <div className="page-wrapper">
              <Navbar />
              <main className="content">{children}</main>
              <ScrollToTopWrapper />
              <Footer />
            </div>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}