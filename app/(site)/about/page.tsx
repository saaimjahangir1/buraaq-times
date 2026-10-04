"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";

// Flip to true once real readership stats, a real founding timeline, and
// real team member info are available — update the three arrays below
// with real data first, then flip this flag.
const SHOW_PLACEHOLDER_SECTIONS = false;

const TIMELINE = [
  { year: "2019", label: "Buraaq Times founded as a two-person newsletter." },
  { year: "2021", label: "Launched dedicated Articles desk for long-form journalism." },
  { year: "2023", label: "Crossed one million monthly readers." },
  { year: "2026", label: "Rebuilt the platform around an AI-assisted reading experience." },
];

const TEAM = [
  { name: "Ayesha Noor", role: "Editor-in-Chief" },
  { name: "Imran Qureshi", role: "Head of News" },
  { name: "Laiba Yousuf", role: "Head of Articles" },
  { name: "Fahad Rauf", role: "Product & Engineering" },
];

const COVERAGE = [
  { title: "Pakistan", body: "News, developments, public affairs, society, education, governance, and issues shaping communities across Pakistan." },
  { title: "World", body: "Major international developments, geopolitical events, global trends, and stories that influence Pakistan and the wider region." },
  { title: "Business & Economy", body: "Economic developments, entrepreneurship, markets, startups, business trends, employment, and the forces shaping the future of work." },
  { title: "Technology & AI", body: "Emerging technologies, artificial intelligence, innovation, digital transformation, cybersecurity, and the technologies changing everyday life." },
  { title: "Education & Youth", body: "Student life, education, scholarships, opportunities, careers, youth initiatives, and the issues affecting the next generation." },
  { title: "Climate & Environment", body: "Climate change, sustainability, environmental challenges, conservation, renewable energy, and solutions for a more sustainable future." },
  { title: "Society & Culture", body: "Human-interest stories, social issues, culture, communities, changing lifestyles, and the people behind the headlines." },
  { title: "Opinions & Perspectives", body: "Thoughtful perspectives and informed commentary that encourage readers to look at important issues from different angles." },
];

const MISSION_POINTS = [
  "Report important developments with accuracy and responsibility.",
  "Explain complex issues in simple and understandable language.",
  "Give meaningful space to youth perspectives and voices.",
  "Highlight stories that deserve attention but may be overlooked.",
  "Promote informed discussion rather than sensationalism.",
  "Produce original digital content across written, visual, and video formats.",
  "Connect local stories with national and global developments.",
  "Encourage critical thinking, curiosity, and civic awareness.",
  "Create opportunities for emerging writers, journalists, researchers, and storytellers.",
];

const PHILOSOPHY = [
  { title: "Accuracy", body: "We aim to verify information and distinguish facts from assumptions, opinions, and unverified claims." },
  { title: "Context", body: "A headline without context can mislead. We aim to provide the background necessary to understand the significance of a story." },
  { title: "Fairness", body: "We seek to represent relevant perspectives fairly and avoid deliberately misleading or one-sided presentation." },
  { title: "Independence", body: "Editorial decisions should be guided by journalistic value and public interest rather than personal or commercial influence." },
  { title: "Responsibility", body: "We recognize that journalism can affect individuals, communities, institutions, and public discourse. We therefore approach sensitive stories with care." },
  { title: "Transparency", body: "When appropriate, we aim to acknowledge corrections, clarify sources, and distinguish editorial content from other forms of communication." },
];

const ORIGINALS_QUESTIONS = [
  "Why is this happening?",
  "How does it affect me?",
  "What does the data tell us?",
  "What are people not talking about?",
  "What happens next?",
];

const STORY_LINES = [
  "A breaking story should tell you what happened.",
  "An explainer should tell you why.",
  "An analysis should help you understand what it could mean.",
  "A human story should help you see the people behind the numbers.",
  "And a conversation should leave you with a better question than the one you started with.",
];

const FUTURE = [
  "Digital news and reporting",
  "Investigative and long-form journalism",
  "Explainer journalism",
  "Video journalism",
  "Interviews and conversations",
  "Podcasts and audio stories",
  "Data-driven stories",
  "Documentaries",
  "Youth journalism",
  "Special reports",
  "Community-focused storytelling",
  "Original digital shows",
];

const PROMISE_CANT = [
  "We cannot promise that we will cover everything.",
  "We cannot promise that every story will be easy.",
  "And we cannot promise that every answer will be simple.",
];

const PROMISE_CAN = [
  "To seek the facts.",
  "To provide context.",
  "To listen to different perspectives.",
  "To learn when we are wrong.",
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

function StackedLines({ lines, className = "" }: { lines: string[]; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((line, i) => (
        <Reveal key={line} delay={i * 0.06}>
          <p className="font-display text-lg font-semibold text-ink dark:text-white md:text-xl">
            {line}
          </p>
        </Reveal>
      ))}
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
              Journalism That Informs. Stories That Matter.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-ink/60 dark:text-white/60">
              Buraaq Times (TBT) is a youth-driven digital media platform committed to bringing
              meaningful stories, credible information, and deeper perspectives to a generation
              that is constantly connected but often overwhelmed by information.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-ink/60 dark:text-white/60">
              We believe journalism should do more than tell people what happened — it should
              help them understand why it happened, why it matters, and what comes next.
            </p>
            <p className="mx-auto mt-3 max-w-xl font-display font-semibold text-signal">
              Our focus is not simply on being the first to report. Our focus is on being worth
              reading.
            </p>
          </div>
        </section>
      </Reveal>

      {SHOW_PLACEHOLDER_SECTIONS && (
        <Reveal delay={0.1}>
          <section className="glass mt-8 grid grid-cols-2 gap-6 rounded-glass p-8 md:grid-cols-4">
            <Stat value={1200000} label="Monthly readers" />
            <Stat value={48} label="Newsroom staff" />
            <Stat value={6300} label="Stories published" />
            <Stat value={10} label="Categories covered" />
          </section>
        </Reveal>
      )}

      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Reveal>
          <div className="glass h-full rounded-glass p-6">
            <h2 className="font-display text-xl font-bold text-ink dark:text-white">Our Vision</h2>
            <p className="mt-2 text-sm text-ink/70 dark:text-white/70">
              To build a modern, independent, and youth-oriented media platform that contributes
              to a more informed, aware, and engaged society.
            </p>
            <p className="mt-3 text-sm text-ink/70 dark:text-white/70">
              The digital age has made information available to everyone — but accessibility has
              also created a new challenge: knowing what to trust, what to understand, and what
              truly matters. Buraaq Times seeks to bridge that gap, creating a media ecosystem
              where young people can discover the news, understand complex issues, explore
              diverse perspectives, and participate in conversations that shape their communities
              and their future.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="glass h-full rounded-glass p-6">
            <h2 className="font-display text-xl font-bold text-ink dark:text-white">Our Mission</h2>
            <p className="mt-2 text-sm text-ink/70 dark:text-white/70">
              To deliver credible, relevant, accessible, and meaningful journalism for today&apos;s
              generation. We strive to:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink/70 dark:text-white/70">
              {MISSION_POINTS.map((m) => (
                <li key={m} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-2 font-display text-2xl font-bold text-ink dark:text-white">
            Why Buraaq Times?
          </h2>
          <p className="max-w-3xl text-sm text-ink/60 dark:text-white/60">
            The way people consume information is changing. News is no longer limited to
            newspapers, television bulletins, or traditional newsrooms — people discover stories
            through social media, short videos, podcasts, newsletters, search engines, and
            digital communities. At the same time, the volume of information has never been
            greater. Buraaq Times exists at this intersection, building a digital-first platform
            designed for readers who want information that is:
          </p>
        </Reveal>
        <StackedLines lines={["Fast enough to keep up.", "Deep enough to understand.", "Simple enough to access.", "Responsible enough to trust."]} className="mt-5" />
      </section>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-6 font-display text-2xl font-bold text-ink dark:text-white">
            What We Cover
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {COVERAGE.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.04}>
              <div className="glass h-full rounded-glass p-5">
                <p className="font-display font-bold text-ink dark:text-white">{c.title}</p>
                <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Reveal>
          <div className="glass h-full rounded-glass p-6">
            <h2 className="font-display text-xl font-bold text-ink dark:text-white">
              TBT Originals
            </h2>
            <p className="mt-2 text-sm text-ink/70 dark:text-white/70">
              Beyond conventional news coverage, TBT Originals is our space for original
              storytelling — explainers, interviews, documentaries, special reports, visual
              stories, and digital shows that explore subjects beyond the headline, designed to
              make complicated subjects understandable without making them superficial.
            </p>
            <ul className="mt-3 space-y-1 text-sm italic text-ink/60 dark:text-white/60">
              {ORIGINALS_QUESTIONS.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="glass h-full rounded-glass p-6">
            <h2 className="font-display text-xl font-bold text-ink dark:text-white">
              TBT Decoded
            </h2>
            <p className="mt-2 text-sm text-ink/70 dark:text-white/70">
              Many of the most important issues of our time are difficult to understand — from
              inflation and interest rates to artificial intelligence, geopolitics, climate
              change, elections, emerging technologies, and global economic shifts. TBT Decoded
              breaks these subjects down into accessible, engaging stories so readers and viewers
              can understand the forces shaping their world.
            </p>
            <p className="mt-3 font-display font-semibold text-signal">
              Because being informed is not simply knowing the headline — it is understanding the
              story behind it.
            </p>
          </div>
        </Reveal>
      </div>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-2 font-display text-2xl font-bold text-ink dark:text-white">
            A Platform for Young Voices
          </h2>
          <p className="max-w-3xl font-display font-semibold text-ink dark:text-white">
            Young people are not simply the audience of tomorrow. They are part of today&apos;s
            conversation.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-ink/60 dark:text-white/60">
            Buraaq Times seeks to create opportunities for young writers, journalists,
            researchers, students, creators, and thinkers to contribute to meaningful
            conversations — bringing new questions, different experiences, and fresh perspectives
            to journalism, and providing space for ideas, stories, analysis, and experiences from
            a generation actively shaping Pakistan&apos;s future.
          </p>
        </Reveal>
      </section>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-6 font-display text-2xl font-bold text-ink dark:text-white">
            Our Editorial Philosophy
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PHILOSOPHY.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.05}>
              <div className="glass h-full rounded-glass p-5">
                <p className="font-display font-bold text-ink dark:text-white">{v.title}</p>
                <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {SHOW_PLACEHOLDER_SECTIONS && (
        <section className="mt-16">
          <Reveal>
            <h2 className="mb-6 font-display text-2xl font-bold text-ink dark:text-white">
              Our Story
            </h2>
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
      )}

      {SHOW_PLACEHOLDER_SECTIONS && (
        <section className="mt-16">
          <Reveal>
            <h2 className="mb-6 font-display text-2xl font-bold text-ink dark:text-white">
              Our Team
            </h2>
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
      )}

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-3 font-display text-2xl font-bold text-ink dark:text-white">
            More Than a News Website
          </h2>
          <p className="max-w-3xl text-sm text-ink/60 dark:text-white/60">
            Buraaq Times is being built as more than a destination for headlines — it is a
            platform for information, understanding, conversation, and discovery. We want our
            readers to come to TBT not only when something happens, but when they want to
            understand something.
          </p>
        </Reveal>
        <StackedLines lines={STORY_LINES} className="mt-5" />
      </section>

      <section className="mt-16">
        <Reveal>
          <div className="glass h-full rounded-glass p-6">
            <h2 className="font-display text-xl font-bold text-ink dark:text-white">
              Our Commitment to Responsible Digital Journalism
            </h2>
            <p className="mt-2 text-sm text-ink/70 dark:text-white/70">
              The digital media environment rewards speed, outrage, and attention. We believe
              journalism should aspire to something more — we do not want to contribute to an
              information environment where sensational headlines replace substance, virality
              replaces verification, or engagement becomes more important than accuracy.
            </p>
            <p className="mt-3 text-sm text-ink/70 dark:text-white/70">
              Our ambition is to build a platform where credibility and creativity can coexist —
              journalism that is modern without becoming careless, engaging without becoming
              sensational, and accessible without compromising substance.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-2 font-display text-2xl font-bold text-ink dark:text-white">
            The Future of Buraaq Times
          </h2>
          <p className="max-w-3xl text-sm text-ink/60 dark:text-white/60">
            We see Buraaq Times as a growing digital newsroom with a strong presence across
            multiple formats. As technology evolves, so will the way we tell stories — but one
            thing will remain constant: our commitment to meaningful journalism.
          </p>
        </Reveal>
        <div className="mt-5 flex flex-wrap gap-2">
          {FUTURE.map((f, i) => (
            <Reveal key={f} delay={i * 0.03}>
              <span className="glass-pill inline-block px-4 py-2 text-xs font-medium text-ink/80 dark:text-white/80">
                {f}
              </span>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="mt-16 glass-strong rounded-glass p-8 text-center md:p-12">
          <h2 className="font-display text-2xl font-bold text-ink dark:text-white">
            Join the Conversation
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-ink/60 dark:text-white/60">
            Buraaq Times is being built for a generation that asks questions. If you have a story
            worth telling, an idea worth exploring, a perspective worth sharing, or an issue that
            deserves attention, we want to hear from you — because a newsroom should not exist in
            isolation from the society it serves. It should listen to it.
          </p>
          <Link
            href="/contact"
            className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-signal to-cyanDeep px-6 py-3 text-sm font-semibold text-white shadow-glow"
          >
            Get in touch
          </Link>
        </section>
      </Reveal>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-3 font-display text-2xl font-bold text-ink dark:text-white">
            Our Promise
          </h2>
          <div className="space-y-1 text-sm text-ink/60 dark:text-white/60">
            {PROMISE_CANT.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink/70 dark:text-white/70">
            But we can promise to keep asking better questions.
          </p>
          <div className="mt-1 space-y-1 text-sm text-ink/60 dark:text-white/60">
            {PROMISE_CAN.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <p className="mt-4 max-w-2xl font-display font-semibold text-ink dark:text-white">
            And to keep working toward journalism that leaves our readers more informed than when
            they arrived.
          </p>
        </Reveal>
      </section>

      <Reveal>
        <section className="mt-16 text-center">
          <p className="font-display text-xl font-bold text-ink dark:text-white">Buraaq Times</p>
          <p className="mt-1 text-sm uppercase tracking-[0.2em] text-signal">
            Understand what matters.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
