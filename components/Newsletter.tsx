"use client";

import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import Reveal from "./Reveal";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

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
              One email, every morning. The stories that matter, curated by our editors.
            </p>

            {sent ? (
              <p className="mt-6 flex items-center justify-center gap-2 font-medium text-signal">
                <CheckCircle2 size={18} /> You&apos;re subscribed — welcome aboard.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
              >
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="focus-ring flex-1 rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <button
                  type="submit"
                  className="focus-ring rounded-full bg-gradient-to-r from-signal to-cyanDeep px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
