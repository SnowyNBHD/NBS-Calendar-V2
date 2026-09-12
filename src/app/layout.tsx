import type { Metadata, Viewport } from "next";
import { VT323, Quantico } from "next/font/google";
import Nav from "./nav";
import RegisterServiceWorker from "./register-sw";
import "./globals.css";

const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
});

const quantico = Quantico({
  variable: "--font-quantico",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NBS Calendar",
  description: "Personal brain-dump-to-calendar app.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NBS Calendar",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0a0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${vt323.variable} ${quantico.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        <Nav />
        {children}
      </body>
    </html>
  );
}
