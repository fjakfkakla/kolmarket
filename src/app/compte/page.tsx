import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.accountTitle };
}

export default function AccountPage() {
  return <AccountView />;
}
