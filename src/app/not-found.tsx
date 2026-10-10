import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="card mx-auto max-w-md p-10 text-center fade-up">
      <div className="text-5xl font-black text-gold">404</div>
      <h1 className="mt-2 text-xl font-bold">{t.notFound.title}</h1>
      <Link href="/" className="btn-gold mt-5">{t.notFound.back}</Link>
    </div>
  );
}
