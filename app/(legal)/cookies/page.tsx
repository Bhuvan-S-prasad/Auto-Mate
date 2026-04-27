import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Auto-Mate",
  description: "Information about how Auto-Mate uses cookies.",
};

export default function CookiePolicyPage() {
  return (
    <article>
      <h1>Cookie Policy</h1>
      <p className="legal-meta">Effective date: 26 April 2026</p>

      <h2>What cookies are</h2>
      <p>
        Cookies are small text files that are placed on your computer or mobile
        device when you visit a website. They are widely used to make websites
        work more efficiently and provide information to the owners of the site.
      </p>

      <h2>Cookies we use</h2>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Purpose</th>
            <th>Duration</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>__clerk_session</code>
            </td>
            <td>Authentication & session management</td>
            <td>Session</td>
            <td>Strictly necessary</td>
          </tr>
          <tr>
            <td>
              <code>google_oauth_state</code>
            </td>
            <td>Security (CSRF protection) during Google sign-in</td>
            <td>Temporary (deleted after flow)</td>
            <td>Strictly necessary</td>
          </tr>
        </tbody>
      </table>

      <ul>
        <li>We <strong>do not</strong> use tracking cookies.</li>
        <li>We <strong>do not</strong> use advertising cookies.</li>
      </ul>

      <h2>How to control cookies</h2>
      <p>
        Most web browsers allow some control of most cookies through the browser
        settings. To find out more about cookies, including how to see what
        cookies have been set, visit <a href="https://www.aboutcookies.org" target="_blank" rel="noopener noreferrer">aboutcookies.org</a> or <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer">allaboutcookies.org</a>.
      </p>
      <p>
        Please note that because our cookies are strictly necessary for the
        service to function (e.g., keeping you logged in), disabling them will
        prevent you from using Auto-Mate.
      </p>
    </article>
  );
}
