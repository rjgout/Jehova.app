# Audiobestanden Lokaal Hosten

De app kan voorgelezen schriftboeken lokaal serveren in plaats van ze streaming van de kerkserver op te halen. Dit geeft onafhankelijkheid en snellere afspeel starten.

## Setup

### 1. Audiobestanden Downloaden

De audiobestanden worden automatisch gedownload bij elke content-sync:

**Via Admin Panel (aanbevolen):**
- Ga naar `/adminbackend` → Instellingen → "Inhoud opnieuw laden"
- Audio wordt samen met content gedownload

**Via CLI (dev):**
```bash
npm run audio:download
```

**Via Docker:**
```bash
docker exec jehova-app npm run audio:download
```

De eerste download duurt enkele minuten (205 hoofdstukken × ~3-4 MB).

De bestanden worden opgeslagen in:
- **Lokaal dev:** `public/audio/`
- **Docker:** volume `jehova_audio_data`

### 2. Begintijden per Vers

De app gebruikt begintijden (audioStart) om per vers naar de juiste plek in het bestand te springen. Deze staan in `prisma/bomAudio.json` en zijn eenmalig berekend via spraakherkenning op de audiobestanden.

Bij wijziging van de schrifttekst moet `audioStart` opnieuw worden berekend (zie `scripts/bom-audio/README.md`). Als het aantal verzen per hoofdstuk verandert, slaat de import het audio-bestand over.

### 3. Talen

**Momenteel beschikbaar:** Nederlands (NL)

**Structuur:**
```
public/audio/
├── nl/1-nephi/001.mp3
├── nl/1-nephi/002.mp3
└── en/1-nephi/001.mp3  (toekomstig)
```

**Nieuwe taal toevoegen** (Engels/Duits/Frans):

1. Zorg dat audio-metadata bestaat (bijv. `prisma/bomAudio.en.json`)
2. Uncomment de taal in `scripts/download-audio.ts`:
   ```typescript
   const AUDIO_LANGUAGES: AudioLanguageConfig[] = [
     { code: "nl", name: "Nederlands", metadataFile: "prisma/bomAudio.json" },
     { code: "en", name: "English", metadataFile: "prisma/bomAudio.en.json" }, // ← uncomment
   ];
   ```
3. Voer "Inhoud opnieuw laden" uit via admin → audio verschijnt automatisch
4. Geen verdere code-wijzigingen nodig

### 4. API-Route

Audio wordt geserveerd via `/api/audio/:language/:book/:chapter.mp3`:

```
GET /api/audio/nl/1-nephi/001.mp3          # Volledig bestand
GET /api/audio/nl/1-nephi/001.mp3 Range: bytes=0-999999  # Gedeelte (vooruitspoelen)
```

De route ondersteunt HTTP Range-requests, zodat audio-spelers kunnen vooruitspoelen zonder het hele bestand te moeten bufferen.

## Backup & Herstel

De audiobestanden staan in een Docker-volume (`jehova_audio_data`). Bij een back-up van de installatie moet dit volume meegenomen worden:

```bash
# Back-up
docker run --rm -v jehova_audio_data:/data -v /path/to/backup:/backup \
  alpine tar czf /backup/audio.tar.gz -C /data .

# Herstel
docker run --rm -v jehova_audio_data:/data -v /path/to/backup:/backup \
  alpine tar xzf /backup/audio.tar.gz -C /data
```

## Probleemoplossing

**"Audio file not found"** — bestanden zijn niet gedownload. Voer `npm run audio:download` uit.

**"Vers springt niet naar juiste plek"** — `audioStart` is verouderd na een tekstwijziging. Zie `scripts/bom-audio/README.md` voor herberekening.

**Langzaam laden** — afhankelijk van je downloadsnelheid. Eerste keer downloading kan enkele minuten duren.

**Docker: "AUDIO_STORAGE_DIR not found"** — volume is niet aangekoppeld. Controleer `docker-compose.yml` op `volumes:` in de `jehova-app` service.
