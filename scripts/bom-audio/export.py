"""Stap 3: controle en export naar prisma/bomAudio.json (ingelezen door
prisma/importAudio.ts bij "Content opnieuw laden")."""
import json
import os
import statistics

from common import ROOT, work

books = json.load(open(os.path.join(ROOT, "prisma", "bomContent.json")))
rows, missing, suspicious = [], [], []
for b in books:
    for c in b["chapters"]:
        key = f"{b['slug']}/{c['number']}"
        path = work("timings", key.replace("/", "_") + ".json")
        if not os.path.exists(path):
            continue
        t = json.load(open(path))
        units = {n: (s, ok) for n, s, ok in t["units"]}
        verses = [(n, s, ok) for n, s, ok in t["units"] if n.startswith("v")]
        if len(verses) != len(c["verses"]):
            raise SystemExit(f"{key}: {len(verses)} verzen in de audio-uitlijning, {len(c['verses'])} in de tekst")
        missing += [f"{key}:{n[1:]}" for n, _, ok in verses if ok == "missing"]
        # Verzen die veel korter of langer duren dan hun tekst doet verwachten.
        ends = [s for _, s, _ in verses[1:]] + [t["duration"]]
        rates = [(e - s) / max(len(v), 1) for (_, s, ok), e, v in zip(verses, ends, c["verses"]) if ok != "missing"]
        med = statistics.median(rates)
        if any(r < med * 0.45 or r > med * 2.2 for r in rates) or t["matched"] < 0.85:
            suspicious.append(key)
        rows.append({"book": b["slug"], "chapter": c["number"], "url": t["url"], "headingStart": units["head"][0],
                     "headingEnd": verses[0][1], "verseStarts": [s for _, s, _ in verses]})
with open(os.path.join(ROOT, "prisma", "bomAudio.json"), "w") as fh:
    fh.write("[\n" + ",\n".join("  " + json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows) + "\n]\n")
print(f"{len(rows)} hoofdstukken geëxporteerd.")
print("Niet voorgelezen in de opname:", missing or "geen")
print("Nakijken (tempo wijkt sterk af of weinig herkend):", suspicious or "geen")
