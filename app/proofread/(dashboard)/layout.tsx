import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import RequestAccess from "@/components/account/RequestAccess";
import ProofreadShell from "@/components/proofread/ProofreadShell";
import SignOutButton from "@/components/cms/SignOutButton";
import ResendVerificationButton from "@/components/cms/ResendVerificationButton";
import { ShieldAlert, Clock, MailWarning, SpellCheck } from "lucide-react";

export const dynamic = "force-dynamic";

function Gate({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-strong max-w-md rounded-glass p-8 text-center">
        {icon}
        <h1 className="mt-4 font-display text-xl font-bold text-white">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default async function ProofreadDashboardLayout({ children }: { children: React.ReactNode }) {
  // Re-read from the DB: the session cookie may predate an approval or role change.
  const user = await getCurrentUser();
  if (!user) redirect("/proofread/login");

  const writerLink =
    user.writer === "APPROVED" ? (
      <Link href="/cms" className="focus-ring text-sm font-semibold text-signal hover:underline">
        Go to the CMS
      </Link>
    ) : null;

  if (!user.emailVerified) {
    return (
      <Gate icon={<MailWarning size={32} className="mx-auto text-signal" />} title="Verify your email">
        <p className="mt-2 text-sm text-white/60">
          We sent a verification link to <span className="text-white/80">{user.email}</span>. Confirm it to unlock
          the desk.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <ResendVerificationButton />
          <SignOutButton redirectTo="/proofread/login" />
        </div>
      </Gate>
    );
  }

  // A writer who isn't a proofreader yet: offer it on the same account.
  if (user.proofreader === null) {
    return (
      <Gate icon={<SpellCheck size={32} className="mx-auto text-signal" />} title="Want to proofread too?">
        <p className="mt-2 text-sm text-white/60">
          Your account is set up for writing. Proofreaders check other writers&apos; news and articles before they
          go live. Ask for access and, once an admin approves it, sign in here with the same email and password.
        </p>
        <div className="mt-6">
          <RequestAccess kinds={["PROOFREADER"]} />
        </div>
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-white/10 pt-5">
          {writerLink}
          <SignOutButton redirectTo="/proofread/login" />
        </div>
      </Gate>
    );
  }

  if (user.proofreader !== "APPROVED") {
    const rejected = user.proofreader === "REJECTED";
    return (
      <Gate
        icon={
          rejected ? (
            <ShieldAlert size={32} className="mx-auto text-red-400" />
          ) : (
            <Clock size={32} className="mx-auto text-signal" />
          )
        }
        title={rejected ? "Proofreader access not approved" : "Waiting for admin approval"}
      >
        <p className="mt-2 text-sm text-white/60">
          {rejected
            ? "An admin has declined proofreader access for this account. Contact the editorial team if you think this is a mistake."
            : "An admin needs to approve your proofreader access. You'll get an email as soon as they do."}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {writerLink}
          <SignOutButton redirectTo="/proofread/login" />
        </div>
      </Gate>
    );
  }

  return (
    <ProofreadShell user={{ name: user.name, isAdmin: user.role === "ADMIN", canWrite: user.writer === "APPROVED" }}>
      {children}
    </ProofreadShell>
  );
}
