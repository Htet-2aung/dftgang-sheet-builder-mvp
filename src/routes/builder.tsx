import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BuilderPage } from "@/features/builder/BuilderPage";
import { brand } from "@/config/brand";

const searchSchema = z.object({
  sample: z.coerce.boolean().optional().catch(undefined),
  edit: z.string().optional().catch(undefined),
  length: z.coerce.number().optional().catch(undefined),
  fresh: z.coerce.boolean().optional().catch(undefined),
});

export const Route = createFileRoute("/builder")({
  validateSearch: searchSchema,
  // The canvas editor is browser-only.
  ssr: false,
  head: () => ({
    meta: [
      { title: `Gang Sheet Builder — ${brand.name}` },
      { name: "description", content: "Upload artwork, size it in inches, arrange your DTF gang sheet and see an instant price estimate." },
      { property: "og:title", content: `Gang Sheet Builder — ${brand.name}` },
      { property: "og:description", content: "Interactive DTF gang sheet builder with precise sizing and live pricing." },
    ],
  }),
  component: BuilderRoute,
  pendingComponent: () => <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Loading the builder…</div>,
});

function BuilderRoute() {
  const search = Route.useSearch();
  return <BuilderPage search={search} />;
}
