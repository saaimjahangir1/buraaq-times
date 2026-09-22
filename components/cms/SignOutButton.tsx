"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/cms/auth/logout", { method: "POST" });
        router.push("/cms/login");
        router.refresh();
      }}
      className="focus-ring rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
    >
      Sign out
    </button>
  );
}
