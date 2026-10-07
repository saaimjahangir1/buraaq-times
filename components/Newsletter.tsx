"use client";

import { useState } from "react";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import Reveal from "./Reveal";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  // Honeypot — hidden from people, often filled in by spam bots.
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't sign you up. Please try again.");
      setMessage(data.message || "Check your inbox to confirm.");
      setDevLink(data.devLink || null);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign you up. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <section className="mx-4 mt-20 mb-16 md:mx-8">
      <Reveal>
        <div className="glass-strong relative overflow-hidden rounded-glass p-8 text-center md:p-14">
          <div className="aurora">
            <div className="aurora-blob left-1/4 top-0 h-72 w-72 bg-signal" />
            <div className="aurora-blob right-1/4 bottom-0 h-72 w-72 bg-cyan" />
          </div>
          <div className="relative">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-signal/10 text-signal">
              <Mail size={20} />
            </span>
            <h2 className="font-display text-2xl font-bold text-ink dark:text-white md:text-3xl">
              Stay ahead of the story
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/60 dark:text-white/60">
              One email each morning we publish, with the stories that matter. Confirm once, unsubscribe any time.
            </p>

            {status === "done" ? (
              <div className="mt-6" role="status">
                <p className="flex items-center justify-center gap-2 font-medium text-signal">
                  <CheckCircle2 size={18} className="shrink-0" /> {message}
                </p>
                <p className="mt-1 text-xs text-ink/50 dark:text-white/50">
                  Can&apos;t find it? Check your spam or promotions folder.
                </p>
                {devLink && (
                  <p className="mx-auto mt-3 max-w-md break-all rounded-xl bg-black/5 p-3 text-left text-xs text-ink/60 dark:bg-white/5 dark:text-white/60">
                    Dev mode (no SMTP configured):{" "}
                    <a href={devLink} className="text-signal underline">
                      {devLink}
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={subscribe} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
                />
                <input
                  required
                  type="email"
                  aria-label="Email address"
                  autoComplete="email"
                  disabled={status === "sending"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="focus-ring flex-1 rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="focus-ring flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-signal to-cyanDeep px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60"
                >
                  {status === "sending" && <Loader2 size={15} className="animate-spin" />}
                  Subscribe
                </button>
              </form>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-500">
                {error}
              </p>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
