import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { DOC_GROUPS } from "./content";

/** Turns "#/docs/swap" into "swap" (or "" for the docs home). */
export function docsSectionFromHash(hash: string): string {
  const match = /^#\/docs\/?([\w-]*)/.exec(hash);
  return match?.[1] ?? "";
}

export function isDocsHash(hash: string): boolean {
  return hash.startsWith("#/docs");
}

const ALL_ITEMS = DOC_GROUPS.flatMap((g) => g.items);

export default function DocsPage({ section }: { section: string }) {
  const [query, setQuery] = useState("");

  const current = ALL_ITEMS.find((i) => i.id === section) ?? ALL_ITEMS[0];
  const index = ALL_ITEMS.findIndex((i) => i.id === current.id);
  const prev = index > 0 ? ALL_ITEMS[index - 1] : null;
  const next = index < ALL_ITEMS.length - 1 ? ALL_ITEMS[index + 1] : null;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOC_GROUPS;
    return DOC_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) =>
        `${i.title} ${i.keywords}`.toLowerCase().includes(q)
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <>
      <nav className="nav">
        <div className="brand">
          <div className="brandMark" />
          <span>AI Wallet for Arc</span>
          <span className="statusPill" style={{ padding: "4px 10px" }}>
            DOCS
          </span>
        </div>
        <a className="navDocs" href="#/">
          <ArrowLeft size={16} aria-hidden />
          Back to app
        </a>
      </nav>

      <div className="docsShell">
        <aside className="docsSide" aria-label="Documentation navigation">
          <label className="docsSearch">
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="Search the docs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          {groups.length === 0 && (
            <p className="docsEmpty">No pages match “{query}”.</p>
          )}

          {groups.map((g) => (
            <div key={g.label}>
              <div className="docsGroupLabel">{g.label}</div>
              {g.items.map((item) => (
                <a
                  key={item.id}
                  href={`#/docs/${item.id}`}
                  className={`docsNavItem${
                    item.id === current.id ? " active" : ""
                  }`}
                  aria-current={item.id === current.id ? "page" : undefined}
                >
                  {item.title}
                </a>
              ))}
            </div>
          ))}
        </aside>

        <article className="docsMain">
          {current.render()}

          <div className="docsPager">
            {prev ? (
              <a href={`#/docs/${prev.id}`}>
                <small>Previous</small>
                <b>{prev.title}</b>
              </a>
            ) : (
              <span />
            )}
            {next && (
              <a className="next" href={`#/docs/${next.id}`}>
                <small>Next</small>
                <b>{next.title}</b>
              </a>
            )}
          </div>
        </article>
      </div>
    </>
  );
}
