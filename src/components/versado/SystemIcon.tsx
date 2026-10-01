import { Zap, type LucideProps } from "lucide-react";

export type SystemIconKind = "streak" | "xp";

/**
 * Centrale bron voor de systeemiconen die in de header canonical zijn.
 *
 * De reeksvlam is een eigen illustratie (public/icons/streak-flame*.webp),
 * geen lijnicoon: hij neemt dus geen tekstkleur over. fill="none" geeft, net
 * als bij het oude lijnicoon, de "lege" vlam: vandaag nog niet gestudeerd.
 * De maat komt zoals altijd uit className (bv. h-4 w-4); beide bestanden
 * hebben dezelfde uitsnede, zodat er bij het wisselen niets verspringt.
 */
export default function SystemIcon({ kind, strokeWidth = 2.4, ...props }: { kind: SystemIconKind } & LucideProps) {
  if (kind === "streak") {
    const { className = "", fill, style } = props;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fill === "none" ? "/icons/streak-flame-empty.webp" : "/icons/streak-flame.webp"}
        alt=""
        aria-hidden
        draggable={false}
        decoding="async"
        width={128}
        height={128}
        style={style}
        className={`inline-block shrink-0 object-contain ${className}`}
      />
    );
  }
  return <Zap {...props} strokeWidth={strokeWidth} />;
}
