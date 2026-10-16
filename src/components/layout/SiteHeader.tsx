import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/data/repositories";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-display text-[17px] font-semibold tracking-tight text-foreground ${className}`}>
      <span className="grid size-7 place-items-center rounded-md bg-ink text-ink-foreground" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="4" y="3" width="16" height="18" rx="1.5" />
          <path d="M8 8h8M8 12h5" />
        </svg>
      </span>
      {brand.name}
    </Link>
  );
}

export function CartLink() {
  const cart = useCart();
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  return (
    <Link to="/cart" className="relative grid size-9 place-items-center rounded-md text-foreground transition-colors hover:bg-muted" aria-label={`Cart, ${count} sheet${count === 1 ? "" : "s"}`}>
      <ShoppingBag className="size-[18px]" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-[18px] text-primary-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}

const nav = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <CartLink />
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/builder">Build Your Gang Sheet</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col gap-1 px-4" aria-label="Mobile">
                {[{ to: "/", label: "Home" }, ...nav, { to: "/cart", label: "Cart" }].map((n) => (
                  <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm hover:bg-muted">
                    {n.label}
                  </Link>
                ))}
                <Button asChild className="mt-3">
                  <Link to="/builder" onClick={() => setOpen(false)}>
                    Build Your Gang Sheet
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
