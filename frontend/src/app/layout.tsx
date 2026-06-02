import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeMax — AI Web App Builder",
  description: "Describe an app. We build it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen antialiased">{children}</body>
    </html>
  );
}
