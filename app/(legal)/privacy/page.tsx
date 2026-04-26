import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Auto-Mate",
  description:
    "Learn exactly what data Auto-Mate collects, why we collect it, and how we keep it secure.",
};

const EFFECTIVE_DATE = "26 April 2026";
const CONTACT_EMAIL = "privacy@auto-mate.app"; // TODO: replace with real address
const APP_URL = "https://auto-mate.app"; // TODO: replace with production URL

export default function PrivacyPage() {
  return (
    <article>
      {/* ── Page header ─────────────────────────── */}
      <h1>Privacy Policy</h1>
      <p className="legal-meta">Effective date: {EFFECTIVE_DATE}</p>

      {/* ── Introduction ────────────────────────── */}
      <p>
        Auto-Mate is an AI-powered personal assistant that reads your email,
        manages your calendar, and remembers context across conversations — all
        via a conversational interface on Telegram. Because of the sensitive
        nature of what Auto-Mate can access on your behalf, we take privacy
        seriously. This policy tells you exactly what data we collect, why, and
        how we handle it.
      </p>
      <p>
        By creating an account and connecting your integrations, you agree to
        the practices described here. If you have questions at any point, email
        us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <hr className="legal-divider" />

      {/* ── Section 1 ───────────────────────────── */}
      <h2>1. Who we are</h2>
      <p>
        Auto-Mate is operated as a personal productivity tool available at{" "}
        <a href={APP_URL} target="_blank" rel="noopener noreferrer">
          {APP_URL}
        </a>
        . References to &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
        &ldquo;Auto-Mate&rdquo; in this policy refer to its operator.
      </p>

      <hr className="legal-divider" />

      {/* ── Section 2 ───────────────────────────── */}
      <h2>2. What we collect and why</h2>
      <p>
        We only collect data that is necessary for the service to function. The
        table below lists every category, what specifically is stored, and how
        long we keep it.
      </p>

      {/* 2A — Account */}
      <h3>A. Account information</h3>
      <p>
        When you sign in, your authentication is handled by{" "}
        <strong>Clerk</strong>. We store the following in our database:
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Why we store it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Email address</td>
            <td>To identify your account and for service communications</td>
          </tr>
          <tr>
            <td>Display name</td>
            <td>To personalise agent responses</td>
          </tr>
          <tr>
            <td>Clerk user ID</td>
            <td>Internal account reference; links all your data together</td>
          </tr>
          <tr>
            <td>Subscription status</td>
            <td>To determine which features you have access to</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Retention:</strong> Account data is kept for as long as your
        account exists. Deleting your account removes all associated records.
      </p>

      {/* 2B — Google */}
      <h3>B. Google account data (Gmail &amp; Google Calendar)</h3>
      <p>
        When you connect Gmail or Google Calendar, you authorise Auto-Mate via
        Google OAuth 2.0. We request the following scopes:
      </p>

      <h3>Gmail scopes</h3>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Scope</th>
            <th>What it enables</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>gmail.readonly</code>
            </td>
            <td>
              Read email subjects, senders, recipients, and body content when
              you ask the agent to read or summarise emails
            </td>
          </tr>
          <tr>
            <td>
              <code>gmail.modify</code>
            </td>
            <td>
              Mark emails as read, move them to labels, or apply filters on
              your behalf
            </td>
          </tr>
          <tr>
            <td>
              <code>gmail.compose</code>
            </td>
            <td>
              Draft and send emails on your behalf when you explicitly instruct
              the agent to do so
            </td>
          </tr>
        </tbody>
      </table>

      <h3>Google Calendar scopes</h3>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Scope</th>
            <th>What it enables</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>calendar.readonly</code>
            </td>
            <td>
              Read your calendar events (titles, times, attendees) when you ask
              about your schedule
            </td>
          </tr>
          <tr>
            <td>
              <code>calendar.events</code>
            </td>
            <td>
              Create, update, and delete calendar events on your behalf when
              you explicitly instruct the agent to do so
            </td>
          </tr>
        </tbody>
      </table>

      <div className="legal-callout">
        <p>
          <strong>Important:</strong> Auto-Mate only reads your email or
          calendar when you send a message that requires it. We do not run
          background scans or process your inbox automatically without your
          instruction.
        </p>
      </div>

      <p>
        <strong>What we store from Gmail and Calendar:</strong> Email and
        calendar content accessed during an agent action is used to generate a
        response to you. It is also stored in our episodic memory system as a
        structured record that includes: a one-sentence LLM-generated summary
        of the action, the full raw payload of the action (e.g. the email
        object or calendar event object), and a vector embedding of the summary
        used for semantic search. This allows the agent to recall past actions
        when you reference them later.
      </p>

      {/* 2C — Telegram */}
      <h3>C. Telegram account data</h3>
      <p>
        When you link your Telegram account to Auto-Mate, we store your{" "}
        <strong>Telegram chat ID</strong> and <strong>Telegram username</strong>
        . These are used solely to route agent responses back to your Telegram
        account.
      </p>

      {/* 2D — Memory */}
      <h3>D. Conversation and memory data</h3>
      <p>
        Auto-Mate maintains three layers of memory to provide a personalised
        and context-aware experience:
      </p>

      <ul>
        <li>
          <strong>Episodic memory:</strong> After each significant agent action (sending an email, creating a calendar event), we store an episode record containing the event type, a summary, the raw data payload, and an embedding.
        </li>
        <li>
          <strong>Semantic memory:</strong> When you share information with the agent (e.g., your name, location, preferences), the agent extracts and stores structured facts.
        </li>
        <li>
          <strong>Journal:</strong> You can create journal entries through the agent, which are stored as structured records.
        </li>
      </ul>

      {/* 2E — Research */}
      <h3>E. Research data</h3>
      <p>
        When you use the <code>/research</code> command, your research topic is
        sent to our third-party services to execute the research
        pipeline. The resulting research report is delivered to your Telegram account.
      </p>

      <hr className="legal-divider" />

      {/* ── Section 3 ───────────────────────────── */}
      <h2>3. How we use AI and third-party services</h2>
      <p>
        This section explicitly names every third-party service that receives user data.
      </p>

      <h3>Anthropic (Claude AI)</h3>
      <ul>
        <li>Your messages are processed by Anthropic&apos;s Claude API.</li>
        <li>
          Anthropic&apos;s privacy policy:{" "}
          <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">
            https://www.anthropic.com/privacy
          </a>
        </li>
      </ul>

      <h3>OpenRouter / Google (research feature)</h3>
      <ul>
        <li>Research queries are processed via OpenRouter.</li>
        <li>Used only when you explicitly request deep research.</li>
      </ul>

      <h3>Tavily (web search)</h3>
      <ul>
        <li>Search queries are sent to Tavily&apos;s API for web search.</li>
        <li>Your search query (not your personal data) is sent.</li>
      </ul>

      <h3>Neon (database)</h3>
      <ul>
        <li>Your data is stored in Neon&apos;s PostgreSQL database.</li>
        <li>Data is encrypted at rest.</li>
      </ul>

      <h3>Upstash (session management)</h3>
      <ul>
        <li>Your active session state is temporarily stored in Upstash Redis.</li>
        <li>Sessions expire after 2 hours of inactivity.</li>
      </ul>

      <h3>Clerk (authentication)</h3>
      <ul>
        <li>Account authentication is handled by Clerk.</li>
        <li>
          Clerk&apos;s privacy policy:{" "}
          <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer">
            https://clerk.com/privacy
          </a>
        </li>
      </ul>

      <h3>Vercel (hosting)</h3>
      <ul>
        <li>The application is hosted on Vercel.</li>
        <li>
          Vercel&apos;s privacy policy:{" "}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
            https://vercel.com/legal/privacy-policy
          </a>
        </li>
      </ul>

      <hr className="legal-divider" />

      {/* ── Section 4 ───────────────────────────── */}
      <h2>4. What we do NOT do</h2>
      <ul>
        <li>We do not sell your personal data to third parties.</li>
        <li>We do not use your email content for AI training.</li>
        <li>We do not share your data with advertisers.</li>
        <li>We do not read your emails unless you ask the agent to.</li>
      </ul>

      <hr className="legal-divider" />

      {/* ── Section 5 ───────────────────────────── */}
      <h2>5. Your rights and controls</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access all data we hold about you (Settings &gt; Data)</li>
        <li>Delete specific memories and facts (Settings &gt; Memory)</li>
        <li>Delete your account and all associated data (Settings &gt; Account)</li>
        <li>Disconnect any integration at any time (Settings &gt; Integrations)</li>
        <li>Request a full export of your data (contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>)</li>
      </ul>

      <h3>For GDPR users (EU/EEA)</h3>
      <p>
        You additionally have the right to data portability, the right to restrict processing, and the right to object to processing. Contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to exercise these rights.
      </p>

      <hr className="legal-divider" />

      {/* ── Section 6 ───────────────────────────── */}
      <h2>6. Data security</h2>
      <ul>
        <li>OAuth tokens are encrypted at rest using AES-256-GCM.</li>
        <li>All data is transmitted over HTTPS.</li>
        <li>We use Clerk for secure authentication.</li>
        <li>We do not log your email or calendar content in our servers.</li>
      </ul>

      <hr className="legal-divider" />

      {/* ── Section 7 ───────────────────────────── */}
      <h2>7. Data retention</h2>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Data type</th>
            <th>Retention period</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account data</td>
            <td>Until account deletion</td>
          </tr>
          <tr>
            <td>OAuth tokens</td>
            <td>Until integration disconnected</td>
          </tr>
          <tr>
            <td>Agent activity logs</td>
            <td>90 days</td>
          </tr>
          <tr>
            <td>Memory and facts</td>
            <td>Until you delete them</td>
          </tr>
          <tr>
            <td>Journal entries</td>
            <td>Until you delete them</td>
          </tr>
          <tr>
            <td>Session data</td>
            <td>2 hours</td>
          </tr>
        </tbody>
      </table>

      <hr className="legal-divider" />

      {/* ── Section 8 ───────────────────────────── */}
      <h2>8. Changes to this policy</h2>
      <p>
        We will notify you of material changes via email or in-app notification. Continued use after changes = acceptance.
      </p>

      <hr className="legal-divider" />

      {/* ── Section 9 ───────────────────────────── */}
      <h2>9. Contact</h2>
      <p>
        For privacy questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <p>
        For data deletion requests: <Link href="/data-deletion">Delete My Data</Link>
      </p>
    </article>
  );
}
