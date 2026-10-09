import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-10 text-center fade-up">
      <div className="text-5xl font-black text-gold">404</div>
      <h1 className="mt-2 text-xl font-bold">Ce marché n&apos;existe pas</h1>
      <Link href="/" className="btn-gold mt-5">Retour aux marchés</Link>
    </div>
  );
}
