import Image from "next/image";

// Real aspect ratio (w/h) of the trimmed brand-mark asset. Keep in sync
// if the source file is ever re-exported.
const MARK_ASPECT = 423 / 125;

export default function BrandMark({
  className,
  width,
  height,
  idle = true,
}: {
  className?: string;
  width?: number;
  height?: number;
  idle?: boolean;
}) {
  // Fixed-pixel mode: only height needs to be supplied — width is derived
  // from the real ratio so it can never crop or squash again.
  let sizeStyle: { width: number; height: number } | undefined;
  if (!className) {
    const h = height ?? 60;
    const w = width ?? Math.round(h * MARK_ASPECT);
    sizeStyle = { width: w, height: h };
  }

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${idle ? "brand-mark-idle" : ""} ${className ?? ""}`}
      style={sizeStyle}
    >
      <Image src="/brand-mark.png" alt="Buraaq Times" fill className="object-contain" priority />
    </span>
  );
}
