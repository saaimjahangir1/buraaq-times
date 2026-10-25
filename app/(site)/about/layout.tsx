import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component, so its search-engine title and
// description live here.
export const metadata: Metadata = pageMetadata({
  title: "About Us",
  description: "Buraaq Times is an independent digital publication bringing you news, articles and perspectives that matter. Learn about our vision, mission and team.",
  path: "/about",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
