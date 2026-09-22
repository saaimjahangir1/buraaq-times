import type { SVGProps } from "react";

/**
 * Solid feather glyph matching the site's brand mark, in the accent
 * color (#F6A700) via currentColor — so `className="text-signal"`
 * (or any text-color utility) controls its color exactly like the
 * lucide icons it replaces. Same 24x24 viewBox/size convention too.
 */
export default function FeatherMark({
  size = 24,
  className,
  ...props
}: { size?: number; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...props}
    >
      <path
        d="M 20.00,2.30 L 18.80,1.11 L 17.76,0.73 L 16.73,0.53 L 15.71,0.44 L 14.71,0.44 L 13.71,0.52 L 12.72,0.67 L 11.67,0.76 L 11.00,1.47 L 10.37,2.20 L 10.80,4.19 L 9.24,3.70 L 8.74,4.47 L 8.27,5.26 L 8.77,6.89 L 7.46,6.86 L 7.12,7.67 L 6.81,8.48 L 7.26,9.78 L 6.31,10.13 L 6.11,10.96 L 6.45,12.05 L 5.84,12.62 L 5.76,13.45 L 5.73,14.28 L 5.76,15.12 L 5.10,18.00 L 6.60,19.90 L 4.40,20.60 L 4.90,18.60 L 6.81,14.70 L 7.35,14.14 L 7.89,13.59 L 7.95,12.82 L 9.00,12.58 L 9.56,12.12 L 9.41,11.21 L 10.71,11.27 L 11.29,10.89 L 11.88,10.54 L 11.55,9.38 L 13.07,9.92 L 13.66,9.65 L 14.27,9.41 L 13.85,7.95 L 15.47,9.02 L 16.08,8.86 L 16.68,8.73 L 16.94,8.03 L 17.31,7.43 L 17.71,6.82 L 18.14,6.18 L 18.60,5.51 L 19.09,4.77 L 19.60,3.91 Z"
        fill="currentColor"
      />
      <path
        d="M 20.00,2.30 L 18.15,2.84 L 16.40,3.54 L 14.77,4.38 L 13.26,5.36 L 11.86,6.47 L 10.57,7.69 L 9.41,9.01 L 8.37,10.44 L 7.46,11.95 L 6.66,13.54 L 6.00,15.20 L 6.60,19.90 L 4.40,20.60"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={0.35}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
