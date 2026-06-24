# eldee HQ

Interní přehled projektu eldee (Holy Socks) — jednostránkový statický web pro tým.

- `index.html` — dashboard; **vykresluje se z `data/stav.json`** (úkoly, milníky, stav, odkazy)
- `data/stav.json` — **zdroj pravdy nástěnky**. Obsah měň TADY, ne v `index.html`.
- `favicon.svg` — LD monogram v2.0

**Aktualizace:** úkoly/milníky/stav udržuje Jarvis (Claude Code) v `data/stav.json`;
příběh a kontext zůstává v deníku `07-eldee-business/aktualni-stav.md`.
Závazný postup: `07-eldee-business/CLAUDE.md` → „POVINNÝ WORKFLOW" + `CLAUDE.md` v tomto repu.

**Lokální náhled:** `fetch` nefunguje z disku (file://). Spusť server:
`python3 -m http.server 8080` → otevři http://localhost:8080/
Na živo: https://eldee-hq.vercel.app (po pushi se aktualizuje samo, ~1 min).

**Deploy:** Vercel (import repa, žádný build — statický web).
Bez citlivých dat — finance a smlouvy sem nepatří.
