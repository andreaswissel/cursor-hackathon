import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground">
            Last updated: February 12, 2026
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>
            Product OS (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a
            multi-agent AI product management platform operated by{" "}
            <strong>
              b25 Ventures UG (haftungsbeschr&auml;nkt)
            </strong>
            , Kaltenberg 3, 63776 M&ouml;mbris, Germany
            (&quot;Controller&quot;). This Privacy Policy explains how we
            collect, use, disclose, and safeguard your personal information when
            you use our platform at{" "}
            <strong>productos.dev</strong> and related services (collectively,
            the &quot;Service&quot;).
          </p>
          <p>
            By using the Service, you agree to the collection and use of
            information in accordance with this policy. If you do not agree, you
            should not use the Service.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            2. Information We Collect
          </h2>

          <h3 className="text-lg font-medium mt-6 mb-3">
            2.1 Account Information
          </h3>
          <p>When you register for the Service, we collect:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Email address</strong> &mdash; required for authentication
              and communication
            </li>
            <li>
              <strong>Display name</strong> &mdash; shown to team members
            </li>
            <li>
              <strong>Profile picture URL</strong> &mdash; sourced from Google
              OAuth if you sign in with Google
            </li>
            <li>
              <strong>Password hash</strong> &mdash; if you use email/password
              authentication (we never store plaintext passwords)
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">
            2.2 Team & Collaboration Data
          </h3>
          <p>
            When you create or join teams, we store team names, member roles,
            and invite tokens. This enables multi-user collaboration and
            role-based access control.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            2.3 Session & Product Data
          </h3>
          <p>
            The core of the Service involves processing your product ideas
            through AI agents. We collect and store:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Product ideas, session descriptions, and context you provide</li>
            <li>
              OKRs, customer feedback, and strategic inputs you connect via
              integrations
            </li>
            <li>AI-generated outputs (specs, strategies, analyses, documents)</li>
            <li>Chat messages between you and AI agents</li>
            <li>Agent execution logs and status history</li>
            <li>
              Artifacts created in Flow Mode (plans, reviews, changelogs, etc.)
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">
            2.4 Video & File Uploads
          </h3>
          <p>
            If you use the documentation feature, we store uploaded video files
            and associated metadata (filename, MIME type, size, duration) on our
            servers for processing.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            2.5 Integration Data
          </h3>
          <p>
            When you connect third-party services (Slack, Google Drive, Jira,
            Notion, Airtable, Intercom), we store:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              OAuth access and refresh tokens (used solely to maintain the
              connection)
            </li>
            <li>Workspace and account identifiers</li>
            <li>
              Synced data (OKRs, feedback, tickets, documents) cached for use as
              AI context
            </li>
          </ul>
          <p>
            You can disconnect integrations at any time, which revokes our
            access and deletes cached data.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            2.6 API Keys You Provide
          </h3>
          <p>
            You may optionally provide your own API keys for Anthropic, OpenAI,
            or Google Gemini. These are stored encrypted in our database and used
            exclusively to make AI requests on your behalf. We never share your
            keys with other users or third parties.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            2.7 Automatically Collected Information
          </h3>
          <p>We collect minimal technical data to operate the Service:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Session usage counts (for rate limiting)</li>
            <li>Prompt counts per session</li>
          </ul>
          <p>
            We do <strong>not</strong> use third-party analytics services (no
            Google Analytics, Segment, or tracking pixels). We do{" "}
            <strong>not</strong> set cookies &mdash; authentication is handled
            via JWT tokens stored in your browser&apos;s local storage.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            3. Legal Basis for Processing
          </h2>
          <p>
            Under the EU General Data Protection Regulation (GDPR), we process
            your personal data on the following legal bases:
          </p>
          <table className="w-full border-collapse border border-border text-sm my-4">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border px-3 py-2 text-left">
                  Processing Activity
                </th>
                <th className="border border-border px-3 py-2 text-left">
                  Legal Basis
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-3 py-2">
                  Account creation &amp; authentication
                </td>
                <td className="border border-border px-3 py-2">
                  Art. 6(1)(b) GDPR &mdash; performance of a contract
                </td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2">
                  AI agent processing of your product ideas
                </td>
                <td className="border border-border px-3 py-2">
                  Art. 6(1)(b) GDPR &mdash; performance of a contract
                </td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2">
                  Integration data sync (Slack, Jira, etc.)
                </td>
                <td className="border border-border px-3 py-2">
                  Art. 6(1)(a) GDPR &mdash; your consent
                </td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2">
                  Transactional emails (invites, account changes)
                </td>
                <td className="border border-border px-3 py-2">
                  Art. 6(1)(b) GDPR &mdash; performance of a contract
                </td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2">
                  Rate limiting &amp; usage counts
                </td>
                <td className="border border-border px-3 py-2">
                  Art. 6(1)(f) GDPR &mdash; legitimate interest (service
                  security)
                </td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2">
                  Aggregated usage metrics
                </td>
                <td className="border border-border px-3 py-2">
                  Art. 6(1)(f) GDPR &mdash; legitimate interest (service
                  improvement)
                </td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2">
                  Waitlist data collection
                </td>
                <td className="border border-border px-3 py-2">
                  Art. 6(1)(a) GDPR &mdash; your consent
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Where processing is based on consent, you may withdraw your consent
            at any time by contacting us. Withdrawal does not affect the
            lawfulness of processing carried out before the withdrawal.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            4. How We Use Your Information
          </h2>

          <h3 className="text-lg font-medium mt-6 mb-3">
            4.1 Service Provision
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Authenticate your identity and manage your account and team
              memberships
            </li>
            <li>
              Process your product ideas through our AI agent pipeline
              (Discovery, Strategy, Spec, GTM, Product Marketing)
            </li>
            <li>
              Stream real-time updates to your browser via Server-Sent Events
              (SSE)
            </li>
            <li>
              Sync and cache data from your connected integrations to provide AI
              context
            </li>
            <li>Store and serve generated outputs, documents, and artifacts</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">4.2 Communication</h3>
          <p>
            We may use your email address to send transactional notifications
            (team invites, account changes). We do not send marketing emails
            without your explicit consent.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            4.3 Service Improvement
          </h3>
          <p>
            We use aggregated, non-identifiable usage metrics (session counts,
            feature adoption) to improve the Service. We do not build individual
            behavioral profiles for commercial purposes.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            5. AI Processing & Third-Party AI Providers
          </h2>
          <p>
            This is central to how our Service works. When you run a session,
            the following data may be sent to AI providers for processing:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your product idea and session description</li>
            <li>
              Context you&apos;ve provided or connected (OKRs, feedback,
              strategy documents)
            </li>
            <li>Outputs from previous agents in the pipeline</li>
            <li>Chat messages in Flow Mode conversations</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">
            5.1 AI Providers We Use
          </h3>
          <table className="w-full border-collapse border border-border text-sm my-4">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border px-3 py-2 text-left">
                  Provider
                </th>
                <th className="border border-border px-3 py-2 text-left">
                  Models
                </th>
                <th className="border border-border px-3 py-2 text-left">
                  Data Usage Policy
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-3 py-2">Anthropic</td>
                <td className="border border-border px-3 py-2">
                  Claude Sonnet 4
                </td>
                <td className="border border-border px-3 py-2">
                  API inputs are not used to train models
                </td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2">OpenAI</td>
                <td className="border border-border px-3 py-2">GPT-4o</td>
                <td className="border border-border px-3 py-2">
                  API inputs are not used to train models (by default)
                </td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2">
                  Google (Gemini)
                </td>
                <td className="border border-border px-3 py-2">
                  Gemini 1.5 Pro
                </td>
                <td className="border border-border px-3 py-2">
                  API inputs are not used to train models
                </td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-lg font-medium mt-6 mb-3">
            5.2 What We Do NOT Send to AI Providers
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your email address or account credentials</li>
            <li>OAuth tokens or API keys</li>
            <li>Password hashes</li>
            <li>
              Payment information (we do not currently collect payment data)
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">
            5.3 No Model Training
          </h3>
          <p>
            All AI provider API usage is covered by their respective business
            API terms, which prohibit using your data to train or improve their
            general-purpose models. We do not train any AI models on your data.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            6. Data Sharing & Disclosure
          </h2>
          <p>
            <strong>
              We do not sell your personal information to third parties.
            </strong>
          </p>
          <p>We may share your information only in these circumstances:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>AI Providers</strong> &mdash; As described in Section 5,
              to process your product sessions
            </li>
            <li>
              <strong>Infrastructure Providers</strong> &mdash; Our hosting
              provider (Railway) and database provider (Neon) process your data
              as part of operating the Service
            </li>
            <li>
              <strong>Team Members</strong> &mdash; Data within a team is
              visible to all members of that team, according to their role
              permissions
            </li>
            <li>
              <strong>Legal Requirements</strong> &mdash; We may disclose data
              if required by law, court order, or governmental authority
            </li>
            <li>
              <strong>Business Transfers</strong> &mdash; In the event of a
              merger, acquisition, or sale of assets, your data may be
              transferred as part of the transaction. We will notify you before
              your data becomes subject to a different privacy policy.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            7. Data Security
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              All data in transit is encrypted via TLS (HTTPS). Our database
              connections use encrypted channels.
            </li>
            <li>
              Passwords are hashed with bcrypt before storage. We never store
              plaintext passwords.
            </li>
            <li>
              User-provided API keys are stored encrypted in the database.
            </li>
            <li>
              OAuth tokens for integrations are stored securely and are only used
              for their intended integration purpose.
            </li>
            <li>
              JWT authentication tokens expire after 7 days and are scoped to
              your user identity and active team.
            </li>
            <li>
              Access to production infrastructure is restricted to authorized
              personnel on a need-to-know basis.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            8. Data Retention
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Account data</strong> is retained for as long as your
              account is active.
            </li>
            <li>
              <strong>Session data</strong> (product ideas, AI outputs, chat
              messages) is retained until you delete the session or your account.
            </li>
            <li>
              <strong>Integration data</strong> is cached and refreshed
              periodically. Disconnecting an integration deletes cached data.
            </li>
            <li>
              <strong>Video uploads</strong> are retained for as long as the
              associated documentation session exists.
            </li>
            <li>
              Upon account deletion, we will delete your personal data within 30
              days, except where retention is required by law.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            9. Multi-Tenant Data Isolation
          </h2>
          <p>
            Product OS is a multi-tenant platform. Your data is logically
            isolated by team:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Sessions, projects, and integrations are scoped to teams. Members
              of one team cannot access another team&apos;s data.
            </li>
            <li>
              Team membership is managed via invitations with expiring tokens and
              role-based access control (owner, admin, member).
            </li>
            <li>
              If you belong to multiple teams, data is kept separate between
              them.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            10. Your Rights & Choices
          </h2>
          <p>
            Depending on your jurisdiction, you may have the following rights:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Access</strong> &mdash; Request a copy of the personal data
              we hold about you
            </li>
            <li>
              <strong>Rectification</strong> &mdash; Request correction of
              inaccurate personal data
            </li>
            <li>
              <strong>Erasure</strong> &mdash; Request deletion of your personal
              data
            </li>
            <li>
              <strong>Portability</strong> &mdash; Request an export of your data
              in a portable format
            </li>
            <li>
              <strong>Restriction</strong> &mdash; Request that we limit
              processing of your data
            </li>
            <li>
              <strong>Objection</strong> &mdash; Object to processing based on
              legitimate interests
            </li>
            <li>
              <strong>Withdraw consent</strong> &mdash; Where processing is based
              on consent, you may withdraw it at any time
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact us at the address below. We
            will respond within 30 days.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            10.1 Account-Level Controls
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              You can delete individual sessions and their associated data at any
              time
            </li>
            <li>
              You can disconnect third-party integrations to stop data syncing
              and remove cached data
            </li>
            <li>
              You can remove your own API keys from your account settings
            </li>
            <li>
              You can choose which AI provider processes your data (Anthropic,
              OpenAI, or Google)
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            11. International Data Transfers
          </h2>
          <p>
            Our Service infrastructure and AI providers may process data in
            jurisdictions outside your country of residence, including the United
            States. When data is transferred internationally, we ensure
            appropriate safeguards are in place in accordance with applicable
            data protection laws.
          </p>
          <p>
            For users in the European Economic Area (EEA), transfers to
            countries without an adequacy decision are covered by Standard
            Contractual Clauses as outlined in our Data Processing Agreement.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            12. Data Processing Agreement
          </h2>
          <p>
            For organizations requiring a formal Data Processing Agreement (DPA)
            under GDPR Article 28, we provide a comprehensive DPA that covers:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Standard Contractual Clauses for international transfers</li>
            <li>Sub-processor governance and notification procedures</li>
            <li>
              Data breach notification commitments (2 hours for high-risk
              incidents)
            </li>
            <li>
              Data subject rights implementation with defined response times
            </li>
            <li>EU AI Act compliance controls</li>
            <li>Audit rights and compliance monitoring</li>
          </ul>
          <p>
            Contact us to request a copy of our DPA.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            13. Children&apos;s Privacy
          </h2>
          <p>
            The Service is not directed at individuals under the age of 16. We
            do not knowingly collect personal information from children. If you
            become aware that a child has provided us with personal data, please
            contact us and we will take steps to delete such information.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            14. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. When we make
            material changes, we will notify you by updating the &quot;Last
            updated&quot; date at the top of this page. For significant changes,
            we may provide additional notice via email or an in-app
            notification. We encourage you to review this policy periodically.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">15. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise
            your data rights, contact us at:
          </p>
          <ul className="list-none pl-0 space-y-1 mt-4">
            <li>
              <strong>b25 Ventures UG (haftungsbeschr&auml;nkt)</strong>
            </li>
            <li>Kaltenberg 3, 63776 M&ouml;mbris, Germany</li>
            <li>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:hello@andreaswissel.com"
                className="underline hover:text-foreground"
              >
                hello@andreaswissel.com
              </a>
            </li>
            <li>
              <strong>Gesch&auml;ftsf&uuml;hrer:</strong> Andreas Wissel
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
