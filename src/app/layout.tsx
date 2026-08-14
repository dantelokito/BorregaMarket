import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LaBorregaMarket — Fruterías cerca de ti",
  description:
    "Encuentra fruterías, verdulerías y productos agrícolas en Monterrey. Compara precios y contacta directo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-white text-gray-900`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
