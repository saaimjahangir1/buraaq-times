import type { Metadata } from "next";
import { MailX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import NewsletterNotice from "@/components/newsletter/NewsletterNotice";
import UnsubscribeButton from "@/components/newsletter/UnsubscribeButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? "";
  const sub = token.length >= 20 ? await prisma.subscriber.findUnique({ where: { token } }) : null;

  if (!sub) {
    return (
      <NewsletterNotice icon={<MailX size={22} />} title="This link didn't work">
        <p>We couldn&apos;t find that subscription. If you keep getting emails, reply to one and we&apos;ll remove you.</p>
      </NewsletterNotice>
    );
  }
  if (sub.status === "UNSUBSCRIBED") {
    return (
      <NewsletterNotice icon={<MailX size={22} />} title="Already unsubscribed">
        <p>
          <strong>{sub.email}</strong> won&apos;t get any more emails from us.
        </p>
      </NewsletterNotice>
    );
  }
  return (
    <NewsletterNotice icon={<MailX size={22} />} title="Unsubscribe from the daily briefing?">
      <p>
        <strong>{sub.email}</strong> will stop getting our morning emails.
      </p>
      <UnsubscribeButton token={token} />
    </NewsletterNotice>
  );
}
