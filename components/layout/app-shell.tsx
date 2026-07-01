import Link from "next/link";
import { BarChart3, FileSearch, KeyRound, LayoutDashboard, LogOut, PlusCircle } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceSession } from "@/lib/db/domain";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/classify", label: "New shipment plan", icon: PlusCircle },
  { href: "/classifications", label: "Shipment plans", icon: FileSearch },
  { href: "/dashboard/api-keys", label: "API keys", icon: KeyRound },
  { href: "/pricing", label: "Plans", icon: BarChart3 }
];

export function AppShell({
  workspace,
  children
}: {
  workspace: WorkspaceSession;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm">
                TO
              </span>
              <span>
                <span className="block text-lg font-semibold leading-5 text-slate-950">TariffOS</span>
                <span className="mt-1 block text-xs font-medium text-slate-500">Shipping operations agent</span>
              </span>
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone="blue">{workspace.organization.plan}</Badge>
              {workspace.isMock ? <Badge>mock</Badge> : null}
            </div>
          </div>
          <nav className="flex-1 space-y-1.5 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-100 hover:bg-emerald-50/70 hover:text-slate-950"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors group-hover:bg-white group-hover:text-emerald-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-900">{workspace.organization.name}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{workspace.email}</p>
            <form action={logoutAction} className="mt-4">
              <Button variant="outline" className="w-full justify-start" type="submit">
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </form>
          </div>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="font-semibold text-slate-950">TariffOS</Link>
            <Link href="/dashboard/classify" className="text-sm font-medium text-emerald-700">New plan</Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
