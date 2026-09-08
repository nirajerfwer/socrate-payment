import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Space_Grotesk, Crimson_Text } from "next/font/google";
import DodoProvider from "../components/provider/dodo-provider";
import { UserProvider } from "@/components/provider/authoprovider";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
});

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  variable: "--font-crimson",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Socrate Study Platform",
  description:
    "Upload any PDF and have an AI tutor explain, summarize, and quiz you instantly.",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${crimsonText.variable}`}
    >
      <body>
        <UserProvider>
        <DodoProvider/>
        {children}
        <Toaster />
        </UserProvider>

        <Script
          src="https://cdn.flowsery.com/main.js"
          strategy="afterInteractive"
          data-fl-website-id="flid_fMIM7nCNgJeJmBKsGt7_Ew"
          data-cookieless="true"
          data-local="true"
        />
      </body>
    </html>
  );
}