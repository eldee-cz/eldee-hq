# Instagram galerie na HQ — design spec

**Datum:** 2026-06-25
**Stav:** schváleno Lukym, jde do implementace

## Cíl

Nová proklikávací dlaždice „Instagram" na HQ (`eldee-hq.vercel.app`) = galerie veškerého
vizuálního materiálu (maskot Eldee + loga), který se dá šířit na Instagramu. Luky ovládá IG
i z telefonu → galerie musí umět **uložit obrázek do telefonu v max rozlišení** a hotové posty
musí vypadat **profi** (uzpůsobené potřebám IG).

## Rozsah (schváleno)

- **IG-ready formáty** — z každého maskota/loga složí galerie hotový post na brandovém pozadí
  ve dvou poměrech: **čtverec 1:1 (feed)** a **9:16 (stories)**. Plus **originál** = čisté
  transparentní PNG / logo ke stažení.
- Styl pozadí: **čistá brand barva** (ne záře, ne pattern) + malé logo v rohu. Minimalistické.

## Kde to žije

- `eldee-hq/instagram.html` — single-file stránka ve stylu HQ (jako `kalkulacka.html`, `sklad.html`).
- Assety se nakopírují do `eldee-hq/instagram-assets/` (maskot + loga), aby se stahovaly
  same-origin a rychle. Jsou to materiály určené k veřejnému šíření → veřejné repo HQ je OK.
- Dlaždice na HQ: přidat do `data/stav.json` (odkaz + popis) → `index.html` ji vykreslí.

## Obsah galerie

**Maskot (finální pózy, z `eshop/maskot/`):**
- Hero (`eldee-hero-FINAL-transparent.png`, 1792×2400)
- Prodejce (`eldee-prodejce-transparent.png`, 896×1200)
- Fotbalista (`eldee-fotbalista-transparent.png`, 896×1200)
- Srdíčko (`eldee-srdicko-transparent.png`, 896×1200)
- ⚠️ Sezónní drop série se VYNECHÁVÁ (tajná zbraň do zálohy).

**Loga (z brandbooku `public/logo/`):**
- Monogram LD, wordmark „eldee" (light/dark), vertikální lockup.

## Brand barvy pozadí

- Černá `#0A0A0A`, Zlatá `#C9A227`, Červená `#B91C1C`. Doplňková kost `#F5F5F0`.
- Logo v rohu se barví kontrastně (na černé → kost/zlatá, na zlaté → černá, na červené → kost).

## UI (mobile-first, velké tap targety ≥44px)

1. Tři přepínače nahoře:
   - **Co:** Maskot / Loga
   - **Pozadí:** ⚫ Černá · 🟡 Zlatá · 🔴 Červená
   - **Formát:** ⬛ Čtverec 1:1 · 📱 Stories 9:16 · 🪟 Originál (transparentní)
2. **Mřížka náhledů** — každá položka ukazuje, jak post vypadá na zvolené barvě a formátu.
3. Klik na náhled → velký detail + velké tlačítko **„⬇ Uložit do telefonu"**.

## Technika

- Skládá to **prohlížeč přes `<canvas>`** (jako editor maskota). Žádné externí nástroje, žádný build.
- Render na cílové plátno: **1:1 = 1080×1080**, **9:16 = 1080×1920** (IG standard, ostré).
  Maskot vycentrovaný, zabírá ~70–80 % výšky, malé logo v rohu, pozadí = zvolená brand barva.
- Stažení: `canvas.toBlob()` → download. Funguje na mobilu (HQ je https, assety same-origin).
- **Originál** = přímý download zdrojového souboru (transparentní PNG / SVG/PNG loga).

## Rozšíření 2026-06-25 — z galerie na „IG kokpit"

Galerie se ještě téhož dne rozrostla na kompletní startovní výbavu pro IG (Lukáš začíná
postovat, je začátečník). `instagram.html` má 5 záložek:

1. **🖼️ Galerie** — původní (maskot, loga, + textová loga eldee.cz a slogan Holy Socks
   vykreslená canvasem; krátká i plná verze sloganu). Stažení telefon i PC.
2. **#️⃣ Hashtagy** — 5 kopírovacích sad (brand / produkt / komunita / drop / dosah), CZ+EN.
3. **✍️ Popisky** — 5 captionů v eldee tónu (představení, proč díry, drop teaser, Holy Squad
   nábor, behind the scenes), ke zkopírování s `[doplň]` místy.
4. **🗓️ Plán** — pořadí prvních ~12 postů s tipem na vizuál a hookem.
5. **👤 Profil** — bio, jméno účtu, strategie odkazu (Linktree), návod na highlight covers.

Obsah postaven na existující marketingové strategii (`eldee-business/marketing/02-holy-socks-campaign.md`,
`04-community-content-engine.md`). Kopírování přes `navigator.clipboard` + fallback.

**Copy rozhodnutí (Lukáš):**
- **Drop 001 = jen díry**, kapsa na chránič NENÍ v launch copy (přijde později).
- Mluvit o **štulpnách**, ne ponožkách; nikdy „posekané ponožky".
- Claim o křečích/ráně = jen jako schválená brand nadsázka („někdo tvrdí… ať je pravda
  jakákoliv — chceš to riskovat?"), nikdy přímé zdravotní tvrzení. Obrat opraven na
  „s volným lýtkem dáš tvrdší ránu" (v IG kokpitu; brandbook + mockupy se stejným starým
  obratem zatím ponechány — sjednotit příště).

## Mimo rozsah (kdyžtak později)

- Další pozadí (záře, pattern), karusely, generování textu přímo na maskotův post.
- Sezónní maskoti (až se dropnou).
- Sjednocení obratu „dáš tvrdší ránu" do brandbooku a produktových mockupů.
