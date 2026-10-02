import type { Companion } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_PERSONAL_MASCOT, isPersonalMascot, type PersonalMascotCharacter } from "@/lib/mascots";

// De persoonlijke gids van een gebruiker (User.companion). De enige plek die
// de databasewaarde (NOVI/VARO/VERA) en het mascottepersonage
// (novi/varo/vera) op elkaar afbeeldt; features kiezen alleen een state en
// gebruiken <PersonalMascot state="..." /> (src/components/versado/PersonalMascot.tsx).

const TO_MASCOT: Record<Companion, PersonalMascotCharacter> = { NOVI: "novi", VARO: "varo", VERA: "vera" };
const TO_COMPANION: Record<PersonalMascotCharacter, Companion> = { novi: "NOVI", varo: "VARO", vera: "VERA" };

/** Het personage bij een opgeslagen keuze; zonder keuze (of zonder gebruiker) Novi. */
export function companionToMascot(value: Companion | null | undefined): PersonalMascotCharacter {
  return value ? TO_MASCOT[value] : DEFAULT_PERSONAL_MASCOT;
}

export function mascotToCompanion(character: PersonalMascotCharacter): Companion {
  return TO_COMPANION[character];
}

/** Leest de gids van een gebruiker. */
export async function getCompanion(userId: string): Promise<PersonalMascotCharacter> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companion: true } });
  return companionToMascot(user?.companion);
}

/**
 * Slaat de gids op. Alleen novi, varo of vera; al het andere (ook "family")
 * wordt geweigerd zonder iets te veranderen.
 */
export async function setCompanion(userId: string, value: unknown): Promise<PersonalMascotCharacter | null> {
  if (!isPersonalMascot(value)) return null;
  await prisma.user.update({ where: { id: userId }, data: { companion: mascotToCompanion(value) } });
  return value;
}
