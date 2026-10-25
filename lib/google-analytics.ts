import "server-only";
import crypto from "crypto";

// Reads Google Analytics 4 numbers for the admin-only "Google Analytics" page
// in the CMS, through the Google Analytics Data API with a read-only service
// account. Needs three settings (VPS .env and Vercel):
//   GA_PROPERTY_ID     the numeric property ID (GA → Admin → Property details)
//   GA_CLIENT_EMAIL    the service account's email (client_email in its JSON key)
//   GA_PRIVATE_KEY     the private_key from the JSON key, "\n"s included
// The service account must be added to the GA property as a Viewer.

export type RangeDays = 7 | 28 | 90;
export const RANGES: RangeDays[] = [7, 28, 90];

export class GaNotConfiguredError extends Error {}
export class GaError extends Error {}

export function gaConfigured() {
  return Boolean(process.env.GA_PROPERTY_ID && process.env.GA_CLIENT_EMAIL && process.env.GA_PRIVATE_KEY);
}

function privateKey() {
  // Accept the key exactly as it appears in the JSON file ("\n" escapes) or
  // with real line breaks, with or without surrounding quotes.
  return (process.env.GA_PRIVATE_KEY || "").trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

/** The signed sign-in request Google expects from a service account (RS256 JWT). */
export function signServiceAccountJwt(email: string, pem: string, now = Math.floor(Date.now() / 1000)) {
  let key: crypto.KeyObject;
  try {
    key = crypto.createPrivateKey(pem);
  } catch {
    throw new GaError("GA_PRIVATE_KEY isn't a valid private key. Copy the whole private_key value from the JSON key file.");
  }
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), key).toString("base64url");
  return `${unsigned}.${signature}`;
}

let token: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const assertion = signServiceAccountJwt(process.env.GA_CLIENT_EMAIL!.trim(), privateKey());

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !data.access_token) {
    console.error("[ga] token request failed:", res.status, data);
    throw new GaError(
      `Google refused the service account sign-in (${data.error_description || res.status}). Check GA_CLIENT_EMAIL and GA_PRIVATE_KEY.`
    );
  }
  token = { value: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return token.value;
}

type Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Report = { rows?: Row[] };

async function call<T>(path: string, body: unknown): Promise<T> {
  const property = process.env.GA_PROPERTY_ID!.trim().replace(/^properties\//, "");
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; status?: string } };
  if (!res.ok) {
    const msg = data.error?.message || String(res.status);
    console.error("[ga] report failed:", res.status, msg);
    if (/has not been used|is disabled/i.test(msg)) {
      throw new GaError("The Google Analytics Data API isn't turned on for the service account's Google Cloud project yet.");
    }
    if (res.status === 403) {
      throw new GaError(
        `The service account can't read this property. In Google Analytics → Admin → Property access management, add ${process.env.GA_CLIENT_EMAIL} as a Viewer.`
      );
    }
    if (res.status === 404 || /property/i.test(msg)) {
      throw new GaError("Google Analytics couldn't find that property. GA_PROPERTY_ID should be the number shown in Admin → Property details.");
    }
    throw new GaError(`Google Analytics returned an error: ${msg}`);
  }
  return data;
}

const num = (r: Row | undefined, i: number) => Number(r?.metricValues?.[i]?.value ?? 0);
const dim = (r: Row, i: number) => r.dimensionValues?.[i]?.value ?? "";

export type GaSummary = {
  days: RangeDays;
  totals: { users: number; newUsers: number; sessions: number; views: number; avgEngagementSec: number; engagementRate: number };
  previous: GaSummary["totals"];
  daily: { date: string; users: number; views: number }[];
  topPages: { path: string; title: string; views: number; users: number }[];
  channels: { name: string; value: number }[];
  sources: { name: string; value: number }[];
  countries: { name: string; value: number }[];
  devices: { name: string; value: number }[];
  realtimeUsers: number | null;
  fetchedAt: string;
};

const cache = new Map<RangeDays, { at: number; data: GaSummary }>();
const CACHE_MS = 5 * 60_000;

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Every day in the range, so days with no visits still show as 0 on the chart. */
export function fillDays(days: number, rows: { date: string; users: number; views: number }[], today = new Date()) {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const out: { date: string; users: number; views: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const key = isoDay(d);
    out.push(byDate.get(key) ?? { date: key, users: 0, views: 0 });
  }
  return out;
}

export async function getGaSummary(days: RangeDays): Promise<GaSummary> {
  if (!gaConfigured()) throw new GaNotConfiguredError();
  const hit = cache.get(days);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const current = { startDate: `${days - 1}daysAgo`, endDate: "today" };
  const previous = { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo` };
  const list = (dimension: string, metric: string, limit: number) => ({
    dateRanges: [current],
    dimensions: [{ name: dimension }],
    metrics: [{ name: metric }],
    orderBys: [{ metric: { metricName: metric }, desc: true }],
    limit,
  });

  const totalsMetrics = ["activeUsers", "newUsers", "sessions", "screenPageViews", "userEngagementDuration", "engagementRate"].map(
    (name) => ({ name })
  );

  const [a, b, realtime] = await Promise.all([
    call<{ reports: Report[] }>("batchRunReports", {
      requests: [
        { dateRanges: [current], metrics: totalsMetrics },
        { dateRanges: [previous], metrics: totalsMetrics },
        {
          dateRanges: [current],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        },
        {
          dateRanges: [current],
          dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
          metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 10,
        },
        list("sessionDefaultChannelGroup", "sessions", 8),
      ],
    }),
    call<{ reports: Report[] }>("batchRunReports", {
      requests: [list("sessionSource", "sessions", 8), list("country", "activeUsers", 8), list("deviceCategory", "activeUsers", 5)],
    }),
    call<Report>("runRealtimeReport", { metrics: [{ name: "activeUsers" }] }).catch(() => null),
  ]);

  const totalsOf = (r: Report | undefined) => {
    const row = r?.rows?.[0];
    const users = num(row, 0);
    return {
      users,
      newUsers: num(row, 1),
      sessions: num(row, 2),
      views: num(row, 3),
      avgEngagementSec: users ? num(row, 4) / users : 0,
      engagementRate: num(row, 5),
    };
  };
  const pairs = (r: Report | undefined) => (r?.rows ?? []).map((row) => ({ name: dim(row, 0) || "(not set)", value: num(row, 0) }));

  const data: GaSummary = {
    days,
    totals: totalsOf(a.reports[0]),
    previous: totalsOf(a.reports[1]),
    daily: fillDays(
      days,
      (a.reports[2]?.rows ?? []).map((row) => {
        const d = dim(row, 0); // YYYYMMDD
        return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, users: num(row, 0), views: num(row, 1) };
      })
    ),
    topPages: (a.reports[3]?.rows ?? []).map((row) => ({ path: dim(row, 0), title: dim(row, 1), views: num(row, 0), users: num(row, 1) })),
    channels: pairs(a.reports[4]),
    sources: pairs(b.reports[0]),
    countries: pairs(b.reports[1]),
    devices: pairs(b.reports[2]),
    realtimeUsers: realtime ? num(realtime.rows?.[0], 0) : null,
    fetchedAt: new Date().toISOString(),
  };
  cache.set(days, { at: Date.now(), data });
  return data;
}
