import { Nav } from "@/components/Nav";

/** /admin reste hors du verrou de lancement : c'est d'ici que l'admin se connecte et lance le chrono. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-16 pt-6 md:pt-8">{children}</main>
    </>
  );
}
