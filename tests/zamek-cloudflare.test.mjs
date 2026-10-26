// Kontrola zámku HQ pro Cloudflare Pages (functions/_middleware.js).
// Stejné případy jako zamek.test.mjs + rozdíly: bez HQ_HESLO se zamyká, vše nese noindex.
// Spuštění: node tests/zamek-cloudflare.test.mjs
import assert from 'assert';
import { onRequest } from '../functions/_middleware.js';

let pass = 0, fail = 0;
async function t(name, fn){ try{ await fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }

const HESLO = 'testovaci-heslo-123';
const PUSTENO = 'statický soubor';
const BEZ_HESLA = null; // HQ_HESLO na Cloudflare vůbec není nastavené
const basic = (jmeno, heslo) => 'Basic ' + Buffer.from(jmeno + ':' + heslo).toString('base64');

// next() = Cloudflare by vrátil statický soubor; tady poznávací odpověď
function zavolej(cesta, auth, heslo = HESLO) {
  const request = new Request('https://hq.eldeeworld.com' + cesta, {
    headers: auth ? { authorization: auth } : {}
  });
  const env = heslo === BEZ_HESLA ? {} : { HQ_HESLO: heslo };
  return onRequest({ request, env, next: async () => new Response(PUSTENO, { status: 200 }) });
}
async function proslo(r) {
  return r.status === 200 && (await r.text()) === PUSTENO;
}

// ── ven bez hesla ────────────────────────────────────────────────
for (const cesta of ['/eldee', '/eldee.html', '/data/vitrina.json', '/favicon.svg',
  '/media/produkt-stulpny.png', '/media/maskot-eldee.png']) {
  await t('bez hesla projde: ' + cesta, async ()=>{
    const r = await zavolej(cesta);
    assert.ok(await proslo(r), 'mělo projít, ale zamklo se');
  });
}

// ── za heslem ────────────────────────────────────────────────────
for (const cesta of ['/', '/index.html', '/kalkulacka', '/kalkulacka.html', '/kniha.html',
  '/data/stav.json', '/sklad.html', '/mereni-nohou.html', '/hq-core.js',
  '/data/kluby-data.json', '/dotazniky.html', '/middleware.ts', '/CLAUDE.md',
  '/tests/zamek.test.mjs', '/functions/_middleware.js']) {
  await t('bez hesla NEprojde: ' + cesta, async ()=>{
    const r = await zavolej(cesta);
    assert.strictEqual(r.status, 401);
    assert.ok(/^Basic /.test(r.headers.get('WWW-Authenticate') || ''));
    assert.ok(!(await r.text()).includes(PUSTENO), 'obsah prosákl');
  });
}

// ── heslo ────────────────────────────────────────────────────────
await t('správné heslo pustí na kokpit', async ()=>{
  assert.ok(await proslo(await zavolej('/', basic('eldee', HESLO))));
});
await t('správné heslo pustí i na stav.json', async ()=>{
  assert.ok(await proslo(await zavolej('/data/stav.json', basic('kdokoliv', HESLO))));
});
await t('na uživatelském jménu nezáleží', async ()=>{
  assert.ok(await proslo(await zavolej('/', basic('', HESLO))));
});
await t('heslo s dvojtečkou uvnitř projde celé', async ()=>{
  assert.ok(await proslo(await zavolej('/', basic('u', 'a:b:c'), 'a:b:c')));
});
await t('špatné heslo nepustí', async ()=>{
  assert.strictEqual((await zavolej('/', basic('eldee', 'spatne'))).status, 401);
});
await t('heslo o stejné délce, ale jiné, nepustí', async ()=>{
  assert.strictEqual((await zavolej('/', basic('eldee', 'x'.repeat(HESLO.length)))).status, 401);
});
await t('rozbitá hlavička nepustí', async ()=>{
  for (const h of ['Basic', 'Basic !!!nen0-base64!!!', 'Bearer token', 'nesmysl']) {
    assert.strictEqual((await zavolej('/', h)).status, 401, 'prošlo: ' + h);
  }
});

// ── bez nastaveného hesla se ZAMYKÁ (rozdíl proti Vercelu) ───────
await t('bez HQ_HESLO je kokpit zavřený (503)', async ()=>{
  const r = await zavolej('/', undefined, BEZ_HESLA);
  assert.strictEqual(r.status, 503);
  assert.ok(!(await r.text()).includes(PUSTENO));
});
await t('bez HQ_HESLO je stav.json zavřený i s libovolným heslem', async ()=>{
  assert.strictEqual((await zavolej('/data/stav.json', basic('x', ''), BEZ_HESLA)).status, 503);
});
await t('bez HQ_HESLO skříň dál běží', async ()=>{
  assert.ok(await proslo(await zavolej('/eldee', undefined, BEZ_HESLA)));
});

// ── whitelist je výčet, ne prefix ────────────────────────────────
await t('podvržená cesta se skrz whitelist neprotlačí', async ()=>{
  for (const cesta of ['/eldee.html.bak', '/data/vitrina.json.old', '/eldeeXXX', '/data/stav.json?x=/eldee']) {
    assert.strictEqual((await zavolej(cesta)).status, 401, 'prolezlo: ' + cesta);
  }
});

// ── vyhledávače ──────────────────────────────────────────────────
await t('všechny odpovědi nesou noindex', async ()=>{
  const odpovedi = [await zavolej('/eldee'), await zavolej('/'), await zavolej('/', basic('e', HESLO)),
    await zavolej('/', undefined, BEZ_HESLA)];
  for (const r of odpovedi) assert.strictEqual(r.headers.get('X-Robots-Tag'), 'noindex, nofollow');
});

console.log(pass + ' OK, ' + fail + ' chyb');
process.exit(fail ? 1 : 0);
