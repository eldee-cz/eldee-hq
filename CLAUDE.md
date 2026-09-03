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

Schema: `meta, stavKarty, timeline, ukoly[{id,text,stav,kdo,pozn,vzniklo,hotovo}], odkazy, tym, vitrina`. Stav úkolu: `teď|další|fronta|hotovo|blokováno|spí|neaktuální` — `spí` čeká na splněnou podmínku (typicky e-shop nebo prototyp), `neaktuální` = zavřeno bez splnění a MUSÍ mít vyplněný `duvod`. Plný postup: `eldee-business/CLAUDE.md` → „POVINNÝ WORKFLOW".

Nová pole: `skupina` u `odkazy[]` (dlaždice v kokpitu — `nastroj|brand|vyzkum|spici|archiv`) · `polozky` u sloučených dlaždic (pole `{nadpis,href,extern}` místo jednoho `href` — dlaždice má buď `href`, nebo `polozky`, nikdy obojí) · `verejne: true` u `timeline[]`/`stavKarty[]` položek, které smí do veřejné výkladní skříně (`eldee.html`) — chybějící pole = neveřejné, default je vždy zavřeno · kořenová sekce `vitrina` = ručně psané texty pro skříň (`coJsme, produkt, duvod, mereni`), needitovat jinde než tady.

Hlídač schématu: `node tests/stav-schema.test.js`.

Lokální náhled: `python3 -m http.server 8080` (fetch nejde z file://).
