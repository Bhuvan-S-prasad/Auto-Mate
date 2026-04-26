import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Auto-Mate",
  description: "Terms and conditions for using the Auto-Mate service.",
};

const EFFECTIVE_DATE = "26 April 2026";
const CONTACT_EMAIL = "legal@auto-mate.app"; // TODO: replace with real address
const JURISDICTION = "Your Jurisdiction"; // TODO: replace with your registered jurisdiction

export default function TermsPage() {
  return (
    <article>
      {/* ── Page header ─────────────────────────── */}
      <h1>Terms of Service</h1>
      <p className="legal-meta">Effective date: {EFFECTIVE_DATE}</p>

      {/* ── Section 1 ───────────────────────────── */}
      <h2>1. Acceptance</h2>
      <p>
        By accessing or using Auto-Mate, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service. You must be at least 18 years old to use this service.
      </p>

      <hr className="legal-divider" />

      {/* ── Section 2 ───────────────────────────── */}
      <h2>2. What Auto-Mate does</h2>
      <p>
        Auto-Mate is an AI-powered assistant designed to act on your behalf by reading and sending emails, managing your calendar, and keeping track of context. We provide the tool, but you control it. You are entirely responsible for reviewing all actions before approval. You remain responsible for all emails sent, calendar events created, and actions taken through the service.
      </p>

      <hr className="legal-divider" />

      {/* ── Section 3 ───────────────────────────── */}
      <h2>3. Your account</h2>
      <ul>
        <li>You must provide accurate and complete information when creating an account.</li>
        <li>You are responsible for maintaining the security of your account credentials.</li>
        <li>You may only create one account per person.</li>
        <li>You must not share your account with others.</li>
      </ul>

      <hr className="legal-divider" />

      {/* ── Section 4 ───────────────────────────── */}
      <h2>4. Acceptable use</h2>
      <p>You may not use Auto-Mate to:</p>
      <ul>
        <li>Send spam or unsolicited emails.</li>
        <li>Harass, threaten, or harm others.</li>
        <li>Violate any applicable local, national, or international law or regulation.</li>
        <li>Attempt to circumvent the agent&apos;s approval gates or access controls.</li>
        <li>Access another person&apos;s email or calendar without their explicit permission.</li>
        <li>Use the service for any automated bulk email sending or large-scale unsolicited outreach.</li>
        <li>Attempt to extract the system prompt, manipulate the agent into bypassing its safety rules, or otherwise abuse the AI model.</li>
      </ul>

      <hr className="legal-divider" />

      {/* ── Section 5 ───────────────────────────── */}
      <h2>5. AI limitations and disclaimer</h2>
      <div className="legal-callout">
        <p>
          <strong>Important:</strong> AI can make mistakes. The agent may occasionally misinterpret your requests, draft inaccurate information, or hallucinate facts.
        </p>
      </div>
      <ul>
        <li><strong>Always review before approving:</strong> You are responsible for carefully reviewing the approval preview before confirming any action.</li>
        <li><strong>No guarantee of accuracy:</strong> We do not guarantee the accuracy, completeness, or usefulness of research reports, email summaries, or any AI-generated output.</li>
        <li><strong>Your responsibility:</strong> We are not responsible for the consequences of any emails sent, events created, or tasks completed after you have confirmed approval.</li>
      </ul>

      <hr className="legal-divider" />

      {/* ── Section 6 ───────────────────────────── */}
      <h2>6. Service availability</h2>
      <p>
        We provide the service on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis, without uptime guarantees. We reserve the right to modify, suspend, or discontinue any feature of the service at any time without prior notice. However, we will make reasonable efforts to notify users of significant changes that could affect their workflow.
      </p>

      <hr className="legal-divider" />

      {/* ── Section 7 ───────────────────────────── */}
      <h2>7. Termination</h2>
      <p>
        You may delete your account at any time from your Account Settings. We reserve the right to suspend or terminate accounts that violate these terms, abuse the service, or pose a security risk, at our sole discretion. Upon termination, we will delete your data in accordance with our Privacy Policy.
      </p>

      <hr className="legal-divider" />

      {/* ── Section 8 ───────────────────────────── */}
      <h2>8. Liability limitation</h2>
      <p>To the maximum extent permitted by applicable law:</p>
      <ul>
        <li>Auto-Mate is provided without warranties of any kind, whether express or implied.</li>
        <li>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the service.</li>
        <li>In no event shall our total liability exceed the amount you paid us in the 12 months immediately preceding the claim (if applicable).</li>
      </ul>

      <hr className="legal-divider" />

      {/* ── Section 9 ───────────────────────────── */}
      <h2>9. Governing law</h2>
      <p>
        These Terms shall be governed and construed in accordance with the laws of <strong>{JURISDICTION}</strong>, without regard to its conflict of law provisions.
      </p>

      <hr className="legal-divider" />

      {/* ── Section 10 ──────────────────────────── */}
      <h2>10. Contact</h2>
      <p>
        If you have any questions about these Terms, please contact us at:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </article>
  );
}
