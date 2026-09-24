"""Stap 1: haalt per hoofdstuk de pagina van de kerkwebsite op (Nederlands):
de tekst die de audio voorleest en de link naar het audiobestand."""
import json
import os
import subprocess
import time

from common import ABBR, ROOT, work

books = json.load(open(os.path.join(ROOT, "prisma", "bomContent.json")))
for abbr, book in zip(ABBR, books):
    for ch in book["chapters"]:
        n = ch["number"]
        path = work("church", f"{abbr}_{n}.json")
        tries = 0
        while not os.path.exists(path) or os.path.getsize(path) < 1000:
            url = f"https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content?lang=nld&uri=/scriptures/bofm/{abbr}/{n}"
            r = subprocess.run(["curl", "-sS", "-A", "Mozilla/5.0", "-o", path, url])
            tries += 1
            if r.returncode != 0:
                if os.path.exists(path):
                    os.remove(path)
                if tries > 6:
                    raise SystemExit(f"Opgegeven bij {abbr} {n}")
                time.sleep(5 * tries)
            else:
                time.sleep(0.8)
print("Pagina's opgehaald in", work("church"))
