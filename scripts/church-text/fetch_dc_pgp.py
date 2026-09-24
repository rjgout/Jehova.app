"""Haalt de Nederlandse tekst van Leer en Verbonden en de Parel van Grote Waarde
op van de kerkwebsite en schrijft prisma/dcContent.json, prisma/pgpContent.json
en de woordenlijsten voor het woordenboek (dcWordCounts.json, pgpWordCounts.json).

Werkmap voor de opgehaalde pagina's: $CHURCH_TEXT_WORK, standaard
.bom-audio-work/church2 (in .gitignore). Draaien vanuit de repo-root:
    python3 scripts/church-text/fetch_dc_pgp.py
"""
import collections
import html
import json
import os
import re
import subprocess
import time
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORK = os.environ.get("CHURCH_TEXT_WORK", os.path.join(ROOT, ".bom-audio-work", "church2"))
os.makedirs(WORK, exist_ok=True)

# Dichtregels (bv. LV 84:99-102) hebben een extra class en staan als losse
# <span class="line">; zonder spatie ertussen plakken ze aan elkaar.
VERSE = r'<p[^>]*class="verse(?: [^"]*)?"[^>]*>'
BOOKS = [
    ("dc", "leer-en-verbonden", "dc-testament/dc", 138),
    ("moses", "mozes", "pgp/moses", 8),
    ("abr", "abraham", "pgp/abr", 5),
    ("js-m", "joseph-smith-mattheus", "pgp/js-m", 1),
    ("js-h", "joseph-smith-geschiedenis", "pgp/js-h", 1),
    ("a-of-f", "geloofsartikelen", "pgp/a-of-f", 1),
]
COLLECTIONS = [("dc", ["leer-en-verbonden"]), ("pgp", ["mozes", "abraham", "joseph-smith-mattheus", "joseph-smith-geschiedenis", "geloofsartikelen"])]


def clean(s):
    s = re.sub(r'<span class="line">', " ", s)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def fetch(uri, path):
    tries = 0
    while not os.path.exists(path) or os.path.getsize(path) < 500:
        url = f"https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content?lang=nld&uri={uri}"
        r = subprocess.run(["curl", "-sS", "-A", "Mozilla/5.0", "-o", path, url])
        tries += 1
        if r.returncode != 0:
            if os.path.exists(path):
                os.remove(path)
            if tries > 6:
                raise SystemExit("Opgegeven: " + uri)
            time.sleep(5 * tries)
        else:
            time.sleep(0.6)
    return json.load(open(path))


def word_counts(books):
    # Zelfde extractie als prisma/bomWords.json (zie src/lib/dictionary.ts).
    c = collections.Counter()
    for b in books:
        for ch in b["chapters"]:
            for v in ch["verses"]:
                for t in re.findall(r"[A-Za-zÀ-ÿ]+", v):
                    c["".join(x for x in unicodedata.normalize("NFD", t) if unicodedata.category(x) != "Mn").lower()] += 1
    return c


books = {}
for abbr, slug, base, n in BOOKS:
    chapters, name = [], None
    for i in range(1, n + 1):
        d = fetch(f"/scriptures/{base}/{i}", os.path.join(WORK, f"{abbr}_{i}.json"))
        title = d["meta"]["title"]
        # Een hoofdstuk dat niet bestaat, geeft de inhoudsopgave terug.
        assert title.endswith(f" {i}"), (abbr, i, title)
        name = title[: -len(f" {i}")]
        body = d["content"]["body"]
        nums = [int(m) for m in re.findall(VERSE + r'\s*<span class="verse-number">(\d+)', body)]
        verses = [re.sub(r"^\d+\s*", "", clean(v)) for v in re.findall(VERSE + r"(.*?)</p>", body, re.S)]
        assert nums == list(range(1, len(verses) + 1)), (abbr, i, len(nums), len(verses))
        chapter = {"number": i}
        head = re.findall(r'class="study-summary"[^>]*>(.*?)</p>', body, re.S)
        if head:
            chapter["heading"] = clean(head[0])
        chapter["verses"] = verses
        chapters.append(chapter)
    books[slug] = {"slug": slug, "name": name, "chapters": chapters}
    print(f"{name}: {len(chapters)} hoofdstukken, {sum(len(c['verses']) for c in chapters)} verzen")

for prefix, slugs in COLLECTIONS:
    selected = [books[s] for s in slugs]
    with open(os.path.join(ROOT, "prisma", f"{prefix}Content.json"), "w") as fh:
        fh.write(json.dumps(selected, ensure_ascii=False, indent=2) + "\n")
    counts = word_counts(selected)
    with open(os.path.join(ROOT, "prisma", f"{prefix}WordCounts.json"), "w") as fh:
        fh.write(json.dumps({k: counts[k] for k in sorted(counts)}, ensure_ascii=False, separators=(",", ":")))
