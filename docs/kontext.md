# eldee HQ — kontext projektu

Sdílený kontext pro tým (Lukáš Doležal + Lukáš Hledík). Udržuje Jarvis (Claude Code) — na konci sezení sem zapisuje, co se udělalo, aby na tom mohli pracovat oba.

POZOR: eldee-hq je VEREJNE repo. Zadne finance, smlouvy, hesla, sura cisla. Jen "jak nastroje funguji / co pribilo".

---

## Zive artefakty (stranka po strance)

### Nastěnka (`index.html`)
Dashboard projektu. Vykresluje karty, ukoly, milniky a odkazy z `data/stav.json`. Nikdy ji nerucne nepsat — vse jde pres stav.json.

### Finance (`kalkulacka.html`) — dlazdice "Kalkula Finance"
Vse o penezich. Nic o zbozi.

**Co umi (stav 2026-06-24, po cisteni):**
1. **Produkty, ceny, prvky, mix** — navlek, ponozka, nizka/vysoka stulpna, bundle. Marze/ks se pocita z ceny, COGS, brany (2,5 % + 5 Kc) a marketingu.
2. **Prvky / priplatky** — Grip, Kapsa, Dira. U produktu se zapinaji klicimi stitky, promnituji se do ceny i COGS a do celkovych vysledku.
3. **MOQ cenik** — u kazdeho produktu mnozstevni cenik (mnozstvi → cena/ks). Vetsi MOQ = nizsi cena/ks = vyssi marze.
4. **Cile + naseptavac** — cil cisteho/mes, cilova marze/ks, cilova zasoba (mesice). Zelene rady, jak se k cili dostat.
5. **Nejblizsi udalosti** — 5 rucnich terminu (DPH, danove priznani…). Barevne podle dni do terminu.

Co bylo odebrany (presunuto do sklad.html): prijem zbozi (faktury), sklad podle variant, splatnosti faktur.

### Sklad (`sklad.html`) — dlazdice "Sklad" — NOVA od 2026-06-24
Vse o zbozi. Nic o penezich.

**Co umi:**
1. **Prijem zbozi (faktury)** — kazdy radek = jedna prijata varianta: Produkt, Barva, Provedeni (grip/kapsa/dira i kombinace), Velikost (5 rad 31-34…47-50), mnozstvi, cena bez DPH/ks, splatnost. Cena s DPH a celkova castka se pocitaji samy.
2. **Sklad podle variant se SKU kody** — automaticky secte kusy z prijmu zbozi podle varianty (format SKU: PRODUKT-BARVA-PRVKY-VEL, napr. `NIZ-BIL-D-3942`).
3. **KPI prouzek** — kusu skladem, pocet variant, hodnota skladu, celkem k zaplaceni.
4. **Splatnosti faktur** — hlida co a kdy je potreba zaplatit; odznak na tlacitku kdyz je neco nezaplacene.
5. **Export pro Shoptet (CSV)** — SKU, nazev, barva, provedeni, velikost, skladem. K importu do Shoptetu nebo pozdeji pro zive API.
6. **Zaloha / Nactit soubor** — data se ukladaji v prohlizeci (localStorage, klic `eldeeData`). Zaloha = JSON soubor → ulozit rucne do eldee-business (privatni repo). Takhle sdili Luky s Hledikerm.

**Vzhled:** data-grid styl a la SAP/Excel — husta mrizka, rozbalovacky primo v bunkach, sticky hlavicka.

**Dulezity pivot (kontxt proc to tak je):** ursprotni brainstorm smeroval k webappce na Cloudflare + Supabase (cloud sharing, heslovani). Luky to zjednodusil: zatim stranka na HQ + localStorage v prohlizeci. Sdileni skladu s Hledikerm pres tlacitko Zaloha (soubor do eldee-business). Plne cloud sdileni a heslovani az se rozjede realny prodej.

**Sdileny localStorage:** oba soubory (sklad.html i kalkulacka.html) pouzivaji stejny klic `eldeeData` na stejnem originu → data jsou sdilena.

### Ostatni stranka
- `kluby-vyhledavac.html` — hledac fotbalovych klubu (+ `data/kluby-data.json`)
- `kniha.html` — studijni material (kap. 8 knihy)
- `pruzkum-cilovky.html` — pruzkum cilove skupiny
- `maskot-editor/` — editor maskota (cisteni krabice, klonování)
- `eshop-nahled/` — mockup e-shopu
- `dotazniky.html` — dotazniky
- `brand-assety.html` — brand assety

---

## Provoz / workflow

- **Pri startu eldee** Jarvis otevere GitHub stranku eldee-hq v prohlizeci (prehled stavu).
- **Na konci sezeni** agent `eldee-hq-keeper` aktualizuje tenhle soubor, hlida citliva data a navrhne commit; push az po ohlasenI Lukymu.
- Deploy eldee-hq: staticky web (Vercel), push = web nazivo do minuty.
- Novy ukol / splneny ukol / milnik: vzdy do `data/stav.json`. Po editaci stav.json VZDY over JSON: `node -e "require('./data/stav.json')"`.

---

## Roadmap (co se chysta)

- **Sklad — dalsi etapa** (v ukolu jako fronta): co presne, zatim v brainstormu.
- **Zive Shoptet API** — online prenos skladu, nenabizet varianty co nejsou skladem. Potrebuje Shoptet pristupy.
- **Propojeni s rodinnym kalendarem** — pravidelne terminy (DPH, danove priznani, splatnosti faktur) automaticky do kalendare.
- **Cloud sharing / heslovani skladu** — az se rozjede realny prodej.
