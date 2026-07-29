import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { FeedbackButton } from "@/components/feedback-button";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-CQHLGC1SG7";

const helvena = localFont({
  src: [
    {
      path: "../../TTF/Helvena-Extralight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../TTF/Helvena-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../TTF/Helvena-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../TTF/Helvena-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../TTF/Helvena-Semibold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../TTF/Helvena-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../TTF/Helvena-Extrabold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../TTF/Helvena-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-helvena",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lockup Studio",
    template: "%s · Lockup Studio",
  },
  description:
    "Local-first logo lockup packaging. Upload SVG lockups, configure colors, and export a client-ready ZIP—entirely in your browser.",
  icons: {
    icon: [
      {
        url: "/logo-light.svg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/logo-dark.svg",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/logo.svg",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${helvena.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden font-sans text-foreground antialiased">
        <TooltipProvider>
          {children}
          <FeedbackButton />
        </TooltipProvider>
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
      </body>
    </html>
  );
}
