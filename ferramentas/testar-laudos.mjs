/*
 * testar-laudos.mjs — a rede de segurança do laudo-core.js.
 *
 * Abre os sete laudos num Chromium de verdade, preenche todos os campos com
 * valores fixos, imprime, salva o rascunho e baixa o Word — e guarda o HTML do
 * #paper que saiu de cada passo. Rodado duas vezes (antes e depois de uma
 * mudança), aponta na hora qual laudo mudou de comportamento.
 *
 * É o que permite mexer no motor compartilhado sem abrir os sete laudos à mão:
 * como o `laudo-core.js` vale para todos, um erro ali quebra os sete de uma vez.
 * Foi assim que a extração do motor (2026-09-01) foi conferida — os sete
 * continuaram gerando um laudo idêntico, byte a byte, ao de antes.
 *
 * COMO USAR (precisa de Node e do Playwright instalados na máquina):
 *
 *   npx http-server . -p 8901 -s &            # servir o repositório
 *   node ferramentas/testar-laudos.mjs http://127.0.0.1:8901 antes.json
 *   # ... faça a mudança ...
 *   node ferramentas/testar-laudos.mjs http://127.0.0.1:8901 depois.json
 *   node ferramentas/testar-laudos.mjs --comparar antes.json depois.json
 *
 * Abrir os arquivos direto (file://) não funciona: o navegador bloqueia o
 * <script src="laudo-core.js"> nesse modo. Tem de ser por um servidor.
 */
import fs from 'fs';

const LAUDOS = ['morfologico-1trimestre','morfologico-2trimestre','obstetrico-1trimestre',
  'obstetrico','pelvico-infantil','rastreamento-ovulacao','transvaginal'];

// ---------- comparar dois resultados ----------
if (process.argv[2] === '--comparar') {
  const a = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const b = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  let falhas = 0;
  for (const nome of Object.keys(a)) {
    if (!b[nome]) { console.log(`✗ ${nome}: falta no segundo arquivo`); falhas++; continue; }
    for (const passo of ['inicial','preenchido'])
      if (a[nome][passo].html !== b[nome][passo].html) {
        console.log(`✗ ${nome}: o HTML do laudo mudou (${passo})`); falhas++;
      }
    for (const passo of ['imprimiu','word','rascunho','interacoes'])
      if (JSON.stringify(a[nome][passo]) !== JSON.stringify(b[nome][passo])) {
        console.log(`✗ ${nome}: mudou em "${passo}"`);
        console.log(`    antes:  ${JSON.stringify(a[nome][passo])}`);
        console.log(`    depois: ${JSON.stringify(b[nome][passo])}`);
        falhas++;
      }
    if (b[nome].erros.length) { console.log(`✗ ${nome}: erros no console — ${b[nome].erros[0]}`); falhas++; }
  }
  console.log(falhas ? `\n${falhas} diferença(s).` : '\nOs sete laudos continuam idênticos. ✓');
  process.exit(falhas ? 1 : 0);
}

const base = process.argv[2];
const destino = process.argv[3];
if (!base || !destino) {
  console.error('uso: node ferramentas/testar-laudos.mjs <url-base> <saida.json>');
  console.error('     node ferramentas/testar-laudos.mjs --comparar antes.json depois.json');
  process.exit(2);
}

// O Playwright pode estar instalado no projeto ou global (npm i -g playwright).
// O import de ESM não olha o NODE_PATH, então tentamos os caminhos na mão.
async function carregarPlaywright(){
  const tentativas = ['playwright', 'playwright-core'];
  if (process.env.PLAYWRIGHT_PATH) tentativas.unshift(process.env.PLAYWRIGHT_PATH);
  for (const raiz of ['/usr/lib/node_modules', '/usr/local/lib/node_modules', '/opt/node22/lib/node_modules'])
    tentativas.push(`${raiz}/playwright/index.mjs`);
  for (const t of tentativas) {
    try { return await import(t); } catch(e) { /* tenta o próximo */ }
  }
  console.error('Playwright não encontrado. Instale com:  npm i -g playwright');
  console.error('ou aponte o caminho:  PLAYWRIGHT_PATH=/caminho/para/playwright/index.mjs node ...');
  process.exit(3);
}
const { chromium } = await carregarPlaywright();

// Preenchimento fixo: o mesmo campo recebe sempre o mesmo valor, senão a
// comparação entre duas execuções acusaria diferença onde não houve mudança.
const preencher = () => {
  const col = document.getElementById('formCol') || document.body;
  col.querySelectorAll('select').forEach((el,i) => {
    if (el.disabled || !el.options.length) return;
    el.selectedIndex = Math.min(i % el.options.length, el.options.length-1);
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  col.querySelectorAll('input[type=checkbox]').forEach((el,i) => {
    if (el.disabled || i % 2) return;
    el.checked = !el.checked;
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  col.querySelectorAll('input,textarea').forEach((el,i) => {
    if (el.disabled || el.readOnly) return;
    const t = (el.type||'').toLowerCase();
    if (['checkbox','radio','email','password','file'].includes(t)) return;
    if (t === 'date') el.value = '2026-03-15';
    else if (t === 'number') el.value = String(10 + (i%9));
    else if (el.id === 'cpfPaciente') el.value = '12345678909';
    else if (el.dataset && el.dataset.decimals !== undefined) el.value = (1 + (i%9)) + ',' + (i%9);
    else el.value = 'AA' + i;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
};

const sondar = () => {
  const paper = document.getElementById('paper');
  const blks = [...paper.querySelectorAll('[data-blk]')].map(e => e.getAttribute('data-blk'));
  return { blocos: blks.length, blocosUnicos: new Set(blks).size,
           filhosDiretos: paper.querySelectorAll(':scope > [data-blk]').length,
           printPages: paper.querySelectorAll('.print-page').length,
           html: paper.innerHTML };
};

const saida = {};
const navegador = await chromium.launch();

for (const nome of LAUDOS) {
  const ctx = await navegador.newContext();
  // Nada de rede externa: fontes e o SDK do Supabase deixariam o teste lento e
  // dependente de estar online.
  await ctx.route('**://*/**', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
  await ctx.addInitScript(() => {
    const vazio = async () => ({ data:null, error:null });
    window.supabase = { createClient: () => ({
      auth: { onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
              getSession: async () => ({ data:{ session:null }, error:null }),
              signInWithPassword: vazio, signOut: vazio },
      from(){ const q = new Proxy(function(){}, { get:()=>()=>q, apply:()=>q }); return q; } }) };
  });
  const page = await ctx.newPage();
  const erros = [];
  page.on('console', m => { if (m.type()==='error' && !/net::/.test(m.text())) erros.push(m.text()); });
  page.on('pageerror', e => erros.push('PAGEERROR: ' + e.message));

  await page.goto(`${base}/${nome}.html`, { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(800);

  const inicial = await page.evaluate(sondar);
  await page.evaluate(preencher);
  await page.waitForTimeout(1500);
  const preenchido = await page.evaluate(sondar);

  // Ciclo de impressão, incluindo um render() no meio: é o caminho que já
  // duplicou o laudo uma vez (ver CLAUDE.md, "O #paper em folhas").
  const imprimiu = await page.evaluate(async (src) => {
    const sondar = eval('(' + src + ')');
    window.dispatchEvent(new Event('beforeprint'));
    const paper = document.getElementById('paper');
    const durante = { printPages: paper.querySelectorAll('.print-page').length,
                      filhosDiretos: paper.querySelectorAll(':scope > [data-blk]').length };
    document.dispatchEvent(new Event('visibilitychange'));
    const alvo = document.querySelector('#formCol input[type=text]:not([disabled])');
    if (alvo) { alvo.value = 'DURANTE'; alvo.dispatchEvent(new Event('input',{bubbles:true})); }
    await new Promise(r => setTimeout(r, 400));
    window.dispatchEvent(new Event('afterprint'));
    await new Promise(r => setTimeout(r, 900));
    const d = sondar();
    return { durante, blocos: d.blocos, blocosUnicos: d.blocosUnicos,
             printPages: d.printPages, html: d.html };
  }, sondar.toString());

  await page.waitForTimeout(1400);
  const rascunho = await page.evaluate(() => {
    const chaves = Object.keys(localStorage).filter(k => /rascunho/.test(k));
    const txt = chaves.map(k => localStorage.getItem(k) || '').join('');
    // paginado=true seria o bug de gravar o laudo já quebrado em folhas.
    return { chaves, bytes: txt.length, paginado: txt.includes('print-page') };
  });

  const word = await page.evaluate(async () => {
    try {
      delete window.showSaveFilePicker;
      const b = document.getElementById('btnDownloadWord');
      if (!b) return { achou:false };
      const orig = URL.createObjectURL; let bytes = 0;
      URL.createObjectURL = blob => { bytes = blob.size; return 'blob:stub'; };
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function(){};
      b.click();
      await new Promise(r => setTimeout(r, 800));
      URL.createObjectURL = orig; HTMLAnchorElement.prototype.click = click;
      return { achou:true, bytes };
    } catch(e) { return { achou:true, erro:String(e) }; }
  });

  // Caminhos que o preenchimento não toca: troca de executante, máscara de CPF,
  // controles de fonte/entrelinha, negrito e descarte do rascunho.
  const interacoes = await page.evaluate(async () => {
    const paper = document.getElementById('paper');
    const passos = {};
    const tentar = async (nome, fn) => {
      try { await fn(); await new Promise(r => setTimeout(r,350)); passos[nome] = paper.innerHTML.length; }
      catch(e) { passos[nome] = 'ERRO: ' + e.message; }
    };
    await tentar('executante', () => {
      const sel = [...document.querySelectorAll('select')]
        .find(s => [...s.options].some(o => /b[áa]rbara/i.test(o.value + o.textContent)));
      if (!sel) throw new Error('sem seletor de executante');
      sel.value = [...sel.options].find(o => /b[áa]rbara/i.test(o.value + o.textContent)).value;
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    });
    const trocouAssinatura = paper.innerText.includes('Bárbara');
    await tentar('cpf', () => {
      const el = document.getElementById('cpfPaciente');
      el.value = '12345678909'; el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    const cpf = (document.getElementById('cpfPaciente') || {}).value;
    await tentar('decimal', () => {
      const el = document.querySelector('input[data-decimals]');
      if (!el) throw new Error('sem campo decimal');
      el.value = '1.5';
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('blur',{bubbles:true}));
    });
    await tentar('fonte', () => {
      for (const id of ['fmtFontSize','fmtLineHeight']) {
        const sel = document.getElementById(id);
        if (!sel) throw new Error('sem ' + id);
        sel.selectedIndex = Math.min(1, sel.options.length-1);
        sel.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
    await tentar('negrito', () => {
      const alvo = paper.querySelector('p, li, h4');
      if (!alvo) throw new Error('sem parágrafo');
      const r = document.createRange(); r.selectNodeContents(alvo);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      paper.focus();
      const b = document.getElementById('fmtBold');
      if (!b) throw new Error('sem botão negrito');
      b.click();
    });
    await tentar('descartarRascunho', () => {
      const b = document.getElementById('btnDraftDiscard');
      if (!b) throw new Error('sem botão de descarte');
      b.click();
    });
    const pill = document.getElementById('pageCountPill');
    // O guard que faltava em três laudos antes do laudo-core.js: sem ele, cada
    // render() pendura um listener novo no mesmo campo.
    const guardDecimais = !!(document.querySelector('input[data-decimals]') || {}).dataset?.decimalsWired;
    return { passos, trocouAssinatura, cpf, paginas: pill ? pill.textContent : null, guardDecimais };
  });

  saida[nome] = { erros, inicial, preenchido, imprimiu, rascunho, word, interacoes };
  await ctx.close();

  const problema = erros.length || inicial.blocos !== inicial.blocosUnicos
    || imprimiu.blocos !== imprimiu.blocosUnicos || imprimiu.printPages !== 0 || rascunho.paginado;
  console.log(`${problema ? '✗' : '✓'} ${nome.padEnd(24)} `
    + `blocos=${preenchido.blocos} folhas=${imprimiu.durante.printPages} `
    + `word=${word.bytes||0}B rascunho=${rascunho.bytes}B `
    + `guard=${interacoes.guardDecimais} ${erros.length ? '— ' + erros[0] : ''}`);
}

await navegador.close();
fs.writeFileSync(destino, JSON.stringify(saida, null, 1));
console.log(`\nresultado gravado em ${destino}`);
