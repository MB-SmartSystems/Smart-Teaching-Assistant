import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Teaching Assistant",
  description: "Mobile Schüler-Management für Schlagzeugunterricht",
  manifest: "/manifest.json",
  themeColor: "#4ade80",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}