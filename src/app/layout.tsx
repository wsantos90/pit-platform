import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "P.I.T — Performance · Intelligence · Tracking",
  description: "Plataforma de gestão competitiva para FIFA Pro Clubs 11v11",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
