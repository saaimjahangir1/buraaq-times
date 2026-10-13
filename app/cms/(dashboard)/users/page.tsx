"use client";

import { useEffect, useState } from "react";
import { Check, X, ShieldAlert, PenLine, SpellCheck, Mail, MailWarning } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";
import Select from "@/components/Select";
import { writerState, proofreaderState, AccessState } from "@/lib/auth-shared";

type Role = "ADMIN" | "NEWS_EDITOR" | "ARTICLE_EDITOR" | "PROOFREADER";
type Status = "PENDING" | "APPROVED" | "REJECTED";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  proofreaderStatus: Status | null;
  emailVerified: boolean;
  bio: string | null;
  createdAt: string;
  _count: { posts: number };
}

type Patch = Partial<{ role: Role; status: Status; proofreaderStatus: Status | null; emailVerified: true }>;

function StateChip({ state }: { state: AccessState }) {
  const map = {
    APPROVED: "bg-signal/20 text-signal",
    PENDING: "bg-amber-400/15 text-amber-300",
    REJECTED: "bg-red-500/20 text-red-400",
  } as const;
  if (!state) return <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase text-white/35">none</span>;
  return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${map[state]}`}>{state.toLowerCase()}</span>;
}

function Btn({ onClick, tone, children }: { onClick: () => void; tone: "ok" | "no" | "plain"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "bg-signal/20 text-signal hover:bg-signal/30"
      : tone === "no"
      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
      : "bg-white/5 text-white/60 hover:bg-white/10";
  return (
    <button onClick={onClick} className={`focus-ring flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${cls}`}>
      {children}
    </button>
  );
}

export default function CmsUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/cms/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id: string, patch: Patch) => {
    setError(null);
    const res = await cmsFetch(`/api/cms/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "That change didn't save.");
    }
    load();
  };

  const needsApproval = (u: UserRow) => writerState(u) === "PENDING" || proofreaderState(u) === "PENDING";
  const visible = filter === "PENDING" ? users.filter(needsApproval) : users;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Users</h1>
      <p className="mt-1 text-sm text-white/50">
        Writer access and proofreader access are approved separately — one person can have both.
      </p>

      <div className="mt-5 flex gap-1.5">
        {(["PENDING", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f ? "bg-signal text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {f === "PENDING" ? "Needs approval" : "All"}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}

      <div className="mt-5 space-y-3">
        {loading && <p className="text-sm text-white/40">Loading...</p>}
        {!loading && visible.length === 0 && <p className="text-sm text-white/40">Nothing to show here.</p>}
        {visible.map((u) => {
          const w = writerState(u);
          const p = proofreaderState(u);
          const isAdmin = u.role === "ADMIN";
          return (
            <div key={u.id} className="glass rounded-glass p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-signal to-cyanDeep text-xs font-bold text-white">
                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{u.name}</p>
                    <p className="truncate text-xs text-white/40">{u.email}</p>
                  </div>
                </div>
                {!u.emailVerified && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-semibold uppercase text-amber-300">
                      <MailWarning size={12} /> Email not verified
                    </span>
                    <Btn
                      tone="plain"
                      onClick={() => {
                        if (confirm(`Mark ${u.email} as verified? Only do this if you're sure the address belongs to ${u.name}.`)) {
                          update(u.id, { emailVerified: true });
                        }
                      }}
                    >
                      <Check size={13} /> Mark verified
                    </Btn>
                  </div>
                )}
                {u._count.posts > 0 && <span className="text-xs text-white/30">{u._count.posts} posts</span>}
              </div>

              <div className="mt-4 grid gap-3 border-t border-white/5 pt-3 md:grid-cols-2">
                {/* Writer access */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex w-24 items-center gap-1.5 text-xs font-semibold text-white/50">
                    <PenLine size={13} /> Writer
                  </span>
                  <Select
                    className="w-44"
                    value={u.role}
                    onChange={(v) => update(u.id, { role: v as Role })}
                    options={[
                      { value: "ADMIN", label: "Admin" },
                      { value: "NEWS_EDITOR", label: "News writer" },
                      { value: "ARTICLE_EDITOR", label: "Article writer" },
                      { value: "PROOFREADER", label: "No writing (proofreader only)" },
                    ]}
                  />
                  {!isAdmin && w !== null && (
                    <>
                      <StateChip state={w} />
                      {w !== "APPROVED" && (
                        <Btn tone="ok" onClick={() => update(u.id, { status: "APPROVED" })}>
                          <Check size={13} /> Approve
                        </Btn>
                      )}
                      {w !== "REJECTED" && (
                        <Btn tone="no" onClick={() => update(u.id, { status: "REJECTED" })}>
                          <X size={13} /> Reject
                        </Btn>
                      )}
                    </>
                  )}
                </div>

                {/* Proofreader access */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex w-24 items-center gap-1.5 text-xs font-semibold text-white/50">
                    <SpellCheck size={13} /> Proofreader
                  </span>
                  {isAdmin ? (
                    <span className="text-xs text-white/40">Admins can always proofread</span>
                  ) : (
                    <>
                      <StateChip state={p} />
                      {p === null && (
                        <Btn tone="plain" onClick={() => update(u.id, { proofreaderStatus: "APPROVED" })}>
                          <Check size={13} /> Give access
                        </Btn>
                      )}
                      {(p === "PENDING" || p === "REJECTED") && (
                        <Btn tone="ok" onClick={() => update(u.id, { proofreaderStatus: "APPROVED" })}>
                          <Check size={13} /> Approve
                        </Btn>
                      )}
                      {p === "PENDING" && (
                        <Btn tone="no" onClick={() => update(u.id, { proofreaderStatus: "REJECTED" })}>
                          <X size={13} /> Reject
                        </Btn>
                      )}
                      {p === "APPROVED" && w !== null && (
                        <Btn tone="plain" onClick={() => update(u.id, { proofreaderStatus: null })}>
                          Remove
                        </Btn>
                      )}
                      {p === "APPROVED" && w === null && (
                        <Btn tone="no" onClick={() => update(u.id, { proofreaderStatus: "REJECTED" })}>
                          <X size={13} /> Revoke
                        </Btn>
                      )}
                    </>
                  )}
                  {p === "APPROVED" && (
                    <p className="flex basis-full items-center gap-1.5 text-[11px] text-white/35">
                      {u.emailVerified ? (
                        <>
                          <Mail size={12} className="text-signal" /> Gets “waiting for proofreading” emails
                        </>
                      ) : (
                        <>
                          <MailWarning size={12} className="text-amber-300" /> No proofreading emails until their email is
                          verified
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-white/30">
        <ShieldAlert size={13} /> Changes take effect the next time that person loads a page. People with both kinds of
        access use the same email and password for the CMS and the proofreading desk.
      </p>
    </div>
  );
}
