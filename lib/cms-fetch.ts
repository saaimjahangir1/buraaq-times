"use client";

import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-constants";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Use this instead of the global `fetch` for any call to /api/cms/* that
 * isn't a plain GET. It attaches the CSRF header automatically; everything
 * else behaves exactly like `fetch`.
 */
export function cmsFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return fetch(input, init);

  const token = readCookie(CSRF_COOKIE);
  const headers = new Headers(init.headers);
  if (token) headers.set(CSRF_HEADER, token);

  return fetch(input, { ...init, headers });
}
