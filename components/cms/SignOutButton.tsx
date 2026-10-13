"use client";

import { useRouter } from "next/navigation";

/** Signs out of one area only — the CMS (default) or the proofreading desk. */
export default function SignOutButton({ area = "cms", redirectTo }: { area?: "cms" | "desk"; redirectTo?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch(`/api/cms/auth/logout?area=${area}`, { method: "POST" });
        router.push(redirectTo ?? (area === "desk" ? "/proofread/login" : "/cms/login"));
        router.refresh();
      }}
      className="focus-ring rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
    >
      Sign out
    </button>
  );
}
