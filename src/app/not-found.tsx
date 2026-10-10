import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <div className="card fade-up w-full max-w-md p-10 text-center">
        <div className="mx-auto w-fit">
          <Logo size={24} />
        </div>
        <div className="num display mt-8 text-[72px] text-blue">404</div>
        <h1 className="display mt-2 text-[26px]">{t.app.notFound.title}</h1>
        <Link href="/app" className="plaque mt-6 h-12 px-5">
          {t.common.seeMarkets} <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
