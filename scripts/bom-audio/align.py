"""Globale uitlijning van herkende woorden op de bekende tekst, en daaruit de
begintijd van elke eenheid (kop, vers). Zie README.md."""
import re

import numpy as np

from common import norm, units_for


def nw(a, b, gap=-6):
    """Globale uitlijning (Needleman-Wunsch) van ASR-woorden a op teksttokens b.
    Geeft per tekstindex de ASR-index terug waar ze op elkaar vallen."""
    ids = {}
    enc = lambda xs: np.array([ids.setdefault(x, len(ids)) for x in xs], dtype=np.int64)
    pre = {}
    # korte woorden alleen exact: een uniek negatief id per lijst en positie
    encp = lambda xs, off: np.array([pre.setdefault(x[:4], len(pre)) if len(x) >= 4 else off - i for i, x in enumerate(xs)], dtype=np.int64)
    A, B = enc(a), enc(b); Ap, Bp = encp(a, -1), encp(b, -10_000_000)
    n, m = len(a), len(b)
    # gehele getallen: de terugweg vergelijkt scores exact, en met floats
    # geeft (x - g*j) + g*j soms net een ander getal
    idx = np.arange(m + 1, dtype=np.int64)
    prev = gap * idx
    ptr = np.zeros((n + 1, m + 1), dtype=np.int8)  # 0 diag, 1 omhoog (asr-gat), 2 links (tekst-gat)
    ptr[0, 1:] = 2
    for i in range(1, n + 1):
        s = np.where(B == A[i - 1], 20, np.where(Bp == Ap[i - 1], 10, -10))
        diag = prev[:-1] + s
        up = prev[1:] + gap
        best = np.maximum(diag, up)
        first = prev[0] + gap
        tmp = np.concatenate(([first], best))
        # links-overgangen: row[j] = max_k<=j tmp[k] + gap*(j-k)
        row = np.maximum.accumulate(tmp - gap * idx) + gap * idx
        p = np.full(m + 1, 2, dtype=np.int8)
        p[1:][best == row[1:]] = 1
        p[1:][(diag == row[1:])] = 0
        p[0] = 1
        ptr[i] = p; prev = row
    i, j = n, m; mp = {}
    while i > 0 or j > 0:
        d = ptr[i, j]
        if i > 0 and j > 0 and d == 0:
            if A[i - 1] == B[j - 1] or Ap[i - 1] == Bp[j - 1]: mp[j - 1] = i - 1
            i -= 1; j -= 1
        elif i > 0 and (d == 1 or j == 0): i -= 1
        else: j -= 1
    return mp

def unit_starts(words, page, pause_list):
    units = units_for(page)
    tw = [(t, norm(w)) for t, w in words if norm(w)]
    toks, ustart = [], []
    for _, text in units:
        ustart.append(len(toks)); toks += [norm(w) for w in re.findall(r"[\wÀ-ÿ]+", text) if norm(w)]
    m = nw([w for _, w in tw], toks)
    WORD = 0.33  # gemiddelde duur van een voorgelezen woord, in seconden
    raw, exact = [], []
    for i, s in enumerate(ustart):
        e = ustart[i + 1] if i + 1 < len(ustart) else len(toks)
        k = next((k for k in range(s, e) if k in m), None)
        if k is None: raw.append(None); exact.append(False); continue
        raw.append(tw[m[k]][0] - (k - s) * WORD); exact.append(k - s <= 2)
    for i in range(len(raw)):
        if raw[i] is not None and i > 0 and raw[i - 1] is not None and raw[i] <= raw[i - 1]: raw[i] = None
    # Leestempo (seconden per teken) uit de eenheden die wél vastliggen.
    lens = [len(t) for _, t in units]
    spans = [(raw[i + 1] - raw[i]) / lens[i] for i in range(len(raw) - 1) if raw[i] is not None and raw[i + 1] is not None and lens[i] > 20]
    rate = sorted(spans)[len(spans) // 2] if spans else 0.07
    fixed = raw[:]
    missing = [False] * len(raw)
    for i in range(len(fixed)):
        if fixed[i] is not None: continue
        prev = next(((j, fixed[j]) for j in range(i - 1, -1, -1) if fixed[j] is not None), (-1, 0.0))
        nxt = next(((j, raw[j]) for j in range(i + 1, len(raw)) if raw[j] is not None), None)
        if not nxt:
            fixed[i] = prev[1] + (lens[prev[0]] * rate if prev[0] >= 0 else 0); continue
        room = nxt[1] - prev[1]
        need = sum(lens[prev[0]:nxt[0]]) * rate if prev[0] >= 0 else room
        if prev[0] >= 0 and room < 0.6 * need:
            # Geen tijd voor deze eenheid tussen de buren: niet voorgelezen (de
            # opname slaat soms een vers over). Begin = dat van het volgende.
            fixed[i] = nxt[1]; missing[i] = True
        else:
            before = sum(lens[prev[0] if prev[0] >= 0 else 0:i]); total = sum(lens[prev[0] if prev[0] >= 0 else 0:nxt[0]])
            fixed[i] = prev[1] + room * before / max(total, 1)
    snapped = []
    for t in fixed:
        cands = [b for a, b in pause_list if t - 1.5 <= b <= t + 0.6]
        snapped.append(max(cands) if cands else max(t - 0.15, 0))
    # nooit vóór de vorige eenheid (kan na afronden op een pauze); een
    # ontbrekende eenheid valt samen met de volgende
    for i in range(len(snapped) - 2, -1, -1):
        if missing[i]: snapped[i] = snapped[i + 1]
    for i in range(1, len(snapped)):
        if snapped[i] <= snapped[i - 1] and not missing[i - 1]: snapped[i] = round(snapped[i - 1] + 0.3, 2)
    # Onwaarschijnlijk korte eenheid (een verkeerd herkend woord trok de grens
    # naar voren): leg de grens op de pauze die het best past bij de tekstlengte.
    for i in range(len(snapped) - 2):
        if missing[i] or missing[i + 1]: continue
        exp = lens[i] * rate
        if snapped[i + 1] - snapped[i] >= 0.4 * exp: continue
        lo, hi = snapped[i] + 0.5 * exp, snapped[i + 2] - 0.3 * lens[i + 1] * rate
        cands = [b for a, b in pause_list if lo <= b <= hi]
        if cands: snapped[i + 1] = min(cands, key=lambda b: abs(b - (snapped[i] + exp)))
    return [(u[0], round(s, 2), "missing" if miss else (ok and r is not None)) for u, s, r, ok, miss in zip(units, snapped, raw, exact, missing)]
