"use client";

import dynamic from "next/dynamic";

const AmbientScene = dynamic(() => import("./AmbientScene"), { ssr: false });

export default function AmbientSceneLoader() {
  return <AmbientScene />;
}
