# Audiobestanden Lokaal Hosten

De app kan voorgelezen schriftboeken lokaal serveren in plaats van ze streaming van de kerkserver op te halen. Dit geeft onafhankelijkheid en snellere afspeel starten.

## Setup

### 1. Audiobestanden Downloaden

Het eerste keer moeten alle bestanden worden opgehaald van de kerkserver. Dit duurt enkele minuten (205 hoofdstukken × ~3-4 MB).

```bash
# Lokaal (dev):
npm run audio:download

# In Docker (productie):
docker exec jehova-app npm run audio:download
```

De bestanden worden opgeslagen in:
- **Lokaal dev:** `public/audio/`
- **Docker:** volume `jehova_audio_data`

### 2. Begintijden per Vers

De app gebruikt begintijden (audioStart) om per vers naar de juiste plek in het bestand te springen. Deze staan in `prisma/bomAudio.json` en zijn eenmalig berekend via spraakherkenning op de audiobestanden.

Bij wijziging van de schrifttekst moet `audioStart` opnieuw worden berekend (zie `scripts/bom-audio/README.md`). Als het aantal verzen per hoofdstuk verandert, slaat de import het audio-bestand over.

### 3. Talen

Momenteel alleen Nederlands (`nl`). De structuur ondersteunt toekomstige expansie naar Engels, Duits en Frans:

```
public/audio/
├── nl/
│   └── 1-nephi/
│       ├── 001.mp3
│       └── ...
└── en/
    └── 1-nephi/
        └── ...
```

Voor nieuwe talen:
1. Download-script uitbreiden in `scripts/download-audio.ts`
2. Audio-metadata-bestand toevoegen (bijv. `prisma/bomAudio.en.json`)
3. `transformAudioUrl()` in `prisma/importAudio.ts` updaten
4. Audio importeren met `npm run db:seed`

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
