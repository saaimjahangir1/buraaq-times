import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component, so its search-engine title and
// description live here.
export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description: "Get in touch with Buraaq Times — send a news tip, feedback, a correction or a partnership enquiry.",
  path: "/contact",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
