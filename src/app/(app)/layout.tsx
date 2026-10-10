import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 md:py-8">{children}</main>
      <Footer />
    </>
  );
}
