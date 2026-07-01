import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export function SiteNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="text-base font-semibold text-white">
          TariffOS
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-white/85 md:flex">
          <a href="/#workflow">Workflow</a>
          <a href="/#customers">Customers</a>
          <Link href="/pricing">Pricing</Link>
        </nav>
        <ButtonLink href="/auth/signup" size="sm" className="bg-white text-slate-950 hover:bg-slate-100">
          Start
        </ButtonLink>
      </div>
    </header>
  );
}
