import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using the Buraaq Times website, its comments and its AI reading and resume tools.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "7 October 2026";
const CONTACT_EMAIL = "theburaaqtimes@gmail.com";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated={UPDATED}
      intro={
        <p>
          These terms apply when you use the Buraaq Times website. By using the site you agree to them. If you
          don&apos;t agree, please don&apos;t use the site.
        </p>
      }
    >
      <h2>1. Our content</h2>
      <p>
        The news, articles, images and design on this site belong to Buraaq Times or to their respective owners. You
        may read, share links to, and quote short extracts with clear credit and a link back. Please don&apos;t
        republish full articles or images without our written permission.
      </p>
      <p>
        We work to be accurate, but content is provided for general information and may contain errors or become out of
        date. It is not legal, financial, medical or other professional advice. If you spot a mistake, tell us and we
        will review it.
      </p>

      <h2>2. Comments</h2>
      <p>When you post a comment, you agree that it will not:</p>
      <ul>
        <li>be unlawful, defamatory, hateful, harassing or threatening;</li>
        <li>contain spam, advertising or misleading links;</li>
        <li>share someone else&apos;s personal information without permission;</li>
        <li>infringe anyone&apos;s copyright or other rights.</li>
      </ul>
      <p>
        You keep ownership of what you write, but you allow us to display it on the site. We moderate comments and may
        decline, edit for length, or remove any comment at our discretion.
      </p>

      <h2>3. AI tools</h2>
      <p>
        Features such as word meanings, summaries, further-reading suggestions and the AI Resume Builder are generated
        automatically and can be inaccurate or incomplete. Check anything important — especially a resume before you
        send it. You are responsible for the information you enter and for how you use the results.
      </p>

      <h2>4. Advertising and links</h2>
      <p>
        The site may show advertising provided by third parties such as Google, and links to other websites. We
        don&apos;t control and aren&apos;t responsible for advertisers&apos; products or for the content of other
        sites. Advertising does not influence our editorial decisions.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        Please don&apos;t attempt to disrupt the site, access accounts or areas you aren&apos;t authorised to use,
        scrape it at a volume that affects other readers, or artificially click or generate views on advertisements.
      </p>

      <h2>6. Liability</h2>
      <p>
        The site is provided &ldquo;as is&rdquo;. To the extent permitted by law, Buraaq Times is not liable for any
        loss arising from your use of the site or reliance on its content.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update these terms from time to time. The &ldquo;Last updated&rdquo; date shows the latest version, and
        continuing to use the site means you accept it.
      </p>

      <h2>8. Governing law</h2>
      <p>These terms are governed by the laws of Pakistan.</p>

      <h2>9. Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or visit our{" "}
        <Link href="/contact">contact page</Link>. See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
