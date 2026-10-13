import Link from "next/link";
import { redirect } from "next/navigation";
import { roleLabel } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";
import CmsShell from "@/components/cms/CmsShell";
import SignOutButton from "@/components/cms/SignOutButton";
import ResendVerificationButton from "@/components/cms/ResendVerificationButton";
import RequestAccess from "@/components/account/RequestAccess";
import { ShieldAlert, Clock, MailWarning, PenLine } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Re-check from the DB — the session cookie could be from before an admin
  // approved/rejected the account, or before email was verified.
  const user = await getCurrentUser();
  if (!user) redirect("/cms/login");

  if (!user.emailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="glass-strong max-w-md rounded-glass p-8 text-center">
          <MailWarning size={32} className="mx-auto text-signal" />
          <h1 className="mt-4 font-display text-xl font-bold text-white">Verify your email</h1>
          <p className="mt-2 text-sm text-white/60">
            We sent a verification link to <span className="text-white/80">{user.email}</span>.
            Confirm it to unlock the dashboard.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <ResendVerificationButton />
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  // Proofreader-only account: offer writer access on the same account.
  if (user.writer === null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="glass-strong max-w-md rounded-glass p-8 text-center">
          <PenLine size={32} className="mx-auto text-signal" />
          <h1 className="mt-4 font-display text-xl font-bold text-white">Want to write too?</h1>
          <p className="mt-2 text-sm text-white/60">
            Your account is set up for proofreading. Ask for writer access and, once an admin approves it, you can
            sign in here with the same email and password to write and submit stories.
          </p>
          <div className="mt-6">
            <RequestAccess kinds={["NEWS_EDITOR", "ARTICLE_EDITOR"]} />
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 border-t border-white/10 pt-5">
            {user.proofreader === "APPROVED" && (
              <Link href="/proofread" className="focus-ring text-sm font-semibold text-signal hover:underline">
                Go to the proofreading desk
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  if (user.writer !== "APPROVED") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="glass-strong max-w-md rounded-glass p-8 text-center">
          {user.status === "REJECTED" ? (
            <ShieldAlert size={32} className="mx-auto text-red-400" />
          ) : (
            <Clock size={32} className="mx-auto text-signal" />
          )}
          <h1 className="mt-4 font-display text-xl font-bold text-white">
            {user.status === "REJECTED" ? "Account not approved" : "Pending admin approval"}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {user.status === "REJECTED"
              ? "An admin has declined this account. Contact your editorial admin if you believe this is a mistake."
              : `Your ${roleLabel(user.role)} access is waiting on admin approval before you can write. You'll get an email when it's approved.`}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            {user.proofreader === "APPROVED" && (
              <Link href="/proofread" className="focus-ring text-sm font-semibold text-signal hover:underline">
                Go to the proofreading desk
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <CmsShell user={{ name: user.name, email: user.email, role: user.role, proofreader: user.proofreader }}>
      {children}
    </CmsShell>
  );
}
