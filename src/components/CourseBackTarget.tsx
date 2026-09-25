"use client";

import { usePathname } from "next/navigation";
import { useSetBackTarget } from "@/lib/backTarget";

/** Laat de terugbalk van deze pagina naar de gegeven cursus gaan (zie src/lib/backTarget.ts). */
export default function CourseBackTarget({ href, parent }: { href: string; parent: string }) {
  useSetBackTarget(usePathname(), href, parent);
  return null;
}
