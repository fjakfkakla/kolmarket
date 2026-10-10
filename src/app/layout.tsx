import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Modals } from "@/components/Modals";
import { WalletProvider } from "@/lib/wallet";

const inter = localFont({
  src: [{ path: "./fonts/inter-var-latin.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});
const sora = localFont({
  src: [{ path: "./fonts/sora-var-latin.woff2", weight: "100 800", style: "normal" }],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Marketcoins · Trade the future", template: "%s · Marketcoins" },
  description:
    "Le marché de prédiction des memecoins. Parie sur les KOLs qui tradent et sur les coins qui vont exploser, en USDC sur Solana, avec 0 % de frais.",
};

export const viewport: Viewport = { themeColor: "#1652f0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <WalletProvider>
          {children}
          <Modals />
        </WalletProvider>
      </body>
    </html>
  );
}
