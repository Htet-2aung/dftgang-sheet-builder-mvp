import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { brand } from "@/config/brand";
import { Logo, SiteHeader } from "./SiteHeader";

export function DemoBanner() {
  return (
    <div className="border-b bg-ink text-ink-foreground">
      <p className="mx-auto max-w-7xl px-4 py-2 text-center text-xs sm:px-6">
        <span className="mr-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">Prototype</span>
        Interactive demo — prices are illustrative and no real orders or payments are processed.
      </p>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{brand.tagline}</p>
          <p className="mt-4 text-xs text-muted-foreground">Demonstration prototype. Business details below are placeholders awaiting client approval.</p>
        </div>
        <FooterCol title="Product" links={[{ to: "/builder", label: "Gang sheet builder" }, { to: "/pricing", label: "Pricing" }, { to: "/how-it-works", label: "How it works" }]} />
        <FooterCol title="Support" links={[{ to: "/faq", label: "FAQ" }, { to: "/cart", label: "Cart" }, { to: "/admin", label: "Admin demo" }]} />
        <div>
          <h3 className="text-sm font-semibold">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>{brand.contact.email}</li>
            <li>{brand.contact.phone}</li>
            <li>{brand.contact.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {brand.name} (placeholder). {brand.contact.companyNumber}</p>
          <div className="flex gap-4">
            <Link to="/faq" hash="legal" className="hover:text-foreground">Privacy Policy (placeholder)</Link>
            <Link to="/faq" hash="legal" className="hover:text-foreground">Terms of Service (placeholder)</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: "/builder" | "/pricing" | "/how-it-works" | "/faq" | "/cart" | "/admin"; label: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-muted-foreground hover:text-foreground">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section className="border-b bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold sm:text-5xl">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">{children}</div>}
      </div>
    </section>
  );
}
