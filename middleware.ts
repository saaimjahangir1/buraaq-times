import { NextRequest, NextResponse } from "next/server";

// Cross-site request check for the API ("tight CORS").
//
// The site never lets other websites call its API: no Access-Control-Allow-*
// headers are ever sent, so browsers already block other sites from READING
// answers. This also stops other sites from SENDING changes (comments, sign-ups,
// reactions, CMS actions…) by refusing any POST/PUT/PATCH/DELETE that a browser
// says came from another website.
//
// Requests without these browser headers (the VPS scheduler, email providers'
// one-click unsubscribe) are let through — the CSRF token and the cron secret
// still protect the routes that need them.

const SITE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://buraaqtimes.com").host.toLowerCase();
  } catch {
    return "buraaqtimes.com";
  }
})();

function allowedHosts(req: NextRequest) {
  const hosts = new Set<string>([SITE_HOST, SITE_HOST.startsWith("www.") ? SITE_HOST.slice(4) : `www.${SITE_HOST}`]);
  for (const h of [
    req.headers.get("host"),
    req.headers.get("x-forwarded-host"),
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    if (h) hosts.add(h.split(",")[0].trim().toLowerCase());
  }
  return hosts;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Largest request body each API accepts. Oversized requests are refused before
// any code reads them (protects against memory-exhaustion attacks, e.g. the
// open zod issue, until the Next.js 16 / zod 4 upgrade).
const MB = 1024 * 1024;
function maxBodyBytes(pathname: string) {
  if (pathname.startsWith("/api/cms/media")) return 10 * MB; // image uploads (max 8MB file)
  if (pathname.startsWith("/api/resume/save")) return 3 * MB; // resume PDF (max 2MB)
  return 2 * MB; // everything else is JSON: articles, comments, settings…
}

export function middleware(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return NextResponse.next();

  const length = Number(req.headers.get("content-length") || 0);
  if (length > maxBodyBytes(req.nextUrl.pathname)) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const origin = req.headers.get("origin");
  if (origin) {
    let host = "";
    try {
      host = new URL(origin).host.toLowerCase();
    } catch {
      /* "null" or garbage → not allowed */
    }
    if (!host || !allowedHosts(req).has(host)) {
      return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // No Origin header: modern browsers still say where the request came from.
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
