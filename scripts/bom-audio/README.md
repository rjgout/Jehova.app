# Begintijden per vers in de Nederlandse en Engelse audio

De app speelt de voorgelezen hoofdstukken af (één mp3 per hoofdstuk van de
kerk, gespiegeld naar de eigen server door `src/lib/audioMirror.ts`) en
springt per vers naar de juiste plek. Die plekken staan
in `prisma/bomAudio.json` en `prisma/bomAudio.en.json` en worden bij "Content opnieuw laden" in de
database gezet (`prisma/importAudio.ts`). Deze map bevat de scripts waarmee
dat bestand gemaakt is; alleen opnieuw nodig als de tekst of de audio van de
kerk verandert.

## Hoe het werkt

1. De pagina van elk hoofdstuk levert de tekst die de audio voorleest (in
   volgorde: eventueel de boekinleiding, "Hoofdstuk N", de hoofdstukkop, de
   verzen) en de link naar het audiobestand.
2. Spraakherkenning (Vosk, klein model voor de gekozen taal) herkent de woorden met
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

Nederlands blijft de standaard en gebruikt de bestaande werkmap:

```bash
pip install vosk numpy av     # vosk vraagt ook 'srt'; alleen voor ondertitels, mag ontbreken
curl -L -o /tmp/nl.zip https://alphacephei.com/vosk/models/vosk-model-small-nl-0.22.zip
unzip /tmp/nl.zip -d .bom-audio-work/
cd scripts/bom-audio
python3 fetch_pages.py nl
python3 run.py nl           # ~1 uur op 4 kernen voor alle hoofdstukken
python3 export.py nl        # schrijft prisma/bomAudio.json en meldt wat nagekeken moet worden
```

Engels krijgt een eigen werkmap en uitvoerbestand:

```bash
curl -L -o /tmp/en.zip https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip /tmp/en.zip -d .bom-audio-work/en/
cd scripts/bom-audio
python3 fetch_pages.py en
python3 run.py en
python3 export.py en        # schrijft prisma/bomAudio.en.json
```

Een los hoofdstuk opnieuw: verwijder het timingbestand uit de werkmap en geef
de taalonafhankelijke boeksleutel mee, bijvoorbeeld
`python3 fetch_pages.py en bofm/1-ne/1` en `python3 run.py en bofm/1-ne/1`.
