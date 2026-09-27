"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  LayoutGrid,
  PiggyBank,
  Tags,
  Wallet,
  Upload,
  Store,
  MoreHorizontal,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

const primaryNav = [
  { href: "/", label: "Resumo", icon: LayoutGrid },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/accounts", label: "Contas", icon: Wallet },
  { href: "/categories", label: "Categorias", icon: Tags },
];

const moreNav = [
  { href: "/budgets", label: "Orçamento", icon: PiggyBank },
  { href: "/import", label: "Importar extrato", icon: Upload },
  { href: "/merchants", label: "Comerciantes", icon: Store },
];

const allNav = [...primaryNav, ...moreNav];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreNav.some((item) => isActive(pathname, item.href));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 md:h-16">
          <Link
            href="/"
            aria-label="Moni, ir para o resumo"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <Logo size={24} />
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {allNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-8px_oklch(0.3_0.04_175/15%)] backdrop-blur-md md:hidden"
      >
        <ul className="grid grid-cols-5">
          {primaryNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                      active && "bg-accent"
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
              <DialogTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                      moreActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                        moreActive && "bg-accent"
                      )}
                    >
                      <MoreHorizontal className="size-[18px]" aria-hidden="true" />
                    </span>
                    Mais
                  </button>
                }
              />
              <DialogContent className="max-w-xs">
                <DialogHeader>
                  <DialogTitle>Mais</DialogTitle>
                  <DialogDescription>Outras áreas do Moni.</DialogDescription>
                </DialogHeader>
                <ul className="flex flex-col gap-1">
                  {moreNav.map(({ href, label, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-accent"
                          )}
                        >
                          <Icon className="size-[18px]" aria-hidden="true" />
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </DialogContent>
            </Dialog>
          </li>
        </ul>
      </nav>
    </>
  );
}
