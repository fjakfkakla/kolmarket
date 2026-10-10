import type { Metadata } from "next";
import { LaunchCountdown } from "@/components/LaunchCountdown";
import { Logo } from "@/components/Logo";
import { requestTime } from "@/lib/data";
import { getLaunch } from "@/lib/launch";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "App opens in", robots: { index: false, follow: false } };

/** Ce que voient les pages de l'app avant le lancement public (voir proxy.ts) : le chrono, rien d'autre. */
export default async function LaunchPage() {
  const launch = await getLaunch();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-12 bg-white px-4 py-16">
      <Logo size={26} href="/" />
      <LaunchCountdown at={launch.at} serverNow={requestTime()} />
    </main>
  );
}
