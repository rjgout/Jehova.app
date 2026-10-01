"use client";

import { usePathname } from "next/navigation";
import { useSetBackTarget } from "@/lib/backTarget";

/** Geeft de terugbalk van deze pagina de cursus waar hij bij hoort (zie src/lib/backTarget.ts). */
export default function CourseBackTarget({ href, parent }: { href: string; parent: string }) {
  useSetBackTarget(usePathname(), href, parent);
  return null;
}
