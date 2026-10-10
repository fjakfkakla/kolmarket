import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <div className="card fade-up w-full max-w-md p-10 text-center">
        <div className="mx-auto w-fit">
          <Logo size={24} />
        </div>
        <div className="num display mt-8 text-[72px] text-blue">404</div>
        <h1 className="display mt-2 text-[26px]">Ce marché n&apos;existe pas</h1>
        <Link href="/app" className="plaque mt-6 h-12 px-5">
          Voir les marchés <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
