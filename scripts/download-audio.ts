/**
 * Download audiobestanden voor schriftboeken van de kerkserver naar lokale opslag.
 *
 * Ondersteunde talen: Nederlands (bomAudio.json)
 * Toekomstig: Engels, Duits, Frans, L&V, PGP
 *
 * Gebruik: npx tsx scripts/download-audio.ts
 */

import fs from "fs";
import path from "path";
import https from "https";

interface AudioMetadata {
  book: string;
  chapter: number;
  url: string;
  headingStart: number;
  headingEnd: number;
  verseStarts: number[];
}

const AUDIO_DIR = process.env.AUDIO_STORAGE_DIR || "./public/audio";
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

/**
 * Download een bestand met retries
 */
async function downloadFile(
  url: string,
  targetPath: string,
  retries = 0
): Promise<boolean> {
  return new Promise((resolve) => {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Skip als bestand al bestaat en compleet is
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      if (stats.size > 1000) {
        console.log(`✓ Bestaat al: ${path.relative(AUDIO_DIR, targetPath)}`);
        resolve(true);
        return;
      }
    }

    const file = fs.createWriteStream(targetPath);
    https
      .get(url, { timeout: 30000 }, (response) => {
        if (response.statusCode !== 200) {
          fs.unlink(targetPath, () => {});
          if (retries < MAX_RETRIES) {
            console.log(
              `  → Retry (${retries + 1}/${MAX_RETRIES}): ${path.basename(targetPath)}`
            );
            setTimeout(
              () =>
                downloadFile(url, targetPath, retries + 1).then(resolve),
              RETRY_DELAY
            );
          } else {
            console.error(
              `✗ Fout (${response.statusCode}): ${path.basename(targetPath)}`
            );
            resolve(false);
          }
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log(
            `✓ Downloaded: ${path.relative(AUDIO_DIR, targetPath)}`
          );
          resolve(true);
        });
      })
      .on("error", (e) => {
        fs.unlink(targetPath, () => {});
        if (retries < MAX_RETRIES) {
          console.log(
            `  → Retry (${retries + 1}/${MAX_RETRIES}): ${path.basename(targetPath)}`
          );
          setTimeout(
            () =>
              downloadFile(url, targetPath, retries + 1).then(resolve),
            RETRY_DELAY
          );
        } else {
          console.error(`✗ Fout: ${path.basename(targetPath)} - ${e.message}`);
          resolve(false);
        }
      });
  });
}

/**
 * Download alle audiobestanden voor een taal
 */
async function downloadAudioForLanguage(
  language: string,
  metadataFile: string
) {
  console.log(`\n📥 ${language.toUpperCase()}: ${metadataFile}`);

  const metadata: AudioMetadata[] = JSON.parse(
    fs.readFileSync(metadataFile, "utf-8")
  );

  let downloaded = 0;
  let failed = 0;

  for (const item of metadata) {
    const filename = `${language}/${item.book}/${String(item.chapter).padStart(3, "0")}.mp3`;
    const targetPath = path.join(AUDIO_DIR, filename);

    const success = await downloadFile(item.url, targetPath);
    if (success) {
      downloaded++;
    } else {
      failed++;
    }
  }

  console.log(
    `  Klaar: ${downloaded}/${metadata.length} (${failed} mislukt)\n`
  );
  return { downloaded, failed };
}

/**
 * Main: download audio voor alle beschikbare talen
 */
async function main() {
  console.log("🎵 Audio bestanden downloaden...");
  console.log(`   Opslag: ${AUDIO_DIR}\n`);

  const languages = [
    { code: "nl", file: "prisma/bomAudio.json", name: "Nederlands" },
    // Toekomstig: other languages en collections
  ];

  let totalDownloaded = 0;
  let totalFailed = 0;

  for (const lang of languages) {
    if (fs.existsSync(lang.file)) {
      const { downloaded, failed } = await downloadAudioForLanguage(
        lang.code,
        lang.file
      );
      totalDownloaded += downloaded;
      totalFailed += failed;
    } else {
      console.log(`⊘ Geen metadata: ${lang.file}`);
    }
  }

  console.log(`\n✓ Totaal: ${totalDownloaded} bestanden gedownload`);
  if (totalFailed > 0) {
    console.log(`⚠ ${totalFailed} downloads mislukt — probeer later opnieuw.`);
    process.exit(1);
  }
}

main().catch(console.error);
