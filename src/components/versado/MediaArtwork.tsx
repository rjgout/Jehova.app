"use client";

import { useState } from "react";
import { BookOpen, Brain, Gamepad2, GraduationCap, Headphones, Sparkles, Users, type LucideIcon } from "lucide-react";
import { artworkFor, type ArtworkAsset, type ArtworkKind } from "@/lib/artwork";

// Vast kader voor beeld bij content (cursus, spel, podcast, dagelijkse
// content). De verhouding ligt vast, dus de lay-out verandert niet als er
// later echte artwork komt: dezelfde plek toont dan een afbeelding, of via
// `children` bv. een animatie (Rive of video) over het hele kader.
//
// Zonder asset een neutrale placeholder: rustig vlak in de tint van de
// soort content met een klein lijnicoon, bewust geen illustratie of emoji.
// Met asset: lazy laden, een rustig laadvlak tot het beeld er is, en bij een
// fout terug naar de placeholder.

const RATIOS = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
  "1/1": "aspect-square",
  "21/9": "aspect-[21/9]",
} as const;

const TONES: Record<ArtworkKind, { bg: string; fg: string; icon: LucideIcon }> = {
  course: { bg: "bg-vs-accent-soft", fg: "text-vs-accent", icon: GraduationCap },
  reading: { bg: "bg-vs-accent-soft", fg: "text-vs-accent", icon: BookOpen },
  podcast: { bg: "bg-vs-league-soft", fg: "text-vs-league", icon: Headphones },
  game: { bg: "bg-vs-streak-soft", fg: "text-vs-streak", icon: Gamepad2 },
  quiz: { bg: "bg-vs-xp-soft", fg: "text-vs-xp", icon: Brain },
  daily: { bg: "bg-vs-xp-soft", fg: "text-vs-xp", icon: Sparkles },
  social: { bg: "bg-vs-success-soft", fg: "text-vs-success", icon: Users },
};

export default function MediaArtwork({
  kind,
  artworkKey,
  asset,
  ratio = "16/9",
  className = "",
  children,
}: {
  kind: ArtworkKind;
  /** Sleutel in het artworkregister (src/lib/artwork.ts). */
  artworkKey?: string | null;
  /** Rechtstreeks meegegeven beeld; gaat voor het register. */
  asset?: ArtworkAsset | null;
  ratio?: keyof typeof RATIOS;
  className?: string;
  /** Laag over het kader, bv. een label of later een animatie. */
  children?: React.ReactNode;
}) {
  const image = asset ?? artworkFor(artworkKey);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const tone = TONES[kind];
  const Icon = tone.icon;
  const showImage = image && state !== "error";

  return (
    <div className={`relative overflow-hidden ${RATIOS[ratio]} ${tone.bg} ${className}`} data-artwork-kind={kind} data-artwork-key={artworkKey ?? undefined}>
      {!showImage || state === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <Icon className={`h-7 w-7 ${tone.fg} opacity-60`} strokeWidth={1.75} />
        </div>
      ) : null}
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.src}
          alt={image.alt ?? ""}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={`vs-motion absolute inset-0 h-full w-full transition-opacity duration-300 ${image.fit === "contain" ? "object-contain" : "object-cover"} ${
            state === "loaded" ? "opacity-100" : "opacity-0"
          } dark:brightness-[0.92]`}
          style={image.position ? { objectPosition: image.position } : undefined}
        />
      )}
      {children}
    </div>
  );
}
