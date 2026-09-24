"""Stap 2: per hoofdstuk met audio de begintijden berekenen. Haalt het
audiobestand tijdelijk op, zoekt de pauzes, herkent de woorden (bewaard in
words/, zodat opnieuw uitlijnen geen herkenning meer kost) en lijnt uit."""
import json
import os
import subprocess
import sys
import time
import traceback
from multiprocessing import Pool

from common import ABBR, ROOT, WORK, find_pauses, load_audio, recognize, work

MODEL_DIR = os.environ.get("VOSK_MODEL", os.path.join(WORK, "vosk-model-small-nl-0.22"))
MODEL = None


def job(item):
    global MODEL
    key, page_file = item
    out = work("timings", key.replace("/", "_") + ".json")
    if os.path.exists(out):
        return key, "al klaar"
    try:
        from vosk import Model, SetLogLevel

        from align import unit_starts

        SetLogLevel(-1)
        page = json.load(open(page_file))
        audio = page["meta"].get("audio") or []
        if not audio:
            return key, "geen audio"
        url = audio[0]["mediaUrl"]
        mp3 = work("tmp", key.replace("/", "_") + ".mp3")
        for attempt in range(5):
            r = subprocess.run(["curl", "-sS", "-A", "Mozilla/5.0", "-o", mp3, url])
            if r.returncode == 0 and os.path.getsize(mp3) > 10000:
                break
            time.sleep(5 * (attempt + 1))
        x, sr = load_audio(mp3)
        pauses, duration = find_pauses(x, sr)
        words_file = work("words", key.replace("/", "_") + ".json")
        if os.path.exists(words_file):
            words = [tuple(w) for w in json.load(open(words_file))]
        else:
            if MODEL is None:
                MODEL = Model(MODEL_DIR)
            words = recognize(x, sr, MODEL, page)
            json.dump(words, open(words_file, "w"))
        os.remove(mp3)
        units = unit_starts(words, page, pauses)
        matched = sum(1 for _, _, ok in units if ok is True) / len(units)
        json.dump({"key": key, "url": url, "duration": duration, "units": [list(u) for u in units], "matched": round(matched, 3)}, open(out, "w"))
        return key, f"ok {matched:.2f}"
    except Exception:
        return key, "FOUT " + traceback.format_exc()[-300:]


if __name__ == "__main__":
    books = json.load(open(os.path.join(ROOT, "prisma", "bomContent.json")))
    jobs = [(f"{b['slug']}/{c['number']}", work("church", f"{abbr}_{c['number']}.json")) for abbr, b in zip(ABBR, books) for c in b["chapters"]]
    only = set(sys.argv[1:])
    if only:
        jobs = [j for j in jobs if j[0] in only]
    with Pool(int(os.environ.get("BOM_AUDIO_PROCS", "4"))) as p:
        for i, (key, msg) in enumerate(p.imap_unordered(job, jobs), 1):
            print(f"{i}/{len(jobs)} {key} {msg}", flush=True)
