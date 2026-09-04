#!/usr/bin/env node
/* Vyrobí data/vitrina.json — datový soubor pro výkladní skříň (eldee.html).
   Skříň si stahuje CELÝ soubor, který dostane, takže nesmí dostat stav.json:
   měla by v prohlížeči i všechny úkoly a interní poznámky, i když je nevykreslí.
   Přenáší se jen pole, která se na skříni skutečně zobrazují (whitelist v hq-core.js).

   Spusť po každé změně data/stav.json:  node scripts/build-vitrina.js
   Hlídá to test:                        node tests/vitrina-data.test.js            */
const fs = require('fs');
const path = require('path');
const C = require('../hq-core.js');

const KOREN = path.join(__dirname, '..');
const ZDROJ = path.join(KOREN, 'data', 'stav.json');
const CIL   = path.join(KOREN, 'data', 'vitrina.json');

const stav = JSON.parse(fs.readFileSync(ZDROJ, 'utf8'));
const vitrina = C.vytvorVitrinu(stav);
fs.writeFileSync(CIL, JSON.stringify(vitrina, null, 2) + '\n');

const kb = n => (fs.statSync(n).size / 1024).toFixed(1) + ' kB';
console.log('data/vitrina.json hotová — ' + kb(CIL) + ' (stav.json má ' + kb(ZDROJ) + ')');
console.log('  milníků: ' + vitrina.timeline.length + ' · karet: ' + vitrina.stavKarty.length +
            ' · lidí: ' + vitrina.tym.length);
