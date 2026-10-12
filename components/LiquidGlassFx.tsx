"use client";

import { useEffect } from "react";
import { startLiquidGlass } from "@/lib/liquid-glass";

/** Turns on the Liquid Glass extras (edge lensing, pointer light). Renders nothing. */
export default function LiquidGlassFx() {
  useEffect(() => startLiquidGlass(), []);
  return null;
}
