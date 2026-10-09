import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";

export const metadata: Metadata = { title: "Mon compte" };

export default function AccountPage() {
  return <AccountView />;
}
