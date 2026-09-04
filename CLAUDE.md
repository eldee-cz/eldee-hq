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
- **⚠️ Po editaci `stav.json` VŽDY přegeneruj data skříně:** `node scripts/build-vitrina.js`. Skříň (`eldee.html`) čte `data/vitrina.json`, ne `stav.json` — jinak by si prohlížeč stáhl i úkoly. Když se rozejdou, spadne `tests/vitrina-data.test.js`.

Schema: `meta, stavKarty, timeline, ukoly[{id,text,stav,kdo,pozn,vzniklo,hotovo}], odkazy, tym, vitrina`. Stav úkolu: `teď|další|fronta|hotovo|blokováno|spí|neaktuální` — `spí` čeká na splněnou podmínku (typicky e-shop nebo prototyp), `neaktuální` = zavřeno bez splnění a MUSÍ mít vyplněný `duvod`. Plný postup: `eldee-business/CLAUDE.md` → „POVINNÝ WORKFLOW".

Nová pole: `skupina` u `odkazy[]` (dlaždice v kokpitu — `nastroj|brand|vyzkum|spici|archiv`) · `polozky` u sloučených dlaždic (pole `{nadpis,href,extern}` místo jednoho `href` — dlaždice má buď `href`, nebo `polozky`, nikdy obojí) · `verejne: true` u `timeline[]`/`stavKarty[]` položek, které smí do veřejné výkladní skříně (`eldee.html`) — chybějící pole = neveřejné, default je vždy zavřeno · kořenová sekce `vitrina` = ručně psané texty pro skříň (`coJsme, produkt, duvod, mereni`), needitovat jinde než tady.

## 🔒 Zámek (Basic Auth)
`middleware.ts` (zapojen přes `vercel.json` → `proxy`) zamyká **všechno kromě whitelistu**: `/eldee`, `/data/vitrina.json`, `/favicon.svg`, `/media/*`. Heslo je v proměnné prostředí **`HQ_HESLO`** na Vercelu — **nikdy ho nepiš do repa**. Nová veřejná stránka = dopsat ji do `VEREJNE` v `middleware.ts`, jinak ji zvenčí nikdo neotevře. Bez nastaveného `HQ_HESLO` se zámek vypne (pojistka proti vyzamčení).
⚠️ Přípona `.ts` je schválně: `middleware.mjs` Vercel u statického projektu ignoruje (nasadí ho jako soubor ke stažení) a `middleware.js` by vyžadoval `package.json` s `"type": "module"`, což by udělalo ESM i z `hq-core.js` a všech testů (jsou CommonJS) a rozbilo je. `.ts` si Vercel zkompiluje sám.

Testy: `for t in tests/*.test.js; do node $t; done` + `node tests/zamek.test.mjs`.

Lokální náhled: `python3 -m http.server 8080` (fetch nejde z file://).
