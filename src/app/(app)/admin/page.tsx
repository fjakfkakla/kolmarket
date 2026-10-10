import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminGate, AdminView } from "@/components/AdminView";
import { adminSession, adminWallets } from "@/lib/admin";
import { loadAdminData } from "@/lib/admin-data";
import { requestTime } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const db = supabaseAdmin();
  if (!db) notFound();
  const { session, admin } = await adminSession();
  if (!admin) return <AdminGate connected={Boolean(session)} configured={adminWallets().length > 0} />;
  const data = await loadAdminData(db).catch((e: Error) => {
    console.error("[admin]", e.message);
    return null;
  });
  if (!data) {
    const { t } = await getI18n();
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold">{t.admin.unavailableTitle}</h1>
        <p className="mt-2 text-sm text-muted">
          {t.admin.unavailableBefore} <span className="mono">0006_admin.sql</span> {t.admin.unavailableAfter}
        </p>
      </div>
    );
  }
  return <AdminView data={data} now={requestTime()} />;
}
