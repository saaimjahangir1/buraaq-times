import type { ReactNode } from "react";
import { linkParts, tidy, type ResumeData } from "@/lib/resume/resume";

// A white "sheet of paper" that mirrors the PDF layout, so what users see is what they download.
// Always light, regardless of the site's theme, because the PDF is.

function Section({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3
        className="mb-2.5 border-b-[1.5px] pb-1 text-[0.9rem] font-bold"
        style={{ color: accent, borderColor: accent }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  const clean = tidy(items);
  if (!clean.length) return null;
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-4 marker:text-zinc-500">
      {clean.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

function EntryHead({ title, right, sub }: { title: string; right?: ReactNode; sub?: string }) {
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-bold text-zinc-900">{title}</p>
        {right ? <p className="text-[0.8rem] text-zinc-600">{right}</p> : null}
      </div>
      {sub ? <p className="text-[0.85rem] text-zinc-600">{sub}</p> : null}
    </>
  );
}

export default function ResumePreview({ data, accent }: { data: ResumeData; accent: string }) {
  const { contact } = data;
  const contactBits: ReactNode[] = [];
  if (contact.email) contactBits.push(<a href={`mailto:${contact.email}`}>{contact.email}</a>);
  if (contact.phone) contactBits.push(contact.phone);
  if (contact.location) contactBits.push(contact.location);
  contact.links.forEach((l) => {
    const { href, label } = linkParts(l);
    contactBits.push(
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  });

  const skills = data.skills.filter((g) => g.items.length);

  return (
    <article
      aria-label="Resume preview"
      className="mx-auto w-full max-w-[820px] rounded-sm bg-white px-6 py-8 text-[0.9rem] leading-relaxed text-zinc-800 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] sm:px-12 sm:py-12"
      style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      <header>
        <h2 className="text-[1.9rem] font-bold leading-tight text-zinc-900">{data.name || "Your name"}</h2>
        {data.headline ? (
          <p className="mt-1 text-[1.02rem]" style={{ color: accent }}>
            {data.headline}
          </p>
        ) : null}
        {contactBits.length ? (
          <p className="mt-2 flex flex-wrap gap-x-2 text-[0.8rem] text-zinc-600">
            {contactBits.map((bit, i) => (
              <span key={i} className="flex gap-x-2">
                {i > 0 ? <span aria-hidden="true" className="text-zinc-400">|</span> : null}
                {bit}
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {data.summary.trim() ? (
        <Section title="Profile" accent={accent}>
          <p>{data.summary}</p>
        </Section>
      ) : null}

      {data.experience.length ? (
        <Section title="Experience" accent={accent}>
          <div className="space-y-3.5">
            {data.experience.map((e, i) => (
              <div key={i}>
                <EntryHead
                  title={e.role || e.company}
                  right={e.dates}
                  sub={e.role ? [e.company, e.location].filter(Boolean).join(", ") : undefined}
                />
                <Bullets items={e.bullets} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {data.education.length ? (
        <Section title="Education" accent={accent}>
          <div className="space-y-3.5">
            {data.education.map((e, i) => (
              <div key={i}>
                <EntryHead
                  title={e.degree || e.institution}
                  right={e.dates}
                  sub={e.degree ? [e.institution, e.location].filter(Boolean).join(", ") : undefined}
                />
                <Bullets items={e.details} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {data.projects.length ? (
        <Section title="Projects" accent={accent}>
          <div className="space-y-3.5">
            {data.projects.map((p, i) => (
              <div key={i}>
                <EntryHead
                  title={p.name}
                  right={
                    p.link ? (
                      <a href={linkParts(p.link).href} target="_blank" rel="noopener noreferrer">
                        {linkParts(p.link).label}
                      </a>
                    ) : undefined
                  }
                />
                <Bullets items={p.bullets} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {skills.length ? (
        <Section title="Skills" accent={accent}>
          <div className="space-y-1">
            {skills.map((g, i) => (
              <p key={i}>
                {g.category ? <strong className="text-zinc-900">{g.category}: </strong> : null}
                {g.items.join(", ")}
              </p>
            ))}
          </div>
        </Section>
      ) : null}

      {tidy(data.certifications).length ? (
        <Section title="Certifications" accent={accent}>
          <Bullets items={data.certifications} />
        </Section>
      ) : null}

      {data.languages.length ? (
        <Section title="Languages" accent={accent}>
          <p>{data.languages.join(", ")}</p>
        </Section>
      ) : null}
    </article>
  );
}
