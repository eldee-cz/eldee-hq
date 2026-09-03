# Revize eldee HQ — kokpit + výkladní skříň — design

**Datum:** 2026-09-03
**Sekce:** celé HQ (`index.html`, `data/stav.json`, nový `eldee.html`)
**Cíl:** HQ dnes míchá pět různých věcí na jedné úrovni — denní řízení, živé nástroje, brand rozcestník, provozní nástroje pro e-shop, který neběží, a archiv. Rozdělit to na **kokpit** (pro Hledíka a Doležala, denní práce) a **výkladní skříň** (pro lidi, kterým se pošle odkaz) nad jedním zdrojem dat.

## Rozhodnutí (z brainstormingu s Lukášem 3. 9. 2026)

1. **Dvě stránky, jeden zdroj dat.** `index.html` = kokpit, `eldee.html` = skříň. Obě se kreslí ze `stav.json`. Skříň zobrazuje jen položky s příznakem `verejne: true`. Zvažované a zamítnuté: dva samostatné weby (stav by se za dva měsíce rozešel — přesně ten problém, který se teď uklízí) a jedna stránka s přepínačem (riziko, že se omylem pošle pracovní režim).
2. **Publikum skříně = úzký okruh.** Výrobce, testeři, ambasadoři, trenéři klubů, možný parťák. Dostanou odkaz, žádný zámek. Skříň musí být srozumitelná bez Lukášova výkladu.
3. **Nic se nemaže ze souborů.** Dlaždice mizí ze zorného pole, ne z disku. `sklad.html`, `objednavky.html`, `reklamace.html` zůstávají funkční na svých adresách.
4. **Default je neveřejné.** Co nemá `verejne: true`, do skříně nejde. Nový obsah je tedy automaticky interní.
5. **Zabezpečení kokpitu není součástí této práce.** Kokpit zůstává veřejně čitelný, jak je dnes. Úkol `zabezpeceni-hq` je samostatný a řeší se zvlášť.

## Datový model (`stav.json`)

Rozšíření, nic se nepřejmenovává ani nemaže:

| pole | kde | hodnoty | k čemu |
|---|---|---|---|
| `stav` | `ukoly[]` | přibývá `"spí"` a `"neaktuální"` | `spí` = čeká na splnění podmínky (typicky e-shop). `neaktuální` = zavřeno, aniž by se to udělalo. |
| `duvod` | `ukoly[]` | text | proč je úkol `neaktuální`; u jiných stavů se nepoužívá |
| `verejne` | `timeline[]`, `stavKarty[]`, `odkazy[]` | `true` / chybí | co smí do skříně; chybějící pole = neveřejné |
| `skupina` | `odkazy[]` | `"nastroj"` \| `"brand"` \| `"vyzkum"` \| `"spici"` \| `"archiv"` | do které skupiny dlaždice patří v kokpitu |
| `polozky` | `odkazy[]` | pole `{nadpis, href, extern}` | dlaždice s víc odkazy (Brand, Výzkum, Až bude e-shop). Alternativa k `href` — dlaždice má buď jedno, nebo druhé, nikdy obojí. |
| `vitrina` | kořen | objekt s texty | ručně psané texty pro skříň (bloky 1–4), aby se nemíchaly s provozními daty |

Formát `vzniklo` a `hotovo` se sjednocuje na **ISO** (`2026-08-28`). Deset úkolů má dnes český formát (`25. 8. 2026`) — přepíše se.

## Kokpit (`index.html`)

Sekce shora dolů:

1. **Teď** — úkoly ve stavu `teď` a `další`. Pod nimi sbalené: „ukázat frontu (N)" a „spící (N)". Úkoly `neaktuální` se nezobrazují vůbec.
2. **Nástroje** — 6 dlaždic se `skupina: "nastroj"`.
3. **Brand** — jedna dlaždice se čtyřmi odkazy.
4. **Stav & hotovo** — 7 karet + posledních 8 milníků, starší za „ukázat starší (39)".
5. **Spící & archiv** — sbalené skupiny dlaždic `skupina: "spici"` a `"archiv"`.
6. **Tým** — bez prázdného slotu.

**Ruší se:** sekce **Kalendář** (obsahuje dvě demo události z 27. 6. a 1. 7., tři měsíce nepoužito; termíny patří k úkolům) a sekce **Brainstorm** (placeholder „brzy" od 24. 6.).

### Dlaždice: 20 → 12

| dlaždice | skupina | poznámka |
|---|---|---|
| 📏 Měření nohou | nastroj | |
| 🔎 Hledač klubů | nastroj | |
| 💰 Finance | nastroj | |
| 📱 Sociální sítě | nastroj | |
| 🦥 Maskot | nastroj | |
| 📖 Business kniha | nastroj | |
| 🎨 **Brand** | brand | **nová sloučená** — Logomanual (veřejný) · Brandbook (interní) · Brand assety · Logo balíček v2 |
| 🧪 **Výzkum & dotazníky** | vyzkum | **nová sloučená** — Průzkum cílovky 6/2026 · Dotazníky · Testovací systém vzorků |
| 🌐 **eldeeworld.com** | archiv | nahrazuje dlaždici „eldee.cz — doména připravena", která nese zrušený plán (rozhodnutí z 2. 9.). Zůstává ve stavu `soon`, dokud doména není koupená — pak se překlopí na `on` a přesune do `nastroj`. |
| 💻 GitHub — eldee-cz | archiv | přesměrovat z repa `eldee-brandbook` na celou organizaci |
| 🦥 První AI video maskota | archiv | památka, ne nástroj |
| 📦 **Až bude e-shop** | spici | **nová sloučená** — Sklad · Objednávky · Reklamace & vrácení · Náhled e-shopu |

Skupina `archiv` se v kokpitu zobrazuje sbalená stejně jako `spici`.

## Výkladní skříň (`eldee.html`)

Sedm bloků:

| # | blok | zdroj |
|---|---|---|
| 1 | **Co eldee je** — „One of Us.", štulpny s prostřižením + kapsa na chránič, dva průmyslové vzory chráněné v celé EU | `vitrina.coJsme` |
| 2 | **Produkt** — 4 produkty (návlek · tréninková ponožka · nízká · vysoká štulpna), fáze vzorkování | `vitrina.produkt` |
| 3 | **Proč to dává smysl** — 27 hráčů z cílovky: 93 % nosí tube návlek, kapsa nejžádanější (63 %), cena 599 Kč potvrzena | `vitrina.duvod` |
| 4 | **Jak to děláme poctivě** — 54 změřených nohou ve 4 velikostech, zadání pro výrobce z mediánů | `vitrina.mereni` |
| 5 | **Co už stojí** — milníky s `verejne: true` | `timeline[]` |
| 6 | **Brand** — odkaz na veřejný logomanual | `odkazy[]` s `verejne: true` |
| 7 | **Kdo za tím stojí** — Doležal, Hledík, kontakt | `tym[]` |

### Co do skříně nesmí

Tvrdá hranice, platí i pro budoucí obsah:

- úkoly, priority, plány
- jakákoli čísla: marže, výrobní ceny, kapitál, cíle obratu
- jméno a lokace výrobce
- FOUL benchmark a cokoli z konkurenční analýzy
- interní brandbook, sklad, objednávky, reklamace
- naměřené rozměry (počet měření ano, mediány ne)

Blok 4 je ve skříni schválně: měření skutečných nohou je věc, kterou konkurence nedělá, a výrobci i klubu prodá poctivost postupu.

## Úklid dat

### Duplicity → sloučit

- `mereni-s-xl` + `mereni-dosbirat-velikosti` → jeden úkol na velikost XL (vzniklo duplicitně 3. 9.)
- „Založit / oživit profily" (25. 8.) + „Sjednotit jméno na eldeeworld" (2. 9.) → jeden úkol

### Fronta (24 úkolů) → tři hromádky

**Spí (9)** — čeká na e-shop nebo prototyp:
Sklad další etapa · Sklad prodejní analytika · Plná Shoptet automatizace · Objednávky fáze 3 · Objednávky fáze 4 · E-shop launch (Shoptet) · Obchodní podmínky + GDPR + FAQ · Marketing pre-launch zásoba · Produktové fotky (čeká na prototyp)

**Živé, jen ne teď (11)** — zůstávají ve frontě:
Vyhodnotit feedback vzorků v2 · CRM hledače do sdíleného souboru · Drop 001 forma a mix · Konzultace účetní + právník · Potvrdit 4 finální produkty a ceny · Kluby B2B nástroje · Brandbook copy drobnosti · Zabezpečit HQ · Maskot hero (ilustrátor) · Blok B ambasadoři + UGC · Německá linka FOUL

**Neaktuální (4)** — návrh k zavření, **potvrzuje Lukáš položku po položce**:

| úkol | od | proč navrhuji zavřít |
|---|---|---|
| Doména `brand.eldee.cz` pro brand book | 24. 5. | logomanual mezitím dostal vlastní adresu; doménová strategie se 2. 9. změnila na eldeeworld.com |
| Rozvést sekci Brainstorm na HQ | 24. 6. | sekce se touto revizí ruší |
| Kalendář na HQ — doplnit fíčury | 24. 6. | sekce se touto revizí ruší |
| Ověřit barvy dresů u ~100 P3 klubů | 19. 5. | čtyři měsíce beze změny; akvizice klubů jde teď cestou telefonátů (blok B), ne dočišťování databáze |

### Další úklid

- **7 karet „Stav teď"** — projít proti deníku, srovnat se skutečností (nejstarší pocházejí z doby před vzorkováním).
- **Smazat:** dvě demo události kalendáře, prázdný slot „Doplnit" v týmu.
- **Timeline** zůstává celá (47 milníků = archiv), mění se jen zobrazení.

## Ověření

1. `node -e "require('./data/stav.json')"` po každé editaci — rozbitý JSON shodí board.
2. Kokpit i skříň projít v headless Chromu na mobilním rozměru (420 px) i na PC.
3. **Kontrola úniku:** ve vykreslené skříni nesmí být žádná položka bez `verejne: true`, žádné číslo z kalkulačky a žádný naměřený rozměr. Ověřuje se čtením vykresleného textu, ne kódu.
4. Odkazy ve všech 11 dlaždicích musí vést na existující cíl.

## Mimo rozsah

- zámek HQ / autentizace (samostatný úkol `zabezpeceni-hq`)
- přesun skříně na `eldeeworld.com` (doména zatím není koupená)
- jakákoli změna uvnitř nástrojů (sklad, objednávky, reklamace, kalkulačka, měření)
- nové funkce kalendáře — kalendář se ruší
