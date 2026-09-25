"""Haalt een uitgave in een andere taal op van de kerkwebsite: het Boek van
Mormon, Leer en Verbonden en de Parel van Grote Waarde, met verzen en
hoofdstukopschriften. Schrijft per werk prisma/<werk>Content.<taal>.json
(bv. prisma/bomContent.en.json) en de woordenlijst voor het woordenboek
(prisma/<werk>WordCounts.<taal>.json).

Elk boek krijgt zijn taalonafhankelijke sleutel (Book.key, zie
prisma/bookKeys.ts), zodat hetzelfde vers in elke taal te vinden is. Het
aantal hoofdstukken en verzen wordt vergeleken met de Nederlandse uitgave;
een verschil stopt het script, want dan klopt "zelfde sleutel + hoofdstuk +
vers = zelfde tekst" niet meer.

De Nederlandse uitgave zelf komt uit prisma/bomContent.json en
scripts/church-text/fetch_dc_pgp.py; die raakt dit script niet aan.

Werkmap voor de opgehaalde pagina's: $CHURCH_TEXT_WORK, standaard
.bom-audio-work/church-<taal> (in .gitignore). Draaien vanuit de repo-root:
    python3 scripts/church-text/fetch_scripture.py en
"""
import collections
import html
import json
import os
import re
import subprocess
import sys
import time
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Taalcode van de app -> taalcode van de kerkwebsite (zie src/lib/languages.ts).
CHURCH_CODES = {"en": "eng", "de": "deu", "fr": "fra"}

# (werkprefix voor de bestandsnaam, Nederlands bronbestand, boeksleutels in volgorde)
WORKS = [
    ("bom", "bomContent.json", [
        "bofm/1-ne", "bofm/2-ne", "bofm/jacob", "bofm/enos", "bofm/jarom", "bofm/omni", "bofm/w-of-m",
        "bofm/mosiah", "bofm/alma", "bofm/hel", "bofm/3-ne", "bofm/4-ne", "bofm/morm", "bofm/ether", "bofm/moro",
    ]),
    ("dc", "dcContent.json", ["dc-testament/dc"]),
    ("pgp", "pgpContent.json", ["pgp/moses", "pgp/abr", "pgp/js-m", "pgp/js-h", "pgp/a-of-f"]),
]

# Dichtregels hebben een extra class en staan als losse <span class="line">.
VERSE = r'<p[^>]*class="verse(?: [^"]*)?"[^>]*>'


def clean(s):
    s = re.sub(r'<span class="line">', " ", s)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def fetch(lang, uri, path):
    tries = 0
    while not os.path.exists(path) or os.path.getsize(path) < 500:
        url = f"https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content?lang={lang}&uri={uri}"
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
    # Zelfde extractie als fetch_dc_pgp.py (zie src/lib/dictionary.ts).
    c = collections.Counter()
    for b in books:
        for ch in b["chapters"]:
            for v in ch["verses"]:
                for t in re.findall(r"[A-Za-zÀ-ÿ]+", v):
                    c["".join(x for x in unicodedata.normalize("NFD", t) if unicodedata.category(x) != "Mn").lower()] += 1
    return c


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in CHURCH_CODES:
        raise SystemExit("Gebruik: fetch_scripture.py " + "|".join(CHURCH_CODES))
    code = sys.argv[1]
    church = CHURCH_CODES[code]
    work_dir = os.environ.get("CHURCH_TEXT_WORK", os.path.join(ROOT, ".bom-audio-work", f"church-{code}"))
    os.makedirs(work_dir, exist_ok=True)

    for prefix, dutch_file, keys in WORKS:
        dutch = json.load(open(os.path.join(ROOT, "prisma", dutch_file)))
        assert len(dutch) == len(keys), (prefix, len(dutch), len(keys))
        books = []
        for key, dutch_book in zip(keys, dutch):
            chapters, name = [], None
            for dutch_chapter in dutch_book["chapters"]:
                i = dutch_chapter["number"]
                d = fetch(church, f"/scriptures/{key}/{i}", os.path.join(work_dir, f"{key.replace('/', '_')}_{i}.json"))
                title = d["meta"]["title"]
                # Een hoofdstuk dat niet bestaat, geeft de inhoudsopgave terug.
                assert title.endswith(f" {i}"), (key, i, title)
                name = title[: -len(f" {i}")]
                body = d["content"]["body"]
                nums = [int(m) for m in re.findall(VERSE + r'\s*<span class="verse-number">(\d+)', body)]
                verses = [re.sub(r"^\d+\s*", "", clean(v)) for v in re.findall(VERSE + r"(.*?)</p>", body, re.S)]
                assert nums == list(range(1, len(verses) + 1)), (key, i, len(nums), len(verses))
                assert len(verses) == len(dutch_chapter["verses"]), (key, i, len(verses), len(dutch_chapter["verses"]))
                chapter = {"number": i}
                head = re.findall(r'class="study-summary"[^>]*>(.*?)</p>', body, re.S)
                if head:
                    chapter["heading"] = clean(head[0])
                chapter["verses"] = verses
                chapters.append(chapter)
            # Slug is uniek over alle uitgaven; de sleutel verbindt de talen.
            books.append({"slug": f"{code}-{key.replace('/', '-')}", "key": key, "name": name, "chapters": chapters})
            print(f"{name}: {len(chapters)} hoofdstukken, {sum(len(c['verses']) for c in chapters)} verzen", flush=True)

        with open(os.path.join(ROOT, "prisma", f"{prefix}Content.{code}.json"), "w") as fh:
            fh.write(json.dumps(books, ensure_ascii=False, indent=2) + "\n")
        # Als lijst van [woord, aantal] en niet als object: tsx (server.ts)
        # maakt van elke objectsleutel een variabele, en woorden als "yield"
        # of "let" zijn gereserveerd in JavaScript; dan start de app niet.
        counts = word_counts(books)
        with open(os.path.join(ROOT, "prisma", f"{prefix}WordCounts.{code}.json"), "w") as fh:
            fh.write(json.dumps([[k, counts[k]] for k in sorted(counts)], ensure_ascii=False, separators=(",", ":")))


main()
