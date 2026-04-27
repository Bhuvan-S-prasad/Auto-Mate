import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="legal-shell">
      {/* ── Header ─────────────────────────────── */}
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link href="/" className="legal-logo">
            <span className="legal-logo-mark">◆</span>
            Auto-Mate
          </Link>
        </div>
        <div className="legal-header-rule" />
      </header>

      {/* ── Content ────────────────────────────── */}
      <main className="legal-main">{children}</main>

      {/* ── Footer ─────────────────────────────── */}
      <footer className="legal-footer">
        <div className="legal-footer-rule" />
        <div className="legal-footer-inner">
          <span className="legal-footer-copy">
            © {new Date().getFullYear()} Auto-Mate
          </span>
          <nav className="legal-footer-nav" aria-label="Legal pages">
            <Link href="/privacy">Privacy Policy</Link>
            <span className="legal-footer-sep" aria-hidden="true">·</span>
            <Link href="/terms">Terms of Service</Link>
            <span className="legal-footer-sep" aria-hidden="true">·</span>
            <Link href="/cookies">Cookie Policy</Link>
          </nav>
        </div>
      </footer>

      {/* ── Scoped styles ──────────────────────── */}
      <style>{`
        /* Shell */
        .legal-shell {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
          font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .legal-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(18, 18, 20, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .legal-header-inner {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 1.5rem;
          height: 56px;
          display: flex;
          align-items: center;
        }
        .legal-header-rule {
          height: 1px;
          background: var(--border);
        }

        /* Logo */
        .legal-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--foreground);
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .legal-logo:hover {
          color: var(--primary);
        }
        .legal-logo-mark {
          font-size: 0.65rem;
          color: var(--primary);
          position: relative;
          top: -1px;
        }

        /* Main reading area */
        .legal-main {
          flex: 1;
          max-width: 720px;
          width: 100%;
          margin: 0 auto;
          padding: 3.5rem 1.5rem 5rem;
        }

        /* Footer */
        .legal-footer {
          margin-top: auto;
        }
        .legal-footer-rule {
          height: 1px;
          background: var(--border);
        }
        .legal-footer-inner {
          max-width: 720px;
          margin: 0 auto;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .legal-footer-copy {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .legal-footer-nav {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .legal-footer-nav a {
          font-size: 0.8125rem;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .legal-footer-nav a:hover {
          color: var(--primary);
        }
        .legal-footer-sep {
          color: var(--text-subtle);
          font-size: 0.75rem;
        }

        /* ── Prose typography ─────────────────── */

        /* Page title (h1) */
        .legal-main :is(h1) {
          font-family: "Instrument Serif", serif;
          font-size: clamp(1.75rem, 4vw, 2.25rem);
          font-weight: 400;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: var(--foreground);
          margin: 0 0 0.5rem;
        }

        /* Effective date / subtitle */
        .legal-main .legal-meta {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 2.5rem;
          padding-bottom: 2.5rem;
          border-bottom: 1px solid var(--border);
        }

        /* Section headings */
        .legal-main :is(h2) {
          font-size: 1.0625rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--foreground);
          margin: 2.5rem 0 0.75rem;
        }

        .legal-main :is(h3) {
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--foreground);
          margin: 1.5rem 0 0.5rem;
        }

        /* Body copy */
        .legal-main :is(p) {
          font-size: 0.9375rem;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.78);
          margin: 0 0 1rem;
        }

        /* Lists */
        .legal-main :is(ul, ol) {
          margin: 0 0 1rem 1.25rem;
          padding: 0;
        }
        .legal-main :is(li) {
          font-size: 0.9375rem;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.78);
          margin-bottom: 0.35rem;
        }

        /* Inline code / monospace terms */
        .legal-main :is(code) {
          font-family: "DM Mono", monospace;
          font-size: 0.8125rem;
          background: rgba(16, 185, 129, 0.08);
          color: var(--primary);
          border: 1px solid var(--border-primary);
          border-radius: 4px;
          padding: 0.1em 0.4em;
        }

        /* Links in content */
        .legal-main :is(a) {
          color: var(--primary);
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: opacity 0.15s ease;
        }
        .legal-main :is(a):hover {
          opacity: 0.8;
        }

        /* Highlight / callout box */
        .legal-main .legal-callout {
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 1rem 1.25rem;
          margin: 1.5rem 0;
        }
        .legal-main .legal-callout p {
          margin: 0;
          font-size: 0.875rem;
        }

        /* Data table */
        .legal-main .legal-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.25rem 0 1.5rem;
          font-size: 0.875rem;
        }
        .legal-main .legal-table th {
          text-align: left;
          font-weight: 500;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid var(--border);
        }
        .legal-main .legal-table td {
          padding: 0.6rem 0.75rem;
          vertical-align: top;
          color: rgba(255, 255, 255, 0.78);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          line-height: 1.6;
        }
        .legal-main .legal-table tr:last-child td {
          border-bottom: none;
        }

        /* Section divider */
        .legal-main .legal-divider {
          height: 1px;
          background: var(--border);
          margin: 2.5rem 0;
          border: none;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .legal-footer-inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .legal-main {
            padding: 2.5rem 1.25rem 4rem;
          }
        }
      `}</style>
    </div>
  );
}
