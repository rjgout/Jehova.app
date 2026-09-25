"""Haalt "Verhalen uit het Boek van Mormon" (uitgave 2023) op van de
kerkwebsite, in het Nederlands, Engels, Duits en Frans. Schrijft per taal
prisma/kidsStories2023.<taal>.json: per verhaal nummer, titel, ondertitel,
schriftverwijzing, tekst en plaatjes.

Dezelfde uitgave met toestemming gebruikt als de oudere Nederlandse
kinderverhalen (zie README, Auteursrecht). De plaatjes worden niet gehost:
de app toont ze vanaf de server van de kerk, net als de voorgelezen
hoofdstukken.

Elk verhaal heeft in elke taal hetzelfde nummer: het volgnummer uit de
inhoudsopgave min één (01 is een inleiding zonder verhaal en wordt
overgeslagen, dus 02 wordt verhaal 1). Het script stopt als een taal een ander aantal verhalen
heeft, want de cursussen en De Alleskenner koppelen talen op dat nummer.

Werkmap voor de opgehaalde pagina's: $CHURCH_TEXT_WORK, standaard
.bom-audio-work/kids-<taal> (in .gitignore). Draaien vanuit de repo-root:
    python3 scripts/church-text/fetch_kids_stories.py [nl en de fr]
"""
import html
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHURCH_CODES = {"nl": "nld", "en": "eng", "de": "deu", "fr": "fra"}
MANUAL = "/manual/book-of-mormon-stories-2024"
# Breedte waarin de plaatjes worden opgevraagd (de server schaalt zelf).
IMAGE_WIDTH = 640


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def fetch(lang, uri, path):
    tries = 0
    while not os.path.exists(path) or os.path.getsize(path) < 500:
        url = f"https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content?lang={lang}&uri={uri}"
        subprocess.run(["curl", "-sS", "--max-time", "60", "-A", "Mozilla/5.0", "-o", path, url])
        tries += 1
        if tries > 10:
            raise SystemExit(f"ophalen mislukt: {url}")
        if not os.path.exists(path) or os.path.getsize(path) < 500:
            # De site geeft soms een tijd lang een serverfout; rustig opnieuw proberen.
            time.sleep(min(15 * tries, 120))
        else:
            time.sleep(1)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def story_uris(toc):
    seen = []
    for uri in re.findall(re.escape(MANUAL) + r"/\d{2}-[a-z0-9-]+", json.dumps(toc)):
        if uri not in seen and not uri.endswith("/01-about-the-book-of-mormon"):
            seen.append(uri)
    return seen


def parse_story(number, body):
    title = clean(re.search(r"<h1[^>]*>(.*?)</h1>", body, re.S).group(1))
    subtitle = re.search(r'<p class="subtitle"[^>]*>(.*?)</p>', body, re.S)
    ref = re.search(r'<p class="title-number"[^>]*>(.*?)</p>', body, re.S)
    paragraphs = []
    for match in re.finditer(r'<p data-aid="\d+" id="p\d+">(.*?)</p>', body, re.S):
        inner = match.group(1)
        # Alinea's die alleen uit een schriftverwijzing bestaan horen niet bij het verhaal.
        if re.fullmatch(r"\s*<a class=\"scripture-ref\"[^>]*>.*?</a>\s*", inner, re.S):
            continue
        text = clean(inner)
        if text:
            paragraphs.append(text)
    images = []
    for img_id in re.findall(r'<img [^>]*data-img-id="([0-9a-f]+)"', body):
        url = f"https://www.churchofjesuschrist.org/imgs/{img_id}/full/%21{IMAGE_WIDTH}%2C/0/default"
        if url not in images:
            images.append(url)
    return {
        "number": number,
        "title": title,
        "subtitle": clean(subtitle.group(1)) if subtitle else None,
        "ref": clean(ref.group(1)) if ref else None,
        "text": " ".join(paragraphs),
        "images": images,
    }


def main():
    langs = sys.argv[1:] or list(CHURCH_CODES)
    counts = {}
    for lang in langs:
        code = CHURCH_CODES[lang]
        work = os.environ.get("CHURCH_TEXT_WORK", os.path.join(ROOT, ".bom-audio-work", f"kids-{lang}"))
        os.makedirs(work, exist_ok=True)
        toc = fetch(code, MANUAL, os.path.join(work, "toc.json"))
        uris = story_uris(toc)
        stories = []
        for uri in uris:
            number = int(uri.rsplit("/", 1)[1][:2]) - 1
            page = fetch(code, uri, os.path.join(work, uri.rsplit("/", 1)[1] + ".json"))
            story = parse_story(number, page["content"]["body"])
            if not story["text"] or not story["images"]:
                raise SystemExit(f"{lang}: verhaal {number} heeft geen tekst of plaatjes ({uri})")
            stories.append(story)
        counts[lang] = len(stories)
        out = os.path.join(ROOT, "prisma", f"kidsStories2023.{lang}.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(stories, f, ensure_ascii=False, indent=1)
            f.write("\n")
        print(f"{lang}: {len(stories)} verhalen -> {os.path.relpath(out, ROOT)}")
    if len(set(counts.values())) > 1:
        raise SystemExit(f"aantal verhalen verschilt per taal: {counts}")


if __name__ == "__main__":
    main()
