import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What information Buraaq Times collects, how it is used, and the choices you have — including advertising cookies.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "7 October 2026";
const CONTACT_EMAIL = "theburaaqtimes@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <p>
          This policy explains what information Buraaq Times (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when you use
          this website, why, who we share it with, and the choices you have. You can read our news and articles without
          creating an account.
        </p>
      }
    >
      <h2>1. Information we collect</h2>
      <p>
        <strong>Information you give us.</strong>
      </p>
      <ul>
        <li>
          <strong>Comments:</strong> your name, email address and comment. Your name and comment are shown publicly
          once approved; your email address is never published.
        </li>
        <li>
          <strong>Contact form:</strong> your name, email address and message, which are delivered to our editorial
          inbox so we can reply.
        </li>
        <li>
          <strong>Daily briefing (newsletter):</strong> your email address. You only start receiving emails after you
          click the confirmation link we send, and every email has an unsubscribe link. We also record when you
          confirmed and when we last emailed you.
        </li>
        <li>
          <strong>AI Resume Builder:</strong> what you type is saved in your own browser so you don&apos;t lose your
          draft. If you choose &ldquo;Write my resume&rdquo;, your experience, education, projects and skills are sent to
          an AI service to write the text. Your name and contact details are not sent, and we don&apos;t store resumes.
        </li>
      </ul>
      <p>
        <strong>Information collected automatically.</strong>
      </p>
      <ul>
        <li>
          <strong>Technical information</strong> such as your IP address, browser type and the pages you request. Our
          hosting provider records this in server logs, and we use IP addresses briefly to prevent spam and abuse.
        </li>
        <li>
          <strong>Reading activity</strong> such as article view counts and the Like and Save buttons. These are
          linked to a random identifier stored in a cookie, not to your name or email.
        </li>
      </ul>

      <h2>2. Cookies and similar technologies</h2>
      <p>We use a small number of cookies and browser storage items of our own:</p>
      <ul>
        <li>
          <code>bt_vid</code> — a random identifier that remembers which articles you liked or saved. It lasts up to
          two years and contains no personal information.
        </li>
        <li>
          <code>bt_session</code> and <code>bt_csrf</code> — set only for our editors and proofreaders when they sign in,
          to keep them signed in securely.
        </li>
        <li>
          Your light/dark theme choice and any Resume Builder draft are saved in your browser&apos;s local storage and
          never sent to us.
        </li>
      </ul>
      <p>
        Advertising partners, including Google, also set cookies — see section 4. You can block or delete cookies in
        your browser settings; the site still works, but Like/Save may not remember your choices.
      </p>

      <h2>3. How we use information</h2>
      <ul>
        <li>to publish and run the website and its reading tools;</li>
        <li>to moderate comments and reply to messages you send us;</li>
        <li>to send the daily briefing to people who signed up for it;</li>
        <li>to count views and understand which stories readers find useful;</li>
        <li>to protect the site against spam, abuse and security threats;</li>
        <li>to show advertising that helps keep Buraaq Times free to read, where ads are shown.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>4. Advertising</h2>
      <p>
        This site may show advertisements served by Google AdSense. Where it does, Google and other third-party vendors use cookies to serve ads
        based on your previous visits to this website and other websites. Google&apos;s use of advertising cookies
        allows it and its partners to show you ads based on your visits to this and other sites on the internet.
      </p>
      <ul>
        <li>
          You can turn off personalised advertising from Google in{" "}
          <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">
            My Ad Center
          </a>{" "}
          (or{" "}
          <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">
            Google Ads Settings
          </a>
          ).
        </li>
        <li>
          You can opt out of some third-party vendors&apos; use of cookies for personalised advertising at{" "}
          <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
            aboutads.info
          </a>
          .
        </li>
        <li>
          Learn{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            how Google uses information from sites that use its services
          </a>{" "}
          and{" "}
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
            how Google uses advertising cookies
          </a>
          .
        </li>
      </ul>
      <p>
        Visitors in the European Economic Area, the United Kingdom and Switzerland are asked for consent before
        personalised ads are shown, and can change that choice at any time from the privacy link that appears with the
        consent message.
      </p>

      <h2>5. Service providers we share information with</h2>
      <p>We use trusted providers to run the site. They process information only to provide their service to us:</p>
      <ul>
        <li>Vercel — website hosting and file storage;</li>
        <li>Supabase — our database (articles, comments, accounts);</li>
        <li>Upstash — short-lived records used to limit spam and abuse;</li>
        <li>
          Google Gemini — powers the AI reading tools (word meanings, summaries and further reading use the text of the
          article you are reading) and the AI Resume Builder;
        </li>
        <li>our email provider — delivers contact-form messages, account emails and the daily briefing;</li>
        <li>Google AdSense — advertising, as described above.</li>
      </ul>
      <p>We may also disclose information if required by law or to protect our rights and the safety of our users.</p>

      <h2>6. How long we keep information</h2>
      <p>
        Comments stay until they are removed by us or at your request. Newsletter addresses are kept while you are
        subscribed; after you unsubscribe we keep a record that you did, so we don&apos;t email you again, and delete
        it if you ask. Contact-form messages stay in our inbox for as
        long as needed to deal with your enquiry. Rate-limiting records expire within minutes. Server logs are kept by
        our hosting provider for a limited period.
      </p>

      <h2>7. Your choices and rights</h2>
      <p>
        You can ask us to access, correct or delete personal information we hold about you — for example a comment you
        posted — by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Depending on where you live, you
        may have additional rights under local law, such as the right to object to processing or to complain to a data
        protection authority.
      </p>

      <h2>8. Children</h2>
      <p>
        Buraaq Times is not directed at children under 13, and we do not knowingly collect personal information from
        them. If you believe a child has sent us personal information, contact us and we will delete it.
      </p>

      <h2>9. Security</h2>
      <p>
        We use reasonable measures to protect information, including encrypted connections and restricted access to
        our systems. No method of transmission or storage is completely secure.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy as the site changes. The &ldquo;Last updated&rdquo; date above shows when it last
        changed.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about this policy? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or use our{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
