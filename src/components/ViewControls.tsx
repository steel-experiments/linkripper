// ABOUTME: Toggle controls for the two display axes — layout (grid vs list) and
// ABOUTME: density (compact vs expanded). State lives in URL search params.
import Link from "next/link";

export type ViewLayout = "grid" | "list";
export type ViewDensity = "compact" | "expanded";

function Segment({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-ink-600 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </Link>
  );
}

export function ViewControls({
  layout,
  density,
}: {
  layout: ViewLayout;
  density: ViewDensity;
}) {
  const q = (l: ViewLayout, d: ViewDensity) => `/?view=${l}&density=${d}`;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex overflow-hidden rounded-md border border-ink-600">
        <Segment href={q("grid", density)} active={layout === "grid"}>
          ▦ Grid
        </Segment>
        <Segment href={q("list", density)} active={layout === "list"}>
          ☰ List
        </Segment>
      </div>
      <div className="inline-flex overflow-hidden rounded-md border border-ink-600">
        <Segment href={q(layout, "compact")} active={density === "compact"}>
          Compact
        </Segment>
        <Segment href={q(layout, "expanded")} active={density === "expanded"}>
          Expanded
        </Segment>
      </div>
    </div>
  );
}
