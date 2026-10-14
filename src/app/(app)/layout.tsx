import { Nav } from "@/components/Nav";
import { getCa } from "@/lib/ca";

/** L'app : la barre du haut et la page, sans pied ; le pied appartient à la landing. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav ca={getCa()} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-16 pt-6 md:pt-8">{children}</main>
    </>
  );
}
