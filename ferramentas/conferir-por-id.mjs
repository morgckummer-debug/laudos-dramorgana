// Confere que uma mudança só de LAYOUT do formulário não mexeu em nada que o
// laudo usa. Diferente do testar-laudos.mjs, que preenche os campos na ordem da
// tela (e por isso acusa diferença sempre que um campo muda de lugar), aqui o
// valor de cada campo sai do próprio id: mudar a ordem não muda o que entra.
//
//   npx http-server . -p 8901 -s &
//   node ferramentas/conferir-por-id.mjs http://127.0.0.1:8901 antes.json transvaginal perineal
//   # ... a mudança ...
//   node ferramentas/conferir-por-id.mjs http://127.0.0.1:8901 depois.json transvaginal perineal
//   node ferramentas/conferir-por-id.mjs --comparar antes.json depois.json
//
// Para cada laudo roda vários cenários (cada select numa opção diferente,
// caixas marcadas ou não) e guarda: o laudo montado (#paper), o valor de todo
// campo depois do render() (inclui os calculados: volumes, IP médio...), a
// lista de ids do formulário, o rascunho, o Word e os campos depois de
// recarregar a página (o rascunho tem de devolver tudo).
import fs from 'node:fs';

if (process.argv[2] === '--comparar') {
  const a = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const b = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  // A ordem das chaves segue a ordem dos campos na tela, que é justamente o
  // que uma mudança de layout muda: compara sem ela.
  const ord = v => Array.isArray(v) ? v.map(ord)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ord(v[k])])) : v;
  const norm = c => ({ ...c, campos: ord(c.campos), camposRecarregado: ord(c.camposRecarregado),
    rascunho: (c.rascunho || []).map(t => { try { return ord(JSON.parse(t)); } catch (e) { return t; } }) });
  for (const k of Object.keys(a)) { a[k] = a[k].map(norm); if (b[k]) b[k] = b[k].map(norm); }
  let falhas = 0;
  for (const nome of Object.keys(a)) {
    if (!b[nome]) { console.log(`✗ ${nome}: falta no segundo arquivo`); falhas++; continue; }
    a[nome].forEach((ca, i) => {
      const cb = b[nome][i];
      for (const k of Object.keys(ca)) {
        const x = JSON.stringify(ca[k]), y = JSON.stringify(cb && cb[k]);
        if (x !== y) {
          falhas++;
          console.log(`✗ ${nome} cenário ${i}: mudou "${k}"`);
          if (ca[k] && typeof ca[k] === 'object' && !Array.isArray(ca[k])) {
            for (const kk of new Set([...Object.keys(ca[k]), ...Object.keys(cb[k] || {})]))
              if (JSON.stringify(ca[k][kk]) !== JSON.stringify((cb[k] || {})[kk]))
                console.log(`    ${kk}: ${JSON.stringify(ca[k][kk])} → ${JSON.stringify((cb[k] || {})[kk])}`);
          }
        }
      }
    });
    if (!falhas) console.log(`✓ ${nome}: ${a[nome].length} cenários iguais`);
  }
  process.exit(falhas ? 1 : 0);
}

// Mesma busca do Playwright que o testar-laudos.mjs faz.
async function carregarPlaywright(){
  const tentativas = ['playwright', 'playwright-core'];
  if (process.env.PLAYWRIGHT_PATH) tentativas.unshift(process.env.PLAYWRIGHT_PATH);
  for (const raiz of ['/usr/lib/node_modules', '/usr/local/lib/node_modules', '/opt/node22/lib/node_modules'])
    tentativas.push(`${raiz}/playwright/index.mjs`);
  for (const t of tentativas) {
    try { return await import(t); } catch(e) { /* tenta o próximo */ }
  }
  console.error('Playwright não encontrado. Instale com:  npm i -g playwright');
  process.exit(3);
}
const { chromium } = await carregarPlaywright();

const [base, saidaArq, ...laudos] = process.argv.slice(2);
const CENARIOS = 5;

// Valor estável a partir do id.
const preencher = (cen) => {
  const h = s => { let x = 7; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
  const campos = () => [...document.querySelectorAll('#formCol input[id], #formCol select[id], #formCol textarea[id]')];
  const disparar = el => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  // Três passadas: selects e caixas abrem campos novos (cistos, miomas...).
  for (let passo = 0; passo < 3; passo++) {
    for (const el of campos()) {
      if (el.dataset.preenchido) continue;
      if (el.tagName === 'SELECT') {
        if (!el.options.length) continue;
        el.selectedIndex = (h(el.id) + cen) % el.options.length;
      } else if (el.type === 'checkbox') {
        el.checked = ((h(el.id) + cen) % 3) === 0;
      } else if (el.type === 'radio' || el.type === 'file' || el.type === 'button' || el.readOnly) {
        continue;
      } else if (/cpf/i.test(el.id)) {
        el.value = '123.456.789-09';
      } else if (/dd[\/.]mm/.test(el.placeholder) || /^data/i.test(el.id)) {
        el.value = '1' + (h(el.id) % 9) + '/0' + (1 + cen) + '/2026';
      } else if (el.inputMode === 'decimal') {
        el.value = String(1 + (h(el.id) + cen) % 8) + ',' + String((h(el.id) >> 3) % 10);
      } else if (el.inputMode === 'numeric') {
        el.value = String(1 + (h(el.id) + cen) % 9);
      } else {
        el.value = 'T' + (h(el.id) % 1000);
      }
      el.dataset.preenchido = '1';
      disparar(el);
    }
  }
  campos().forEach(el => delete el.dataset.preenchido);
};

const lerCampos = () => {
  const o = {};
  for (const el of document.querySelectorAll('#formCol input[id], #formCol select[id], #formCol textarea[id]'))
    o[el.id] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
  return o;
};

const navegador = await chromium.launch();
const saida = {};
for (const nome of laudos) {
  saida[nome] = [];
  for (let cen = 0; cen < CENARIOS; cen++) {
    const ctx = await navegador.newContext();
    await ctx.route('**://*/**', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(e.message));
    await page.goto(`${base}/${nome}.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const ids = await page.evaluate(() => [...document.querySelectorAll('#formCol [id]')].map(e => e.id).sort());
    await page.evaluate(preencher, cen);
    await page.waitForTimeout(1200);
    const laudo = await page.evaluate(() => document.getElementById('paper').innerHTML);
    const campos = await page.evaluate(lerCampos);
    const word = await page.evaluate(async () => {
      const b = document.getElementById('btnDownloadWord'); if (!b) return null;
      delete window.showSaveFilePicker;
      let txt = null; const orig = URL.createObjectURL;
      URL.createObjectURL = blob => { blob.text().then(t => { txt = t; }); return 'blob:stub'; };
      const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () {};
      b.click(); await new Promise(r => setTimeout(r, 800));
      URL.createObjectURL = orig; HTMLAnchorElement.prototype.click = click;
      return txt;
    });
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(300);
    const rascunho = await page.evaluate(() => Object.keys(localStorage).filter(k => /rascunho|draft/i.test(k)).sort().map(k => localStorage.getItem(k)));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const camposRecarregado = await page.evaluate(lerCampos);
    const laudoRecarregado = await page.evaluate(() => document.getElementById('paper').innerHTML);
    // Rascunho guarda o horário em que foi salvo: fora da comparação.
    const rascunhoSemHora = rascunho.map(t => t && t.replace(/"(savedAt|ts|salvoEm|time)":\s*\d+/g, '"$1":0'));
    saida[nome].push({ ids, laudo, campos, word, rascunho: rascunhoSemHora, camposRecarregado, laudoRecarregado, erros });
    await ctx.close();
  }
  console.log(`${nome}: ${CENARIOS} cenários`);
}
await navegador.close();
fs.writeFileSync(saidaArq, JSON.stringify(saida));
