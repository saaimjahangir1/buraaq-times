import { redirect } from "next/navigation";
import { getSession, Role, roleLabel } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CmsShell from "@/components/cms/CmsShell";
import SignOutButton from "@/components/cms/SignOutButton";
import ResendVerificationButton from "@/components/cms/ResendVerificationButton";
import { ShieldAlert, Clock, MailWarning } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/cms/login");

  // Re-check from the DB — the JWT could be from before an admin
  // approved/rejected the account, or before email was verified.
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, status: true, emailVerified: true },
  });
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

  if (user.role !== "ADMIN" && user.status !== "APPROVED") {
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
              : `Your ${roleLabel(user.role as Role)} account is waiting on admin approval before you can publish. Check back soon.`}
          </p>
          <div className="mt-6">
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <CmsShell user={{ name: user.name, email: user.email, role: user.role as Role }}>
      {children}
    </CmsShell>
  );
}
