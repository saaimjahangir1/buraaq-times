import type { ReactNode } from "react";
import { linkParts, tidy, type ResumeData } from "@/lib/resume/resume";

/* ------------------------------------------------------------------ */
/* Resume templates                                                    */
/*                                                                     */
/* Each template is written ONCE with four building blocks (Page, Box, */
/* Txt, Lnk). The on-screen preview (ResumePreview.tsx) draws them as  */
/* HTML; the PDF (ResumePDF.tsx) draws the same template with          */
/* @react-pdf/renderer. So what people see is what they download.      */
/*                                                                     */
/* Styles use PDF points (A4 = 595 × 842 pt) and only the properties   */
/* both renderers support. Fonts are the PDF built-ins (Helvetica,     */
/* Times): no downloads, and what ATS resume scanners read best.       */
/* ------------------------------------------------------------------ */

export type Style = Record<string, string | number>;
type WithChildren = { children?: ReactNode };
export type Prims = {
  Page: (p: { style?: Style } & WithChildren) => JSX.Element;
  /** A block (flex column by default, like react-pdf's View). wrap={false} keeps it on one page. */
  Box: (p: { style?: Style; wrap?: boolean; minPresenceAhead?: number } & WithChildren) => JSX.Element;
  /** A line/paragraph of text; a Txt inside a Txt is an inline span. */
  Txt: (p: { style?: Style; minPresenceAhead?: number } & WithChildren) => JSX.Element;
  Lnk: (p: { src: string; style?: Style } & WithChildren) => JSX.Element;
};

export type TemplateId = "modern" | "classic" | "banner" | "timeline" | "compact";

export type TemplateDef = {
  id: TemplateId;
  name: string;
  description: string;
  /** false = black & white template; the colour picker is hidden. */
  usesAccent: boolean;
  render: (data: ResumeData, accent: string, P: Prims) => JSX.Element;
};

/* ---------- shared helpers ---------- */

/** "**text**" → bold. Writers (and the AI) can bold key words this way. */
export function rich(text: string, P: Prims, bold: Style): ReactNode[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) =>
      i % 2 ? (
        <P.Txt key={i} style={bold}>
          {part}
        </P.Txt>
      ) : (
        part.replace(/\*\*/g, "")
      )
    )
    .filter((p) => p !== "");
}

/** Text with any ** markers removed (names, titles, skills). */
export const plain = (s: string) => s.replace(/\*\*/g, "");

function contactItems(data: ResumeData) {
  const c = data.contact;
  return [
    c.phone ? { label: c.phone } : null,
    c.email ? { label: c.email, href: `mailto:${c.email}` } : null,
    c.location ? { label: c.location } : null,
    ...c.links.map((l) => linkParts(l)),
  ].filter((x): x is { label: string; href?: string } => Boolean(x));
}

/** Mixes a colour with white: t = 0 → the colour, t = 1 → white. */
export function tint(hex: string, t: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) + (255 - ((n >> shift) & 255)) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

const hasSkills = (d: ResumeData) => d.skills.some((g) => g.items.length);
const allSkills = (d: ResumeData) => d.skills.flatMap((g) => g.items).map(plain).filter(Boolean);

function Bullets({ items, P, style, dot = "•", dotStyle, bold }: { items: string[]; P: Prims; style?: Style; dot?: string; dotStyle?: Style; bold: Style }) {
  return (
    <>
      {tidy(items).map((b, i) => (
        <P.Box key={i} style={{ flexDirection: "row", marginTop: 1.5 }}>
          <P.Txt style={{ width: 11, ...dotStyle }}>{dot}</P.Txt>
          <P.Txt style={{ flex: 1, ...style }}>{rich(b, P, bold)}</P.Txt>
        </P.Box>
      ))}
    </>
  );
}

function ContactLine({ data, P, linkStyle, sep = "   |   " }: { data: ResumeData; P: Prims; linkStyle: Style; sep?: string }) {
  const items = contactItems(data);
  return (
    <>
      {items.map((c, i) => (
        <P.Txt key={i}>
          {i > 0 ? sep : ""}
          {c.href ? (
            <P.Lnk src={c.href} style={linkStyle}>
              {c.label}
            </P.Lnk>
          ) : (
            c.label
          )}
        </P.Txt>
      ))}
    </>
  );
}

/* ================================================================== */
/* 1. Modern — the original Buraaq Times design                        */
/* ================================================================== */

const modern: TemplateDef = {
  id: "modern",
  name: "Modern",
  description: "Clean sans-serif with coloured headings",
  usesAccent: true,
  render: (data, accent, P) => {
    const bold: Style = { fontFamily: "Helvetica-Bold", color: "#18181b" };
    const sub: Style = { fontSize: 9.5, color: "#52525b" };
    const Section = ({ title, children }: { title: string } & WithChildren) => (
      <P.Box style={{ marginTop: 15 }}>
        <P.Txt
          minPresenceAhead={40}
          style={{ fontFamily: "Helvetica-Bold", fontSize: 10.5, paddingBottom: 3, marginBottom: 7, borderBottomWidth: 1.2, color: accent, borderBottomColor: accent }}
        >
          {title}
        </P.Txt>
        {children}
      </P.Box>
    );
    const Head = ({ title, right, under }: { title: string; right?: ReactNode; under?: string }) => (
      <>
        <P.Box style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <P.Txt style={{ fontFamily: "Helvetica-Bold", color: "#18181b", flex: 1, paddingRight: 8 }}>{plain(title)}</P.Txt>
          {right ? <P.Txt style={{ fontSize: 9, color: "#52525b" }}>{right}</P.Txt> : null}
        </P.Box>
        {under ? <P.Txt style={sub}>{under}</P.Txt> : null}
      </>
    );
    return (
      <P.Page style={{ paddingTop: 40, paddingBottom: 44, paddingHorizontal: 46, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.45, color: "#27272a" }}>
        <P.Box>
          <P.Txt style={{ fontFamily: "Helvetica-Bold", fontSize: 24, color: "#18181b", lineHeight: 1.1 }}>{plain(data.name)}</P.Txt>
          {data.headline ? <P.Txt style={{ fontSize: 12, marginTop: 4, color: accent }}>{plain(data.headline)}</P.Txt> : null}
          {contactItems(data).length ? (
            <P.Txt style={{ fontSize: 9, color: "#52525b", marginTop: 7 }}>
              <ContactLine data={data} P={P} linkStyle={{ color: "#52525b", textDecoration: "none" }} />
            </P.Txt>
          ) : null}
        </P.Box>
        {data.summary.trim() ? (
          <Section title="Profile">
            <P.Txt>{rich(data.summary.trim(), P, bold)}</P.Txt>
          </Section>
        ) : null}
        {data.experience.length ? (
          <Section title="Experience">
            {data.experience.map((e, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 9 }}>
                <Head title={e.role || e.company} right={e.dates} under={e.role ? [e.company, e.location].filter(Boolean).join(", ") : undefined} />
                <Bullets items={e.bullets} P={P} bold={bold} />
              </P.Box>
            ))}
          </Section>
        ) : null}
        {data.education.length ? (
          <Section title="Education">
            {data.education.map((e, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 9 }}>
                <Head title={e.degree || e.institution} right={e.dates} under={e.degree ? [e.institution, e.location].filter(Boolean).join(", ") : undefined} />
                <Bullets items={e.details} P={P} bold={bold} />
              </P.Box>
            ))}
          </Section>
        ) : null}
        {data.projects.length ? (
          <Section title="Projects">
            {data.projects.map((p, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 9 }}>
                <Head
                  title={p.name}
                  right={
                    p.link ? (
                      <P.Lnk src={linkParts(p.link).href} style={{ color: "#52525b", textDecoration: "none" }}>
                        {linkParts(p.link).label}
                      </P.Lnk>
                    ) : undefined
                  }
                />
                <Bullets items={p.bullets} P={P} bold={bold} />
              </P.Box>
            ))}
          </Section>
        ) : null}
        {hasSkills(data) ? (
          <Section title="Skills">
            {data.skills
              .filter((g) => g.items.length)
              .map((g, i) => (
                <P.Txt key={i} style={{ marginBottom: 3 }}>
                  {g.category ? <P.Txt style={bold}>{plain(g.category)}: </P.Txt> : null}
                  {g.items.map(plain).join(", ")}
                </P.Txt>
              ))}
          </Section>
        ) : null}
        {tidy(data.certifications).length ? (
          <Section title="Certifications">
            <Bullets items={data.certifications} P={P} bold={bold} />
          </Section>
        ) : null}
        {data.languages.length ? (
          <Section title="Languages">
            <P.Txt>{data.languages.map(plain).join(", ")}</P.Txt>
          </Section>
        ) : null}
      </P.Page>
    );
  },
};

/* ================================================================== */
/* 2. Classic — serif, centred headings (the design Saaim supplied)    */
/* ================================================================== */

/** Small caps, the way the PDF fonts allow: big first letters, smaller capitals. */
function smallCaps(text: string, big: number, small: number, P: Prims): ReactNode[] {
  return plain(text)
    .split(/(\s+)/)
    .map((word, i) => {
      if (!word.trim()) return word;
      const first = word[0];
      const rest = word.slice(1);
      return (
        <P.Txt key={i}>
          <P.Txt style={{ fontSize: big }}>{first.toUpperCase()}</P.Txt>
          {rest ? <P.Txt style={{ fontSize: small, textTransform: "uppercase" }}>{rest}</P.Txt> : null}
        </P.Txt>
      );
    });
}

const classic: TemplateDef = {
  id: "classic",
  name: "Classic",
  description: "Traditional serif, centred section headings",
  usesAccent: false,
  render: (data, _accent, P) => {
    const ink = "#111111";
    const bold: Style = { fontFamily: "Times-Bold" };
    const Section = ({ title, children }: { title: string } & WithChildren) => (
      <P.Box style={{ marginTop: 7 }}>
        <P.Txt
          minPresenceAhead={40}
          style={{ fontFamily: "Times-Bold", fontSize: 12, textAlign: "center", textTransform: "uppercase", borderBottomWidth: 0.9, borderBottomColor: ink, paddingBottom: 1, marginBottom: 4 }}
        >
          {title}
        </P.Txt>
        {children}
      </P.Box>
    );
    const Row = ({ left, right }: { left: ReactNode; right?: string }) => (
      <P.Box style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <P.Txt style={{ flex: 1, paddingRight: 8 }}>{left}</P.Txt>
        {right ? <P.Txt style={{ fontSize: 9.5 }}>{smallCaps(right, 9.5, 7.6, P)}</P.Txt> : null}
      </P.Box>
    );
    const bulletText: Style = { textAlign: "justify" };
    const indent: Style = { width: 32, paddingLeft: 20 };
    const skills = allSkills(data);
    const half = Math.ceil(skills.length / 2);
    return (
      <P.Page style={{ paddingTop: 32, paddingBottom: 36, paddingHorizontal: 40, fontFamily: "Times-Roman", fontSize: 10, lineHeight: 1.22, color: ink }}>
        <P.Txt style={{ fontFamily: "Times-Bold", textAlign: "center", letterSpacing: 0.3, lineHeight: 1.1 }}>{smallCaps(data.name, 18, 14, P)}</P.Txt>
        {data.headline ? <P.Txt style={{ textAlign: "center", fontFamily: "Times-Italic", fontSize: 10.5, marginTop: 2 }}>{plain(data.headline)}</P.Txt> : null}
        {contactItems(data).length ? (
          <P.Txt style={{ textAlign: "center", fontSize: 9.5, marginTop: 3 }}>
            <ContactLine data={data} P={P} sep=" | " linkStyle={{ color: "#1a0dab", textDecoration: "underline" }} />
          </P.Txt>
        ) : null}
        <P.Box style={{ borderBottomWidth: 0.9, borderBottomColor: ink, marginTop: 6, marginBottom: 6 }} />
        {data.summary.trim() ? <P.Txt style={{ textAlign: "justify" }}>{rich(data.summary.trim(), P, bold)}</P.Txt> : null}

        {data.experience.length ? (
          <Section title="Professional Experience">
            {data.experience.map((e, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 1 }}>
                <Row
                  right={e.dates}
                  left={
                    <>
                      <P.Txt style={bold}>{plain(e.company || e.role)}</P.Txt>
                      {e.location ? `, ${plain(e.location)}` : ""}
                    </>
                  }
                />
                {e.company && e.role ? <P.Txt style={bold}>{plain(e.role)}</P.Txt> : null}
                <Bullets items={e.bullets} P={P} bold={bold} style={bulletText} dotStyle={indent} />
              </P.Box>
            ))}
          </Section>
        ) : null}

        {data.education.length ? (
          <Section title="Education">
            {data.education.map((e, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 2 }}>
                <Row right={e.dates} left={[e.institution, e.location].filter(Boolean).map(plain).join(", ") || plain(e.degree)} />
                {e.institution && e.degree ? <P.Txt>{rich(e.degree, P, bold)}</P.Txt> : null}
                <Bullets items={e.details} P={P} bold={bold} style={bulletText} dotStyle={indent} />
              </P.Box>
            ))}
          </Section>
        ) : null}

        {skills.length || data.languages.length ? (
          <Section title="Skills & Other">
            {skills.length ? (
              <P.Box wrap={false} style={{ flexDirection: "row" }}>
                {[skills.slice(0, half), skills.slice(half)].map((col, c) => (
                  <P.Box key={c} style={{ flex: 1 }}>
                    <Bullets items={col} P={P} bold={bold} dotStyle={indent} />
                  </P.Box>
                ))}
              </P.Box>
            ) : null}
            {data.languages.length ? (
              <P.Box style={{ flexDirection: "row", marginTop: 1.5 }}>
                <P.Txt style={indent}>•</P.Txt>
                <P.Txt style={{ flex: 1 }}>
                  <P.Txt style={bold}>Languages: </P.Txt>
                  {data.languages.map(plain).join(", ")}
                </P.Txt>
              </P.Box>
            ) : null}
          </Section>
        ) : null}

        {tidy(data.certifications).length ? (
          <Section title="Certifications">
            <Bullets items={data.certifications} P={P} bold={bold} dotStyle={indent} />
          </Section>
        ) : null}

        {data.projects.length ? (
          <Section title="Projects & Achievements">
            {data.projects.map((p, i) => (
              <P.Box key={i} wrap={false} style={{ flexDirection: "row", marginTop: 1.5 }}>
                <P.Txt style={indent}>•</P.Txt>
                <P.Box style={{ flex: 1 }}>
                  <P.Txt>
                    <P.Txt style={bold}>{plain(p.name)}:</P.Txt>
                    {p.link ? (
                      <P.Txt>
                        {"  "}
                        <P.Lnk src={linkParts(p.link).href} style={{ color: "#1a0dab", textDecoration: "underline" }}>
                          {linkParts(p.link).label}
                        </P.Lnk>
                      </P.Txt>
                    ) : null}
                  </P.Txt>
                  {tidy(p.bullets).map((b, j) => (
                    <P.Txt key={j} style={{ textAlign: "justify" }}>
                      {rich(b, P, bold)}
                    </P.Txt>
                  ))}
                </P.Box>
              </P.Box>
            ))}
          </Section>
        ) : null}
      </P.Page>
    );
  },
};

/* ================================================================== */
/* 3. Banner — coloured header band, skill tags                        */
/* ================================================================== */

const banner: TemplateDef = {
  id: "banner",
  name: "Banner",
  description: "Bold coloured header with skill tags",
  usesAccent: true,
  render: (data, accent, P) => {
    const bold: Style = { fontFamily: "Helvetica-Bold", color: "#18181b" };
    const soft = tint(accent, 0.88);
    const Section = ({ title, children }: { title: string } & WithChildren) => (
      <P.Box style={{ marginTop: 15 }}>
        <P.Box minPresenceAhead={40} style={{ flexDirection: "row", alignItems: "center", marginBottom: 7 }}>
          <P.Box style={{ width: 4, height: 12, backgroundColor: accent, marginRight: 7 }} />
          <P.Txt style={{ fontFamily: "Helvetica-Bold", fontSize: 10.5, letterSpacing: 1.2, textTransform: "uppercase", color: "#18181b" }}>{title}</P.Txt>
        </P.Box>
        {children}
      </P.Box>
    );
    const Head = ({ title, right, under }: { title: string; right?: string; under?: string }) => (
      <>
        <P.Box style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <P.Txt style={{ fontFamily: "Helvetica-Bold", fontSize: 10.5, color: "#18181b", flex: 1, paddingRight: 8 }}>{plain(title)}</P.Txt>
          {right ? <P.Txt style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: accent }}>{right}</P.Txt> : null}
        </P.Box>
        {under ? <P.Txt style={{ fontSize: 9.5, color: "#52525b" }}>{under}</P.Txt> : null}
      </>
    );
    return (
      <P.Page style={{ paddingTop: 36, paddingBottom: 40, paddingHorizontal: 42, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.45, color: "#27272a" }}>
        <P.Box style={{ backgroundColor: accent, marginTop: -36, marginHorizontal: -42, paddingTop: 30, paddingBottom: 22, paddingHorizontal: 42 }}>
          <P.Txt style={{ fontFamily: "Helvetica-Bold", fontSize: 26, color: "#ffffff", lineHeight: 1.1 }}>{plain(data.name)}</P.Txt>
          {data.headline ? <P.Txt style={{ fontSize: 12.5, color: tint(accent, 0.8), marginTop: 4 }}>{plain(data.headline)}</P.Txt> : null}
          {contactItems(data).length ? (
            <P.Txt style={{ fontSize: 9, color: "#ffffff", marginTop: 9 }}>
              <ContactLine data={data} P={P} sep="   •   " linkStyle={{ color: "#ffffff", textDecoration: "none" }} />
            </P.Txt>
          ) : null}
        </P.Box>
        {data.summary.trim() ? (
          <Section title="Profile">
            <P.Txt>{rich(data.summary.trim(), P, bold)}</P.Txt>
          </Section>
        ) : null}
        {data.experience.length ? (
          <Section title="Experience">
            {data.experience.map((e, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 10 }}>
                <Head title={e.role || e.company} right={e.dates} under={e.role ? [e.company, e.location].filter(Boolean).join(" · ") : undefined} />
                <Bullets items={e.bullets} P={P} bold={bold} dotStyle={{ color: accent }} dot="▪" />
              </P.Box>
            ))}
          </Section>
        ) : null}
        {data.education.length ? (
          <Section title="Education">
            {data.education.map((e, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 10 }}>
                <Head title={e.degree || e.institution} right={e.dates} under={e.degree ? [e.institution, e.location].filter(Boolean).join(" · ") : undefined} />
                <Bullets items={e.details} P={P} bold={bold} dotStyle={{ color: accent }} dot="▪" />
              </P.Box>
            ))}
          </Section>
        ) : null}
        {data.projects.length ? (
          <Section title="Projects">
            {data.projects.map((p, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 10 }}>
                <Head title={p.name} right={p.link ? linkParts(p.link).label : undefined} />
                <Bullets items={p.bullets} P={P} bold={bold} dotStyle={{ color: accent }} dot="▪" />
              </P.Box>
            ))}
          </Section>
        ) : null}
        {hasSkills(data) ? (
          <Section title="Skills">
            {data.skills
              .filter((g) => g.items.length)
              .map((g, i) => (
                <P.Box key={i} wrap={false} style={{ marginBottom: 4 }}>
                  {g.category ? <P.Txt style={{ fontFamily: "Helvetica-Bold", fontSize: 9, color: "#52525b", marginBottom: 3 }}>{plain(g.category)}</P.Txt> : null}
                  <P.Box style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {g.items.map((s, j) => (
                      <P.Box key={j} style={{ backgroundColor: soft, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 6, marginRight: 4, marginBottom: 4 }}>
                        <P.Txt style={{ fontSize: 9, color: accent, lineHeight: 1.3 }}>{plain(s)}</P.Txt>
                      </P.Box>
                    ))}
                  </P.Box>
                </P.Box>
              ))}
          </Section>
        ) : null}
        {tidy(data.certifications).length ? (
          <Section title="Certifications">
            <Bullets items={data.certifications} P={P} bold={bold} dotStyle={{ color: accent }} dot="▪" />
          </Section>
        ) : null}
        {data.languages.length ? (
          <Section title="Languages">
            <P.Txt>{data.languages.map(plain).join("  ·  ")}</P.Txt>
          </Section>
        ) : null}
      </P.Page>
    );
  },
};

/* ================================================================== */
/* 4. Timeline — dates in a left column, quiet grey headings           */
/* ================================================================== */

const timeline: TemplateDef = {
  id: "timeline",
  name: "Timeline",
  description: "Minimal, dates down the left side",
  usesAccent: true,
  render: (data, accent, P) => {
    const bold: Style = { fontFamily: "Helvetica-Bold", color: "#18181b" };
    const LEFT = 92;
    const Section = ({ title, children }: { title: string } & WithChildren) => (
      <P.Box style={{ marginTop: 16 }}>
        <P.Txt minPresenceAhead={40} style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5, letterSpacing: 2, textTransform: "uppercase", color: "#71717a", marginBottom: 7 }}>
          {title}
        </P.Txt>
        {children}
      </P.Box>
    );
    const Entry = ({ left, leftSub, children }: { left?: string; leftSub?: string } & WithChildren) => (
      <P.Box wrap={false} style={{ flexDirection: "row", marginBottom: 9 }}>
        <P.Box style={{ width: LEFT, paddingRight: 10 }}>
          {left ? <P.Txt style={{ fontSize: 8.5, color: "#52525b", lineHeight: 1.35 }}>{left}</P.Txt> : null}
          {leftSub ? <P.Txt style={{ fontSize: 8.5, color: "#a1a1aa", lineHeight: 1.35 }}>{leftSub}</P.Txt> : null}
        </P.Box>
        <P.Box style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: "#e4e4e7", paddingLeft: 12 }}>{children}</P.Box>
      </P.Box>
    );
    return (
      <P.Page style={{ paddingTop: 44, paddingBottom: 44, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 9.8, lineHeight: 1.45, color: "#3f3f46" }}>
        <P.Txt style={{ fontSize: 28, color: "#18181b", lineHeight: 1.1 }}>{plain(data.name)}</P.Txt>
        {data.headline ? <P.Txt style={{ fontSize: 12, color: accent, marginTop: 4 }}>{plain(data.headline)}</P.Txt> : null}
        {contactItems(data).length ? (
          <P.Txt style={{ fontSize: 8.8, color: "#71717a", marginTop: 8 }}>
            <ContactLine data={data} P={P} sep="   ·   " linkStyle={{ color: "#71717a", textDecoration: "none" }} />
          </P.Txt>
        ) : null}
        {data.summary.trim() ? <P.Txt style={{ marginTop: 14, fontSize: 10.3, color: "#27272a" }}>{rich(data.summary.trim(), P, bold)}</P.Txt> : null}
        {data.experience.length ? (
          <Section title="Experience">
            {data.experience.map((e, i) => (
              <Entry key={i} left={e.dates} leftSub={e.location}>
                <P.Txt style={bold}>{plain(e.role || e.company)}</P.Txt>
                {e.role && e.company ? <P.Txt style={{ color: accent, fontSize: 9.5 }}>{plain(e.company)}</P.Txt> : null}
                <Bullets items={e.bullets} P={P} bold={bold} dot="–" dotStyle={{ color: "#a1a1aa", width: 10 }} />
              </Entry>
            ))}
          </Section>
        ) : null}
        {data.education.length ? (
          <Section title="Education">
            {data.education.map((e, i) => (
              <Entry key={i} left={e.dates} leftSub={e.location}>
                <P.Txt style={bold}>{plain(e.degree || e.institution)}</P.Txt>
                {e.degree && e.institution ? <P.Txt style={{ color: accent, fontSize: 9.5 }}>{plain(e.institution)}</P.Txt> : null}
                <Bullets items={e.details} P={P} bold={bold} dot="–" dotStyle={{ color: "#a1a1aa", width: 10 }} />
              </Entry>
            ))}
          </Section>
        ) : null}
        {data.projects.length ? (
          <Section title="Projects">
            {data.projects.map((p, i) => (
              <Entry key={i} left={p.link ? linkParts(p.link).label : undefined}>
                <P.Txt style={bold}>{plain(p.name)}</P.Txt>
                <Bullets items={p.bullets} P={P} bold={bold} dot="–" dotStyle={{ color: "#a1a1aa", width: 10 }} />
              </Entry>
            ))}
          </Section>
        ) : null}
        {hasSkills(data) ? (
          <Section title="Skills">
            {data.skills
              .filter((g) => g.items.length)
              .map((g, i) => (
                <P.Box key={i} wrap={false} style={{ flexDirection: "row", marginBottom: 3 }}>
                  <P.Txt style={{ width: LEFT, paddingRight: 10, fontSize: 8.5, color: "#52525b" }}>{plain(g.category)}</P.Txt>
                  <P.Txt style={{ flex: 1, paddingLeft: 13 }}>{g.items.map(plain).join(", ")}</P.Txt>
                </P.Box>
              ))}
          </Section>
        ) : null}
        {tidy(data.certifications).length || data.languages.length ? (
          <Section title="More">
            {tidy(data.certifications).length ? (
              <P.Box wrap={false} style={{ flexDirection: "row", marginBottom: 3 }}>
                <P.Txt style={{ width: LEFT, paddingRight: 10, fontSize: 8.5, color: "#52525b" }}>Certifications</P.Txt>
                <P.Box style={{ flex: 1, paddingLeft: 13 }}>
                  {tidy(data.certifications).map((c, i) => (
                    <P.Txt key={i}>{rich(c, P, bold)}</P.Txt>
                  ))}
                </P.Box>
              </P.Box>
            ) : null}
            {data.languages.length ? (
              <P.Box wrap={false} style={{ flexDirection: "row" }}>
                <P.Txt style={{ width: LEFT, paddingRight: 10, fontSize: 8.5, color: "#52525b" }}>Languages</P.Txt>
                <P.Txt style={{ flex: 1, paddingLeft: 13 }}>{data.languages.map(plain).join(", ")}</P.Txt>
              </P.Box>
            ) : null}
          </Section>
        ) : null}
      </P.Page>
    );
  },
};

/* ================================================================== */
/* 5. Compact — fits more on one page                                  */
/* ================================================================== */

const compact: TemplateDef = {
  id: "compact",
  name: "Compact",
  description: "Dense layout that fits more on one page",
  usesAccent: true,
  render: (data, accent, P) => {
    const bold: Style = { fontFamily: "Helvetica-Bold", color: "#18181b" };
    const band = tint(accent, 0.9);
    const Section = ({ title, children }: { title: string } & WithChildren) => (
      <P.Box style={{ marginTop: 9 }}>
        <P.Box minPresenceAhead={30} style={{ backgroundColor: band, paddingVertical: 2, paddingHorizontal: 5, marginBottom: 4 }}>
          <P.Txt style={{ fontFamily: "Helvetica-Bold", fontSize: 9.2, letterSpacing: 0.8, textTransform: "uppercase", color: accent }}>{title}</P.Txt>
        </P.Box>
        {children}
      </P.Box>
    );
    const Head = ({ title, at, right }: { title: string; at?: string; right?: string }) => (
      <P.Box style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <P.Txt style={{ flex: 1, paddingRight: 8 }}>
          <P.Txt style={bold}>{plain(title)}</P.Txt>
          {at ? <P.Txt style={{ color: "#52525b" }}>{`  —  ${plain(at)}`}</P.Txt> : null}
        </P.Txt>
        {right ? <P.Txt style={{ fontSize: 8.5, color: "#52525b" }}>{right}</P.Txt> : null}
      </P.Box>
    );
    const groups = data.skills.filter((g) => g.items.length);
    // Side by side only when there are several named groups.
    const twoCols = groups.length > 1 && groups.every((g) => g.category);
    return (
      <P.Page style={{ paddingTop: 28, paddingBottom: 30, paddingHorizontal: 32, fontFamily: "Helvetica", fontSize: 9, lineHeight: 1.32, color: "#27272a" }}>
        <P.Box style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: accent, paddingBottom: 6 }}>
          <P.Box style={{ flex: 1, paddingRight: 12 }}>
            <P.Txt style={{ fontFamily: "Helvetica-Bold", fontSize: 20, color: "#18181b", lineHeight: 1.1 }}>{plain(data.name)}</P.Txt>
            {data.headline ? <P.Txt style={{ fontSize: 10.5, color: accent, marginTop: 2 }}>{plain(data.headline)}</P.Txt> : null}
          </P.Box>
          <P.Box style={{ width: 190 }}>
            {contactItems(data).map((c, i) => (
              <P.Txt key={i} style={{ fontSize: 8.3, color: "#52525b", textAlign: "right" }}>
                {c.href ? (
                  <P.Lnk src={c.href} style={{ color: "#52525b", textDecoration: "none" }}>
                    {c.label}
                  </P.Lnk>
                ) : (
                  c.label
                )}
              </P.Txt>
            ))}
          </P.Box>
        </P.Box>
        {data.summary.trim() ? <P.Txt style={{ marginTop: 7 }}>{rich(data.summary.trim(), P, bold)}</P.Txt> : null}
        {data.experience.length ? (
          <Section title="Experience">
            {data.experience.map((e, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 5 }}>
                <Head title={e.role || e.company} at={e.role ? [e.company, e.location].filter(Boolean).join(", ") : undefined} right={e.dates} />
                <Bullets items={e.bullets} P={P} bold={bold} dotStyle={{ width: 9 }} />
              </P.Box>
            ))}
          </Section>
        ) : null}
        {data.education.length ? (
          <Section title="Education">
            {data.education.map((e, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 5 }}>
                <Head title={e.degree || e.institution} at={e.degree ? [e.institution, e.location].filter(Boolean).join(", ") : undefined} right={e.dates} />
                <Bullets items={e.details} P={P} bold={bold} dotStyle={{ width: 9 }} />
              </P.Box>
            ))}
          </Section>
        ) : null}
        {data.projects.length ? (
          <Section title="Projects">
            {data.projects.map((p, i) => (
              <P.Box key={i} wrap={false} style={{ marginBottom: 5 }}>
                <Head title={p.name} right={p.link ? linkParts(p.link).label : undefined} />
                <Bullets items={p.bullets} P={P} bold={bold} dotStyle={{ width: 9 }} />
              </P.Box>
            ))}
          </Section>
        ) : null}
        {groups.length ? (
          <Section title="Skills">
            <P.Box wrap={false} style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {groups.map((g, i) => (
                <P.Txt key={i} style={{ width: twoCols ? "50%" : "100%", paddingRight: 8, marginBottom: 2 }}>
                  {g.category ? <P.Txt style={bold}>{plain(g.category)}: </P.Txt> : null}
                  {g.items.map(plain).join(", ")}
                </P.Txt>
              ))}
            </P.Box>
          </Section>
        ) : null}
        {tidy(data.certifications).length || data.languages.length ? (
          <Section title="Certifications & Languages">
            <Bullets items={data.certifications} P={P} bold={bold} dotStyle={{ width: 9 }} />
            {data.languages.length ? (
              <P.Txt style={{ marginTop: 2 }}>
                <P.Txt style={bold}>Languages: </P.Txt>
                {data.languages.map(plain).join(", ")}
              </P.Txt>
            ) : null}
          </Section>
        ) : null}
      </P.Page>
    );
  },
};

/* ---------- registry ---------- */

export const TEMPLATES: TemplateDef[] = [modern, classic, banner, timeline, compact];
export const DEFAULT_TEMPLATE: TemplateId = "modern";

export function getTemplate(id: string | null | undefined): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? modern;
}

/** Example content for the template thumbnails before someone's resume exists. */
export const SAMPLE_RESUME: ResumeData = {
  name: "Ayesha Khan",
  headline: "Frontend Developer",
  contact: { email: "ayesha.khan@example.com", phone: "+92 300 1234567", location: "Lahore, Pakistan", links: ["linkedin.com/in/ayesha-khan"] },
  summary:
    "Frontend developer with three years of experience building fast, accessible web apps with React and TypeScript. Comfortable owning features from design hand-off to release.",
  experience: [
    {
      role: "Frontend Developer",
      company: "Northwind Digital",
      location: "Lahore",
      dates: "Jan 2023 – Present",
      bullets: ["Built the **customer dashboard** in React used by 40,000 monthly users", "Cut page load time by **35%** by splitting bundles and lazy-loading images", "Mentored two junior developers through code reviews"],
    },
    {
      role: "Web Developer Intern",
      company: "Pixel Labs",
      location: "Islamabad",
      dates: "Jun 2022 – Dec 2022",
      bullets: ["Developed landing pages for three client launches", "Fixed accessibility issues across the main marketing site"],
    },
  ],
  education: [{ degree: "BS Computer Science", institution: "University of the Punjab", location: "Lahore", dates: "2018 – 2022", details: ["Final year project: **offline-first** note-taking app"] }],
  projects: [{ name: "Budget Buddy", link: "github.com/ayesha/budget-buddy", bullets: ["Personal finance tracker with charts and CSV export"] }],
  skills: [
    { category: "Languages", items: ["TypeScript", "JavaScript", "HTML", "CSS"] },
    { category: "Tools", items: ["React", "Next.js", "Tailwind CSS", "Git", "Figma"] },
  ],
  certifications: ["Meta Front-End Developer Certificate"],
  languages: ["English", "Urdu"],
};
