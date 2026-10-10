import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminGate, AdminView } from "@/components/AdminView";
import { adminSession, adminWallets } from "@/lib/admin";
import { loadAdminData } from "@/lib/admin-data";
import { requestTime } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

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
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold">Administration indisponible</h1>
        <p className="mt-2 text-sm text-muted">
          Vérifie que la migration <span className="mono">0006_admin.sql</span> est passée dans Supabase, puis recharge la page.
        </p>
      </div>
    );
  }
  return <AdminView data={data} now={requestTime()} />;
}
