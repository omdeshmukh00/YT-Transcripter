import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "../components/PwaRegister";
import { InlineScript } from "../components/InlineScript";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YT Transcripter",
  description: "Paste a YouTube link and instantly generate, preview, and download a styled PDF transcript with exact timestamps. Fully supports English, Hindi, and Marathi text offline.",
  applicationName: "YT Transcripter",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YT Transcripter",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626", // red-600
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript
          html={`(function(){try{var t=localStorage.getItem('theme')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark')}catch(e){}})()`}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans transition-colors duration-250">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}

