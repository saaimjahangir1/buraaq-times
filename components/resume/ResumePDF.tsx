// Loaded ONLY via dynamic import() when the user clicks "Download PDF",
// so @react-pdf/renderer never ships in the initial page bundle or runs on the server.
import type { ReactNode } from "react";
import { Document, Font, Link, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { linkParts, tidy, type ResumeData } from "@/lib/resume/resume";

// Stop react-pdf splitting words with hyphens mid-line.
Font.registerHyphenationCallback((word) => [word]);

// Built-in Helvetica: no font download, renders identically everywhere,
// and is what most ATS parsers read best. (Latin script only.)
const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 44,
    paddingHorizontal: 46,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.45,
    color: "#27272a",
  },
  name: { fontFamily: "Helvetica-Bold", fontSize: 24, color: "#18181b", lineHeight: 1.1 },
  headline: { fontSize: 12, marginTop: 4 },
  contact: { fontSize: 9, color: "#52525b", marginTop: 7 },
  contactLink: { color: "#52525b", textDecoration: "none" },
  section: { marginTop: 15 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    paddingBottom: 3,
    marginBottom: 7,
    borderBottomWidth: 1.2,
  },
  entry: { marginBottom: 9 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontFamily: "Helvetica-Bold", color: "#18181b", flex: 1, paddingRight: 8 },
  dates: { fontSize: 9, color: "#52525b" },
  sub: { fontSize: 9.5, color: "#52525b" },
  bulletRow: { flexDirection: "row", marginTop: 2 },
  bulletDot: { width: 11 },
  bulletText: { flex: 1 },
  skillRow: { marginBottom: 3 },
  bold: { fontFamily: "Helvetica-Bold", color: "#18181b" },
});

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {tidy(items).map((b, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: accent, borderBottomColor: accent }]} minPresenceAhead={40}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function ResumeDocument({ data, accent }: { data: ResumeData; accent: string }) {
  const { contact } = data;
  const contactItems: { label: string; href?: string }[] = [
    contact.email ? { label: contact.email, href: `mailto:${contact.email}` } : null,
    contact.phone ? { label: contact.phone } : null,
    contact.location ? { label: contact.location } : null,
    ...contact.links.map((l) => linkParts(l)),
  ].filter((x): x is { label: string; href?: string } => Boolean(x));

  const skills = data.skills.filter((g) => g.items.length);

  return (
    <Document title={`${data.name} – Resume`} author={data.name} creator="Buraaq Times Resume Builder" producer="Buraaq Times">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View>
          <Text style={s.name}>{data.name}</Text>
          {data.headline ? <Text style={[s.headline, { color: accent }]}>{data.headline}</Text> : null}
          {contactItems.length ? (
            <Text style={s.contact}>
              {contactItems.map((c, i) => (
                <Text key={i}>
                  {i > 0 ? "   |   " : ""}
                  {c.href ? (
                    <Link src={c.href} style={s.contactLink}>
                      {c.label}
                    </Link>
                  ) : (
                    c.label
                  )}
                </Text>
              ))}
            </Text>
          ) : null}
        </View>

        {data.summary.trim() ? (
          <Section title="Profile" accent={accent}>
            <Text>{data.summary.trim()}</Text>
          </Section>
        ) : null}

        {data.experience.length ? (
          <Section title="Experience" accent={accent}>
            {data.experience.map((e, i) => (
              <View key={i} style={s.entry} wrap={false}>
                <View style={s.row}>
                  <Text style={s.title}>{e.role || e.company}</Text>
                  {e.dates ? <Text style={s.dates}>{e.dates}</Text> : null}
                </View>
                {e.role && (e.company || e.location) ? (
                  <Text style={s.sub}>{[e.company, e.location].filter(Boolean).join(", ")}</Text>
                ) : null}
                <Bullets items={e.bullets} />
              </View>
            ))}
          </Section>
        ) : null}

        {data.education.length ? (
          <Section title="Education" accent={accent}>
            {data.education.map((e, i) => (
              <View key={i} style={s.entry} wrap={false}>
                <View style={s.row}>
                  <Text style={s.title}>{e.degree || e.institution}</Text>
                  {e.dates ? <Text style={s.dates}>{e.dates}</Text> : null}
                </View>
                {e.degree && (e.institution || e.location) ? (
                  <Text style={s.sub}>{[e.institution, e.location].filter(Boolean).join(", ")}</Text>
                ) : null}
                <Bullets items={e.details} />
              </View>
            ))}
          </Section>
        ) : null}

        {data.projects.length ? (
          <Section title="Projects" accent={accent}>
            {data.projects.map((p, i) => (
              <View key={i} style={s.entry} wrap={false}>
                <View style={s.row}>
                  <Text style={s.title}>{p.name}</Text>
                  {p.link ? (
                    <Link src={linkParts(p.link).href} style={[s.dates, { textDecoration: "none" }]}>
                      {linkParts(p.link).label}
                    </Link>
                  ) : null}
                </View>
                <Bullets items={p.bullets} />
              </View>
            ))}
          </Section>
        ) : null}

        {skills.length ? (
          <Section title="Skills" accent={accent}>
            {skills.map((g, i) => (
              <Text key={i} style={s.skillRow}>
                {g.category ? <Text style={s.bold}>{g.category}: </Text> : null}
                {g.items.join(", ")}
              </Text>
            ))}
          </Section>
        ) : null}

        {tidy(data.certifications).length ? (
          <Section title="Certifications" accent={accent}>
            <Bullets items={data.certifications} />
          </Section>
        ) : null}

        {data.languages.length ? (
          <Section title="Languages" accent={accent}>
            <Text>{data.languages.join(", ")}</Text>
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderResumePdf(data: ResumeData, accent: string): Promise<Blob> {
  return pdf(<ResumeDocument data={data} accent={accent} />).toBlob();
}
