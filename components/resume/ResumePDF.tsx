// Loaded ONLY via dynamic import() when a PDF is needed (download / saved copy),
// so @react-pdf/renderer never ships in the initial page bundle or runs on the server.
import { Document, Font, Link, Page, Text, View, pdf } from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/resume/resume";
import { getTemplate, plain, type Prims, type Style } from "./templates";

// Stop react-pdf splitting words with hyphens mid-line.
Font.registerHyphenationCallback((word) => [word]);

// The template building blocks, drawn as PDF. ResumePreview.tsx draws the same
// templates as HTML, so the preview matches the download.
const pdfPrims: Prims = {
  Page: ({ style, children }) => (
    <Page size="A4" style={style as never}>
      {children}
    </Page>
  ),
  Box: ({ style, wrap, minPresenceAhead, children }) => (
    <View style={style as never} wrap={wrap} minPresenceAhead={minPresenceAhead}>
      {children}
    </View>
  ),
  Txt: ({ style, minPresenceAhead, children }) => (
    <Text style={style as never} minPresenceAhead={minPresenceAhead}>
      {children}
    </Text>
  ),
  Lnk: ({ src, style, children }) => (
    <Link src={src} style={style as Style as never}>
      {children}
    </Link>
  ),
};

export function ResumeDocument({ data, accent, template }: { data: ResumeData; accent: string; template?: string }) {
  const name = plain(data.name);
  return (
    <Document title={`${name} – Resume`} author={name} creator="Buraaq Times Resume Builder" producer="Buraaq Times">
      {getTemplate(template).render(data, accent, pdfPrims)}
    </Document>
  );
}

export async function renderResumePdf(data: ResumeData, accent: string, template?: string): Promise<Blob> {
  return pdf(<ResumeDocument data={data} accent={accent} template={template} />).toBlob();
}
