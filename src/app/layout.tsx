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
const archivo = localFont({
  src: [{ path: "./fonts/archivo-var-latin.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-archivo",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});
const instrument = localFont({
  src: [{ path: "./fonts/instrument-serif-italic-latin.woff2", weight: "400", style: "italic" }],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Marketcoins · Trade the future", template: "%s · Marketcoins" },
  description:
    "Le marché de prédiction des memecoins. Parie sur les KOLs qui tradent et sur les coins qui vont exploser, en USDC sur Solana, avec 0 % de frais.",
};

export const viewport: Viewport = { themeColor: "#2e5cff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${archivo.variable} ${instrument.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <WalletProvider>
          {children}
          <Modals />
        </WalletProvider>
      </body>
    </html>
  );
}
