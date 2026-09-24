import { PrismaClient } from "@prisma/client";
import { seedBooks } from "../../prisma/content";
import { importBooks } from "../../prisma/importContent";
import { podcastEpisodes } from "../../prisma/podcastContent";
import { kastVanMormonEpisodes } from "../../prisma/kastVanMormonContent";
import { GJDO_PODCAST_ID, KAST_PODCAST_ID } from "./podcasts";
import { importPodcastEpisodes } from "../../prisma/importPodcast";
import { syncPodcastFeed } from "./podcastFeed";
import { syncFsyContent } from "./fsyContent";
import { importKidsStories, type KidsStorySeed } from "../../prisma/importKids";
import kidsManifest from "../../prisma/kidsManifest.json";
import { importIntroLessons, importIntroPersons } from "../../prisma/importIntro";
import { introLessons } from "../../prisma/introContent";
import { introPersons } from "../../prisma/introPersons";
import { alleskennerItems } from "../../prisma/alleskennerContent";
import { generatedAlleskennerItems } from "../../prisma/alleskennerGenerated";
import { importAlleskennerItems } from "../../prisma/importAlleskenner";

// Namen/omschrijvingen bij de achievement-slugs uit src/lib/achievements.ts.
const achievementDefs = [
  { slug: "streak-3", name: "Drie dagen volgehouden", icon: "🔥", description: "Hield 3 dagen op rij een streak vol." },
  { slug: "streak-7", name: "Eerste week", icon: "🔥", description: "Hield 7 dagen op rij een streak vol." },
  { slug: "streak-30", name: "Vol doorgezet", icon: "🔥", description: "Hield 30 dagen op rij een streak vol." },
  { slug: "streak-100", name: "Honderd dagen sterk", icon: "💯", description: "Hield 100 dagen op rij een streak vol." },
  { slug: "first-chapter", name: "Eerste hoofdstuk", icon: "📖", description: "Rondde je eerste hoofdstuk af." },
  { slug: "chapters-5", name: "Op dreef", icon: "📚", description: "Rondde 5 hoofdstukken af." },
  { slug: "chapters-10", name: "Tien hoofdstukken", icon: "📚", description: "Rondde 10 hoofdstukken af." },
  { slug: "chapters-25", name: "Vijfentwintig hoofdstukken", icon: "🏅", description: "Rondde 25 hoofdstukken af." },
  { slug: "chapters-50", name: "Halve honderd", icon: "🏆", description: "Rondde 50 hoofdstukken af." },
  { slug: "perfect-chapter", name: "Volmaakt", icon: "💯", description: "Rondde een hoofdstuk af met 100%." },
  { slug: "perfect-10", name: "Tien keer raak", icon: "🎯", description: "Rondde 10 hoofdstukken af met 100%." },
  { slug: "xp-1000", name: "1000 XP", icon: "⭐", description: "Verdiende in totaal 1000 XP." },
  { slug: "xp-5000", name: "5000 XP", icon: "🌟", description: "Verdiende in totaal 5000 XP." },
  { slug: "xp-10000", name: "10.000 XP", icon: "🏆", description: "Verdiende in totaal 10.000 XP." },
  { slug: "first-freeze-earned", name: "Eerste freeze", icon: "🧊", description: "Verdiende je eerste streak freeze." },
  { slug: "first-freeze-gifted", name: "Vrijgevig", icon: "🎁", description: "Gaf je eerste streak freeze cadeau aan een vriend." },
  { slug: "first-friend", name: "Niet alleen", icon: "👥", description: "Voegde je eerste vriend toe." },
  { slug: "friends-5", name: "Vriendenkring", icon: "👨‍👩‍👧‍👦", description: "Heeft 5 vrienden." },
  { slug: "first-duel-won", name: "Eerste overwinning", icon: "⚔️", description: "Won je eerste live Schriftduel." },
  { slug: "duels-10-won", name: "Duelmeester", icon: "🏅", description: "Won 10 live Schriftduels." },
  { slug: "family-game-first-play", name: "Gezinsavond", icon: "🎉", description: "Speelde het Gezinsavondspel voor het eerst uit." },
  { slug: "word-game-first-win", name: "Woordkunstenaar", icon: "🔤", description: "Raadde het woord van de dag voor het eerst goed." },
  { slug: "word-game-7-wins", name: "Woordmeester", icon: "🧠", description: "Raadde 7 keer het woord van de dag goed." },
  { slug: "podcast-first-lesson", name: "Eerste podcastles", icon: "🎧", description: "Rondde je eerste podcastles af." },
  { slug: "podcast-10-lessons", name: "Podcastluisteraar", icon: "🎙️", description: "Rondde 10 podcastlessen af." },
  { slug: "kids-first-story", name: "Eerste kinderles", icon: "🌟", description: "Rondde je eerste verhaal uit de kindercursus af." },
  { slug: "kids-10-stories", name: "Verhalenverteller", icon: "📚", description: "Rondde 10 verhalen uit de kindercursus af." },
  { slug: "intro-first-lesson", name: "Op ontdekking", icon: "🧭", description: "Rondde je eerste introductieles af." },
  { slug: "intro-all-lessons", name: "Helemaal op weg", icon: "🎓", description: "Rondde alle introductielessen af." },
];

/**
 * De volledige seed-routine — herbruikbaar vanaf de CLI (`npm run db:seed`,
 * zie prisma/seed.ts) én vanuit de adminbackend (zie `/api/admin/reseed`),
 * die deze in-process aanroept met de gedeelde Prisma-client van de app in
 * plaats van er zelf een nieuwe voor op te zetten. `log` is injecteerbaar
 * zodat de adminbackend de voortgangsregels kan opvangen en teruggeven aan
 * de admin, in plaats van dat ze alleen in de containerlogs verdwijnen.
 */
export async function runSeed(client: PrismaClient, log: (msg: string) => void = console.log): Promise<void> {
  log("Seeding boeken, hoofdstukken, verzen en oefeningen...");
  await importBooks(client, seedBooks, log);

  log("Seeding podcastafleveringen...");
  await importPodcastEpisodes(client, GJDO_PODCAST_ID, podcastEpisodes, log);
  await importPodcastEpisodes(client, KAST_PODCAST_ID, kastVanMormonEpisodes, log);

  log("Podcastfeed ophalen voor titels/omschrijvingen en nieuwe afleveringen...");
  await syncPodcastFeed(client, log);

  log("FSY-content controleren op nieuwe lessen...");
  await syncFsyContent(client, log);

  log("Seeding kindercursus (Verhalen uit het Boek van Mormon)...");
  await importKidsStories(client, kidsManifest as KidsStorySeed[], log);

  log("Seeding personen voor de introductiecursus...");
  await importIntroPersons(client, introPersons, log);

  log("Seeding introductiecursus (Ontdek het Boek van Mormon)...");
  await importIntroLessons(client, introLessons, log);

  log("Seeding De Alleskenner...");
  await importAlleskennerItems(client, [...alleskennerItems, ...generatedAlleskennerItems()], log);

  log("Seeding achievements...");
  for (const def of achievementDefs) {
    await client.achievement.upsert({
      where: { slug: def.slug },
      update: { name: def.name, icon: def.icon, description: def.description },
      create: def,
    });
  }

  log("Seed klaar.");
}
