import { Flame, Zap, type LucideProps } from "lucide-react";

export type SystemIconKind = "streak" | "xp";

/** Centrale bron voor de systeemiconen die in de header canonical zijn. */
export default function SystemIcon({ kind, strokeWidth = 2.4, ...props }: { kind: SystemIconKind } & LucideProps) {
  const Icon = kind === "streak" ? Flame : Zap;
  return <Icon {...props} strokeWidth={strokeWidth} />;
}
