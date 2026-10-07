import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const session = await getSession();
  if (!session) redirect("/proofread/login");

  // Re-read from the DB: the session cookie may predate an approval or role change.
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, status: true, emailVerified: true },
  });
  if (!user) redirect("/proofread/login");

  if (user.role !== "PROOFREADER" && user.role !== "ADMIN") {
    return (
      <Gate icon={<SpellCheck size={32} className="mx-auto text-signal" />} title="This desk is for proofreaders">
        <p className="mt-2 text-sm text-white/60">
          You&apos;re signed in as an editor. Your work lives in the CMS.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link href="/cms" className="focus-ring rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-white">
            Go to the CMS
          </Link>
          <SignOutButton redirectTo="/proofread/login" />
        </div>
      </Gate>
    );
  }

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

  if (user.role !== "ADMIN" && user.status !== "APPROVED") {
    const rejected = user.status === "REJECTED";
    return (
      <Gate
        icon={
          rejected ? (
            <ShieldAlert size={32} className="mx-auto text-red-400" />
          ) : (
            <Clock size={32} className="mx-auto text-signal" />
          )
        }
        title={rejected ? "Account not approved" : "Waiting for admin approval"}
      >
        <p className="mt-2 text-sm text-white/60">
          {rejected
            ? "An admin has declined this proofreader account. Contact the editorial team if you think this is a mistake."
            : "An admin needs to approve your proofreader account. You'll get an email as soon as they do."}
        </p>
        <div className="mt-6">
          <SignOutButton redirectTo="/proofread/login" />
        </div>
      </Gate>
    );
  }

  return (
    <ProofreadShell user={{ name: user.name, isAdmin: user.role === "ADMIN" }}>{children}</ProofreadShell>
  );
}
