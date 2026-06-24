# eldee HQ (eldee-hq.vercel.app)

VEŘEJNÉ repo + web. Push = web se do ~1 min aktualizuje. Žádná citlivá data. Změny před pushem ohlas. Mluv česky, tykej, laicky. Mobile-first, tap targety ≥ 44 px.

## Živé artefakty (editovat JEN tady)
`index.html` (dashboard — vykresluje `data/stav.json`, NEpsát ručně) · `kalkulacka.html` · `kluby-vyhledavac.html` (+`data/kluby-data.json`) · `kniha.html` · `pruzkum-cilovky.html` · `maskot-editor/` · `eshop-nahled/` · `dotazniky.html` · `brand-assety.html`.

## ⚠️ POVINNÝ WORKFLOW: úkoly + stav (Hledík i Doležal)
Nástěnka = `data/stav.json` (úkoly, milníky, stav, odkazy). Deník (příběh) = `eldee-business/aktualni-stav.md`.
- Nový úkol → hned do `stav.json` (stav `další`, `kdo`, `vzniklo`).
- Splněný → `stav:"hotovo"` + datum. Milník → `timeline` (+ `stavKarty`/`meta`).
- Co je v nástěnce, krátce i v deníku. Před zápisem `git pull`. Na konci ověř, že deník a `stav.json` sedí.
- **⚠️ Po editaci `stav.json` VŽDY ověř JSON před pushem:** `node -e "require('./data/stav.json')"`. Rozbitý JSON shodí celý board. Rovná `"` uvnitř textu řetězec ukončí — nedávej ji dovnitř (české „ a " jsou OK).

Schema: `meta, stavKarty, timeline, ukoly[{id,text,stav,kdo,pozn,vzniklo,hotovo}], odkazy, tym`. Stav úkolu: `teď|další|fronta|hotovo|blokováno`. Plný postup: `eldee-business/CLAUDE.md` → „POVINNÝ WORKFLOW".

Lokální náhled: `python3 -m http.server 8080` (fetch nejde z file://).
