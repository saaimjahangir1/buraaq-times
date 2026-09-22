"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Reveal from "@/components/Reveal";

const TIMELINE = [
  { year: "2019", label: "Buraaq Times founded as a two-person newsletter." },
  { year: "2021", label: "Launched dedicated Articles desk for long-form journalism." },
  { year: "2023", label: "Crossed one million monthly readers." },
  { year: "2026", label: "Rebuilt the platform around an AI-assisted reading experience." },
];

const VALUES = [
  { title: "Accuracy first", body: "We publish when we're certain, not when we're first." },
  { title: "Transparent sourcing", body: "Every claim traces back to a reference you can check." },
  { title: "Reader's time is sacred", body: "Every story earns its length — nothing is padded." },
  { title: "Independent by design", body: "Editorial decisions are never influenced by advertisers." },
];

const TEAM = [
  { name: "Ayesha Noor", role: "Editor-in-Chief" },
  { name: "Imran Qureshi", role: "Head of News" },
  { name: "Laiba Yousuf", role: "Head of Articles" },
  { name: "Fahad Rauf", role: "Product & Engineering" },
];

function Stat({ value, label }: { value: number; label: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        className="font-display text-4xl font-extrabold text-gradient"
      >
        {inView ? value.toLocaleString() : 0}+
      </motion.p>
      <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{label}</p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-4 mb-16 mt-6 md:mx-8">
      <Reveal>
        <section className="glass-strong relative overflow-hidden rounded-glass p-8 text-center md:p-16">
          <div className="aurora">
            <div className="aurora-blob left-10 top-0 h-72 w-72 bg-signal" />
            <div className="aurora-blob right-10 bottom-0 h-72 w-72 bg-cyan" />
          </div>
          <div className="relative">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
              About Buraaq Times
            </span>
            <h1 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-bold text-ink dark:text-white md:text-5xl">
              Journalism built for how people actually read today
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ink/60 dark:text-white/60">
              We combine credible, sourced reporting with a reading experience designed around
              focus, comprehension, and pace — not just headlines.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.1}>
        <section className="glass mt-8 grid grid-cols-2 gap-6 rounded-glass p-8 md:grid-cols-4">
          <Stat value={1200000} label="Monthly readers" />
          <Stat value={48} label="Newsroom staff" />
          <Stat value={6300} label="Stories published" />
          <Stat value={10} label="Categories covered" />
        </section>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Reveal>
          <div className="glass h-full rounded-glass p-6">
            <h2 className="font-display text-xl font-bold text-ink dark:text-white">Our Mission</h2>
            <p className="mt-2 text-sm text-ink/70 dark:text-white/70">
              To give readers a clear, honest account of what&apos;s happening — and the space to
              actually understand it, not just skim it.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="glass h-full rounded-glass p-6">
            <h2 className="font-display text-xl font-bold text-ink dark:text-white">Our Vision</h2>
            <p className="mt-2 text-sm text-ink/70 dark:text-white/70">
              A newsroom where technology serves comprehension — where every reader can adjust
              the story to how they read best, without the story itself ever being compromised.
            </p>
          </div>
        </Reveal>
      </div>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-6 font-display text-2xl font-bold text-ink dark:text-white">Our Story</h2>
        </Reveal>
        <div className="space-y-6 border-l border-black/10 pl-6 dark:border-white/10">
          {TIMELINE.map((t, i) => (
            <Reveal key={t.year} delay={i * 0.05}>
              <div className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-signal shadow-glow" />
                <p className="font-mono text-sm font-semibold text-signal">{t.year}</p>
                <p className="text-ink/70 dark:text-white/70">{t.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-6 font-display text-2xl font-bold text-ink dark:text-white">
            Editorial Policy &amp; Core Values
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.05}>
              <div className="glass h-full rounded-glass p-5">
                <p className="font-display font-bold text-ink dark:text-white">{v.title}</p>
                <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-6 font-display text-2xl font-bold text-ink dark:text-white">Our Team</h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.05}>
              <div className="glass rounded-glass p-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-signal to-cyanDeep font-display font-bold text-white">
                  {m.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <p className="mt-3 font-semibold text-ink dark:text-white">{m.name}</p>
                <p className="text-xs text-ink/50 dark:text-white/50">{m.role}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
