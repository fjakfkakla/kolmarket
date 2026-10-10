import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Modals } from "@/components/Modals";
import { WalletProvider } from "@/lib/wallet";
import { I18nProvider } from "@/i18n/client";
import { toClientDictionary } from "@/i18n/messages";
import { getI18n } from "@/i18n/server";

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

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: { default: t.meta.title, template: "%s · Marketcoins" }, description: t.meta.description };
}

export const viewport: Viewport = { themeColor: "#1652f0" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} className={`${inter.variable} ${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <I18nProvider locale={locale} dict={toClientDictionary(t)}>
          <WalletProvider>
            {children}
            <Modals />
          </WalletProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
