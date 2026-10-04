"use client";

import { useState } from "react";
import { Mail, MapPin, Send, Loader2, Instagram, Facebook, Linkedin } from "lucide-react";
import Reveal from "@/components/Reveal";

const FAQ = [
  { q: "How do I submit a tip or story lead?", a: "Email us at theburaaqtimes@gmail.com — every tip is reviewed by an editor within 48 hours." },
  { q: "Can I republish a Buraaq Times story?", a: "Contact our syndication desk; most reporting can be republished with attribution and a link back." },
  { q: "How do I become a contributor?", a: "Register for a CMS account and apply as a News or Article Editor — accounts require admin approval." },
];

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/buraaqtimes/", icon: Instagram },
  { label: "Facebook", href: "https://web.facebook.com/buraaqtimes", icon: Facebook },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/82151810/", icon: Linkedin },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-4 mb-16 mt-6 md:mx-8">
      <Reveal>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Contact Us</span>
        <h1 className="font-display text-3xl font-bold text-ink dark:text-white">
          We&apos;d like to hear from you
        </h1>
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
        <Reveal className="space-y-4">
          <div className="glass space-y-4 rounded-glass p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signal/10 text-signal">
                <Mail size={16} />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-ink dark:text-white">Email</p>
                <a href="mailto:theburaaqtimes@gmail.com" className="text-ink/60 hover:text-signal dark:text-white/60">
                  theburaaqtimes@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signal/10 text-signal">
                <MapPin size={16} />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-ink dark:text-white">Newsroom</p>
                <p className="text-ink/60 dark:text-white/60">Islamabad, Pakistan</p>
              </div>
            </div>
          </div>

          <div className="glass overflow-hidden rounded-glass">
            <iframe
              title="map"
              className="h-56 w-full grayscale"
              loading="lazy"
              src="https://maps.google.com/maps?q=Islamabad&t=&z=12&ie=UTF8&iwloc=&output=embed"
            />
          </div>

          <div className="flex gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="glass focus-ring flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-ink/70 transition hover:text-signal dark:text-white/70"
              >
                <s.icon size={14} />
                {s.label}
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass rounded-glass p-6 md:p-8">
            {sent ? (
              <p className="py-16 text-center font-display text-lg font-semibold text-signal">
                Message sent — we&apos;ll get back to you shortly.
              </p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="focus-ring rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="focus-ring rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="focus-ring w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your message"
                  className="focus-ring w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="focus-ring flex items-center gap-2 rounded-full bg-gradient-to-r from-signal to-cyanDeep px-6 py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </Reveal>
      </div>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-6 font-display text-2xl font-bold text-ink dark:text-white">
            Frequently Asked
          </h2>
        </Reveal>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.05}>
              <details className="glass group rounded-glass p-5">
                <summary className="focus-ring cursor-pointer list-none font-semibold text-ink dark:text-white">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-ink/60 dark:text-white/60">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
