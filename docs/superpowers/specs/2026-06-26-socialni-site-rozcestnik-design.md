# Sociální sítě — rozcestník na HQ (design)

**Datum:** 2026-06-26
**Stav:** schváleno Lukášem (verbálně), staví se

## Cíl
Z dlaždice „📸 Instagram" na HQ udělat rozcestník **„📱 Sociální sítě"** pro všechny základní sociální sítě. Každá síť má vlastní kokpit (jako dnes Instagram): galerii vizuálů ve formátech, které daná síť potřebuje, a obsah na míru (hashtagy, popisky, plán, profil / struktura serveru…).

## Sítě (6)
Instagram, TikTok, YouTube/Shorts, Facebook, Discord, Threads.

## Architektura — sdílený motor (klíč k „přidej jednou, dostupné všude")
Místo kopírování `instagram.html` 6× → **sdílené soubory** + tenké stránky:

- `social.css` — všechny styly (1 zdroj, dnes duplikované v každém kokpitu).
- `social-assets.js` — **společný fond assetů** (MASKOTI, LOGA, slogany), knihovna formátů `FORMATS`, vykreslování na canvas (`renderPost`, `loadImg`, `loadSvgColored`, `drawText`), barvy. Žádné DOM ID.
- `social-engine.js` — DOM zapojení: postaví ovladače z `window.PLATFORM.formats`, mřížku, modal, stahování, přepínání záložek, kopírovací tlačítka. Generické — funguje na každé stránce sítě.
- `social-<sit>.html` — tenká stránka: hlavička, záložky, galerie (`<div id="controls">`+`<div id="grid">`), obsahové sekce v HTML, modal, `window.PLATFORM = {id, formats:[…]}` + načte 2 JS + CSS.
- `socialni-site.html` — rozcestník: mřížka 6 karet (ikona+barva sítě, popis, stav), klik → stránka sítě.

**Nový maskot/logo** → přidá se jednou do `social-assets.js` → naskočí u všech sítí v jejich formátech.

Složka `instagram-assets/` → přejmenovat na `social-assets/` (bude tam i Discord banner). Cesty v JS upravit.

## Knihovna formátů `FORMATS`
| id | rozměr | použití |
|---|---|---|
| ctverec | 1080×1080 | post 1:1, avatar, ikona serveru |
| portret | 1080×1350 | IG feed 4:5 |
| vertical | 1080×1920 | stories / reels / TikTok / Shorts (9:16) |
| sirka | 1280×720 | YouTube thumbnail, Discord banner (16:9) |
| ytbanner | 2560×1440 | YouTube kanálový banner |
| fbcover | 1640×856 | Facebook cover |
| fblink | 1200×630 | sdílení odkazu (1.91:1) |
| original | — | průhledné PNG / SVG |

`renderPost` zobecnit: maskot `contain` dle poměru stran (vertikál = pozice 0.40; široké bannery = menší výška, neroztáhnout přes celou šířku). Textová loga fungují na libovolný rozměr už dnes.

### Formáty per síť
- Instagram: ctverec, portret, vertical, original
- TikTok: vertical, ctverec, original
- YouTube: sirka, vertical, ytbanner, ctverec, original
- Facebook: ctverec, fblink, fbcover, vertical, original
- Discord: ctverec, sirka, original
- Threads: ctverec, portret, vertical, original

## Obsah per síť (záložky na míru)
- **Instagram** (přesun beze ztráty): Galerie · #Hashtagy · Popisky · Plán · Profil
- **TikTok** (naplno): Galerie · #Hashtagy (TikTok styl) · Popisky (hook) · 🎬 Nápady na videa · Profil
- **YouTube** (struktura): Galerie · 📝 Názvy+popisy (SEO) · Plán (Shorts vs dlouhé) · Kanál setup
- **Facebook** (struktura): Galerie · Popisky · 📣 Stránka/skupiny/události · Profil
- **Discord** (struktura): Galerie (ikona+banner) · 🏗️ Struktura serveru · 👋 Uvítání+pravidla · 📢 Oznámení
- **Threads** (struktura): Galerie · Popisky · Plán

„Struktura" = záložky, formáty a galerie hotové; texty stub „připravujeme", doplní se postupně.

## Nástěnka (stav.json)
- Odkaz „Instagram kokpit" → „Sociální sítě" (href `socialni-site.html`, text popisuje hub).
- Timeline milník. Úkol „doplnit obsah zbylých sítí (YouTube/FB/Discord/Threads)".

## Ověření
JSON validní (`node -e "require('./data/stav.json')"`), JS bez chyb, headless screenshot rozcestníku + IG + TikTok (PC i mobil), assety 200.
