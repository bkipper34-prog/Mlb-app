"use client";
import dynamic from "next/dynamic";
const MLBApp = dynamic(() => import("./MLBApp"), { ssr: false });
export default function Page() {
  return <MLBApp />;
}
