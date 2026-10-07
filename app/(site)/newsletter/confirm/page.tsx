import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { confirmSubscription } from "@/lib/newsletter";
import NewsletterNotice from "@/components/newsletter/NewsletterNotice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirm subscription", robots: { index: false, follow: false } };

export default async function ConfirmPage({ searchParams }: { searchParams: { token?: string } }) {
  const result = await confirmSubscription(searchParams.token ?? "");
  if (!result.ok) {
    return (
      <NewsletterNotice icon={<XCircle size={22} />} title="This link didn't work">
        <p>
          It may be old, or you may have unsubscribed since. Sign up again from the box at the bottom of our home page.
        </p>
      </NewsletterNotice>
    );
  }
  return (
    <NewsletterNotice icon={<CheckCircle2 size={22} />} title="You're subscribed">
      <p>
        Thanks — <strong>{result.email}</strong> will get the daily briefing each morning we publish. Every email has an
        unsubscribe link at the bottom.
      </p>
    </NewsletterNotice>
  );
}
