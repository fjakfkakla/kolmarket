import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";
import { getMarkets } from "@/lib/data";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.title };
}

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const markets = await getMarkets();
  return <AccountView markets={markets} />;
}
