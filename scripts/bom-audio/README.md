# Begintijden per vers in de Nederlandse audio

De app speelt de voorgelezen hoofdstukken af vanaf de server van de kerk (één
mp3 per hoofdstuk) en springt per vers naar de juiste plek. Die plekken staan
in `prisma/bomAudio.json` en worden bij "Content opnieuw laden" in de
database gezet (`prisma/importAudio.ts`). Deze map bevat de scripts waarmee
dat bestand gemaakt is; alleen opnieuw nodig als de tekst of de audio van de
kerk verandert.

## Hoe het werkt

1. De pagina van elk hoofdstuk levert de tekst die de audio voorleest (in
   volgorde: eventueel de boekinleiding, "Hoofdstuk N", de hoofdstukkop, de
   verzen) en de link naar het audiobestand.
2. Spraakherkenning (Vosk, klein Nederlands model) herkent de woorden met
   hun tijd. Alleen de woorden van dat hoofdstuk mogen herkend worden: dat
   maakt het snel (zo'n 20 s rekenwerk per hoofdstuk) en nauwkeurig genoeg.
3. De herkende woorden worden in één keer op de tekst uitgelijnd
   (Needleman-Wunsch), zodat verzen die hetzelfde beginnen ("En het
   geschiedde…") niet verwisseld worden.
4. Elk begin wordt verschoven naar het einde van de pauze ervoor, zodat een
   vers nooit midden in een woord start. Een vers waarvoor tussen de buren
   geen tijd is, staat niet in de opname (bv. 1 Nephi 1:6); dat krijgt de
   begintijd van het volgende vers.

## Opnieuw draaien

```bash
pip install vosk numpy av     # vosk vraagt ook 'srt'; alleen voor ondertitels, mag ontbreken
curl -L -o /tmp/nl.zip https://alphacephei.com/vosk/models/vosk-model-small-nl-0.22.zip
unzip /tmp/nl.zip -d .bom-audio-work/
cd scripts/bom-audio
python3 fetch_pages.py
python3 run.py              # ~1 uur op 4 kernen voor alle hoofdstukken
python3 export.py           # schrijft prisma/bomAudio.json en meldt wat nagekeken moet worden
```

Een los hoofdstuk opnieuw: verwijder het uit `.bom-audio-work/timings/` en
draai `python3 run.py 1-nephi/1`.
