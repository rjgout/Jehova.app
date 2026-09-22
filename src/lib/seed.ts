import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedBooks } from "../../prisma/content";
import { importBooks } from "../../prisma/importContent";
import { podcastEpisodes } from "../../prisma/podcastContent";
import { importPodcastEpisodes } from "../../prisma/importPodcast";
import { syncPodcastFeed } from "./podcastFeed";
import { importKidsStories, type KidsStorySeed } from "../../prisma/importKids";
import kidsManifest from "../../prisma/kidsManifest.json";
import { importIntroLessons, importIntroPersons } from "../../prisma/importIntro";
import { introLessons } from "../../prisma/introContent";
import { introPersons } from "../../prisma/introPersons";

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

export async function runSeed(client: PrismaClient, log: (msg: string) => void = console.log): Promise<void> {
  log("Seeding boeken, hoofdstukken, verzen en oefeningen (demo-inhoud)...");
  await importBooks(client, seedBooks, log);

  log("Seeding podcastafleveringen...");
  await importPodcastEpisodes(client, podcastEpisodes, log);

  log("Podcastfeed ophalen voor titels/omschrijvingen en nieuwe afleveringen...");
  await syncPodcastFeed(client, log);

  log("Seeding kindercursus (Verhalen uit het Boek van Mormon)...");
  await importKidsStories(client, kidsManifest as KidsStorySeed[], log);

  log("Seeding personen voor de introductiecursus...");
  await importIntroPersons(client, introPersons, log);

  log("Seeding introductiecursus (Ontdek het Boek van Mormon)...");
  await importIntroLessons(client, introLessons, log);

  log("Seeding achievements...");
  for (const def of achievementDefs) {
    await client.achievement.upsert({
      where: { slug: def.slug },
      update: { name: def.name, icon: def.icon, description: def.description },
      create: def,
    });
  }

  // Demo-gebruikers alleen aanmaken als dat expliciet gevraagd wordt.
  if (process.env.SEED_DEMO_USERS !== "true") {
    log("SEED_DEMO_USERS staat niet op 'true' — demo-gebruikers overgeslagen.");
    log("Seed klaar.");
    return;
  }

  const demoPassword = await bcrypt.hash("demo1234", 10);
  const demoUsers = [
    { email: "anna@example.com", handle: "anna", discriminator: "01", displayName: "Anna" },
    { email: "bram@example.com", handle: "bram", discriminator: "01", displayName: "Bram" },
    { email: "carla@example.com", handle: "carla", discriminator: "01", displayName: "Carla" },
  ];

  const createdUsers = [];
  for (const u of demoUsers) {
    const user = await client.user.upsert({
      where: { email: u.email },
      update: { isDemoSeed: true },
      create: { ...u, passwordHash: demoPassword, isDemoSeed: true },
    });
    createdUsers.push(user);
  }

  const [anna, bram, carla] = createdUsers;
  await client.friendship.upsert({
    where: { senderId_receiverId: { senderId: anna.id, receiverId: bram.id } },
    update: { status: "ACCEPTED" },
    create: { senderId: anna.id, receiverId: bram.id, status: "ACCEPTED" },
  });
  await client.friendship.upsert({
    where: { senderId_receiverId: { senderId: carla.id, receiverId: anna.id } },
    update: { status: "PENDING" },
    create: { senderId: carla.id, receiverId: anna.id, status: "PENDING" },
  });

  log("Demo-gebruikers: anna#01/bram#01/carla#01 (wachtwoord: demo1234)");
  log("Seed klaar.");
}
