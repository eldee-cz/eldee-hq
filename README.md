# eldee HQ

Interní přehled projektu eldee (Holy Socks) — jednostránkový statický web pro tým.

- `index.html` — dashboard; **vykresluje se z `data/stav.json`** (úkoly, milníky, stav, odkazy)
- `data/stav.json` — **zdroj pravdy nástěnky**. Obsah měň TADY, ne v `index.html`.
- `data/vitrina.json` — **generovaný** výřez pro skříň (`node scripts/build-vitrina.js`). Needituj ručně.
- `favicon.svg` — LD monogram v2.0

**index.html** je pracovní kokpit pro tým (Hledík + Doležal) — vidí úkoly, termíny i interní poznámky.
**eldee.html** je veřejná výkladní skříň pro lidi zvenčí (výrobce, testery, kluby) — čte
`data/vitrina.json`, malý soubor vyrobený ze `stav.json` z položek označených `verejne: true`.
Skříň se **nikdy** nesmí napojit na `stav.json`: prohlížeč si stahuje celý soubor, který dostane,
takže by měl v ruce i všechny úkoly a interní poznámky, i kdyby je nevykreslil.
Pojistky: `tests/vitrina-data.test.js` a `tests/vitrina-unik.test.js`.

**Zámek:** `middleware.ts` chrání Basic Auth vše kromě skříně a jejích obrázků. Heslo je
v proměnné prostředí `HQ_HESLO` na Vercelu, v repu není. Kryto `tests/zamek.test.mjs`.

**Aktualizace:** úkoly/milníky/stav udržuje Jarvis (Claude Code) v `data/stav.json`;
příběh a kontext zůstává v deníku `07-eldee-business/aktualni-stav.md`.
Závazný postup: `07-eldee-business/CLAUDE.md` → „POVINNÝ WORKFLOW" + `CLAUDE.md` v tomto repu.

**Lokální náhled:** `fetch` nefunguje z disku (file://). Spusť server:
`python3 -m http.server 8080` → otevři http://localhost:8080/
Na živo: https://eldee-hq.vercel.app (po pushi se aktualizuje samo, ~1 min).

**Deploy:** Vercel (import repa, žádný build — statický web).
Bez citlivých dat — finance a smlouvy sem nepatří.
