// Liquid Glass effects that CSS alone can't do. Two parts, both progressive
// enhancement — the site looks right without them:
//
// 1. Edge lensing (.lg-refract): content behind the glass bends near its
//    rounded edges, like looking through a thick lens. Built from an SVG
//    displacement map sized to each element and applied with
//    `backdrop-filter: url(#…)`. Only Chromium browsers support SVG filters
//    in backdrop-filter, so it's limited to Chrome/Edge/Opera on desktop, and
//    to a handful of floating controls (it's GPU work on every frame).
//
// 2. Pointer light: the soft sheen on every glass surface drifts toward the
//    mouse (sets --lg-x / --lg-y, which globals.css animates).
//
// Both switch off for "reduce motion" and "reduce transparency".

/* ------------------------------------------------------------------ */
/* Displacement map (pure — no DOM, unit-testable)                     */
/* ------------------------------------------------------------------ */

/**
 * RGBA pixels for a rounded-rect lens. Red/green encode how far to shift the
 * backdrop horizontally/vertically (128 = no shift). Within `band` pixels of
 * the edge, pixels sample from further inside, strongest right at the edge.
 */
export function buildDisplacementMap(width: number, height: number, radius: number, band: number): Uint8ClampedArray {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const data = new Uint8ClampedArray(w * h * 4);
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.max(0, Math.min(radius, hw, hh));
  const b = Math.max(1, band);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const qx = Math.abs(px) - (hw - r);
      const qy = Math.abs(py) - (hh - r);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const outside = Math.hypot(ox, oy);
      // Signed distance to the rounded rectangle's edge (negative = inside).
      const sd = outside + Math.min(Math.max(qx, qy), 0) - r;
      const depth = -sd;

      let dx = 0;
      let dy = 0;
      if (depth < b) {
        // Outward normal of the nearest edge.
        let nx: number;
        let ny: number;
        if (qx > 0 && qy > 0 && outside > 0) {
          nx = ox / outside;
          ny = oy / outside;
        } else if (qx > qy) {
          nx = 1;
          ny = 0;
        } else {
          nx = 0;
          ny = 1;
        }
        nx *= px < 0 ? -1 : 1;
        ny *= py < 0 ? -1 : 1;
        const t = 1 - Math.max(0, depth) / b; // 1 at the edge → 0 at band end
        const m = t * t * (3 - 2 * t); // smoothstep
        // Sample inward (opposite to the outward normal).
        dx = -nx * m;
        dy = -ny * m;
      }

      const i = (y * w + x) * 4;
      data[i] = Math.round(128 + dx * 127);
      data[i + 1] = Math.round(128 + dy * 127);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return data;
}

/** Lens strength for an element of this size: [edge band px, max shift scale]. */
export function lensParams(width: number, height: number) {
  const band = Math.min(30, Math.max(12, Math.min(width, height) * 0.42));
  return { band, scale: Math.round(band * 1.7) };
}

/* ------------------------------------------------------------------ */
/* DOM side                                                            */
/* ------------------------------------------------------------------ */

const SVG_NS = "http://www.w3.org/2000/svg";
const GLASS_SELECTOR = ".glass, .glass-strong, .glass-pill, .glass-media";
const MAP_RESOLUTION = 0.5; // the map is smooth, half resolution is plenty

type Tracked = { id: string; filter: SVGFilterElement; ro: ResizeObserver; timer?: number };

function isChromium() {
  const uaData = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
  return Boolean(uaData?.brands?.some((b) => /Chromium|Google Chrome|Microsoft Edge|Opera/i.test(b.brand)));
}

function mapDataUrl(width: number, height: number, radius: number, band: number) {
  const mw = Math.max(2, Math.round(width * MAP_RESOLUTION));
  const mh = Math.max(2, Math.round(height * MAP_RESOLUTION));
  const canvas = document.createElement("canvas");
  canvas.width = mw;
  canvas.height = mh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const pixels = buildDisplacementMap(mw, mh, radius * MAP_RESOLUTION, band * MAP_RESOLUTION);
  const image = ctx.createImageData(mw, mh);
  image.data.set(pixels);
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Starts the effects. Returns a cleanup function. Safe to call more than once
 * (later calls are no-ops while the first is running).
 */
export function startLiquidGlass(): () => void {
  if (typeof window === "undefined") return () => {};
  const w = window as Window & { __liquidGlassStop?: () => void };
  if (w.__liquidGlassStop) return () => {};

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduceTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const cleanups: (() => void)[] = [];

  /* ---------- 1. Pointer light ---------- */
  let lit: HTMLElement | null = null;
  let frame = 0;
  let lastEvent: PointerEvent | null = null;

  const releaseLit = () => {
    if (!lit) return;
    lit.style.removeProperty("--lg-x");
    lit.style.removeProperty("--lg-y");
    lit = null;
  };

  const onPointerMove = (e: PointerEvent) => {
    lastEvent = e;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const ev = lastEvent;
      if (!ev || reduceMotion.matches || !finePointer.matches) return;
      const target = ev.target instanceof Element ? (ev.target.closest(GLASS_SELECTOR) as HTMLElement | null) : null;
      if (target !== lit) releaseLit();
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      target.style.setProperty("--lg-x", `${Math.max(0, Math.min(100, x)).toFixed(1)}%`);
      target.style.setProperty("--lg-y", `${Math.max(0, Math.min(100, y)).toFixed(1)}%`);
      lit = target;
    });
  };
  const onPointerLeave = () => releaseLit();
  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  cleanups.push(() => {
    document.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    if (frame) cancelAnimationFrame(frame);
    releaseLit();
  });

  /* ---------- 2. Edge lensing ---------- */
  const tracked = new Map<HTMLElement, Tracked>();
  let svg: SVGSVGElement | null = null;
  let counter = 0;

  const lensingAllowed = () =>
    isChromium() && finePointer.matches && !reduceMotion.matches && !reduceTransparency.matches;

  const ensureSvg = () => {
    if (svg) return svg;
    svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.style.width = "0";
    svg.style.height = "0";
    svg.style.overflow = "hidden";
    svg.style.pointerEvents = "none";
    svg.appendChild(document.createElementNS(SVG_NS, "defs"));
    document.body.appendChild(svg);
    return svg;
  };

  const render = (el: HTMLElement, t: Tracked) => {
    const rect = el.getBoundingClientRect();
    const width = el.offsetWidth || rect.width;
    const height = el.offsetHeight || rect.height;
    if (width < 24 || height < 24) return;
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const { band, scale } = lensParams(width, height);
    const url = mapDataUrl(width, height, radius, band);
    if (!url) return;

    const f = t.filter;
    f.innerHTML = "";
    for (const [k, v] of Object.entries({ x: "0", y: "0", width: String(width), height: String(height) })) {
      f.setAttribute(k, v);
    }
    const img = document.createElementNS(SVG_NS, "feImage");
    img.setAttribute("href", url);
    img.setAttribute("x", "0");
    img.setAttribute("y", "0");
    img.setAttribute("width", String(width));
    img.setAttribute("height", String(height));
    img.setAttribute("preserveAspectRatio", "none");
    img.setAttribute("result", "map");
    const disp = document.createElementNS(SVG_NS, "feDisplacementMap");
    disp.setAttribute("in", "SourceGraphic");
    disp.setAttribute("in2", "map");
    disp.setAttribute("scale", String(scale));
    disp.setAttribute("xChannelSelector", "R");
    disp.setAttribute("yChannelSelector", "G");
    f.append(img, disp);

    const value = `url(#${t.id}) blur(var(--lg-refract-blur)) saturate(var(--lg-sat)) brightness(var(--lg-bright))`;
    el.style.setProperty("backdrop-filter", value);
    el.style.setProperty("-webkit-backdrop-filter", value);
    el.dataset.lgReady = "true";
  };

  const attach = (el: HTMLElement) => {
    if (tracked.has(el)) return;
    const defs = ensureSvg().firstElementChild as SVGDefsElement;
    const id = `lg-lens-${++counter}`;
    const filter = document.createElementNS(SVG_NS, "filter") as SVGFilterElement;
    filter.setAttribute("id", id);
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("primitiveUnits", "userSpaceOnUse");
    filter.setAttribute("color-interpolation-filters", "sRGB");
    defs.appendChild(filter);
    const t: Tracked = {
      id,
      filter,
      ro: new ResizeObserver(() => {
        window.clearTimeout(t.timer);
        t.timer = window.setTimeout(() => render(el, t), 120);
      }),
    };
    tracked.set(el, t);
    t.ro.observe(el);
    render(el, t);
  };

  const detach = (el: HTMLElement) => {
    const t = tracked.get(el);
    if (!t) return;
    t.ro.disconnect();
    window.clearTimeout(t.timer);
    t.filter.remove();
    el.style.removeProperty("backdrop-filter");
    el.style.removeProperty("-webkit-backdrop-filter");
    delete el.dataset.lgReady;
    tracked.delete(el);
  };

  const sync = () => {
    const allowed = lensingAllowed();
    tracked.forEach((_, el) => {
      if (!allowed || !el.isConnected) detach(el);
    });
    if (allowed) document.querySelectorAll<HTMLElement>(".lg-refract").forEach(attach);
  };

  let syncQueued = false;
  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      sync();
    });
  };

  // Elements come and go with React (menus opening, page changes).
  const mo = new MutationObserver(queueSync);
  mo.observe(document.body, { childList: true, subtree: true });
  [reduceMotion, reduceTransparency, finePointer].forEach((mq) => mq.addEventListener("change", queueSync));
  sync();

  cleanups.push(() => {
    mo.disconnect();
    [reduceMotion, reduceTransparency, finePointer].forEach((mq) => mq.removeEventListener("change", queueSync));
    tracked.forEach((_, el) => detach(el));
    svg?.remove();
  });

  const stop = () => {
    cleanups.forEach((fn) => fn());
    delete w.__liquidGlassStop;
  };
  w.__liquidGlassStop = stop;
  return stop;
}
