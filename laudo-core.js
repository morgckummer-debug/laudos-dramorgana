/*
 * laudo-core.js — o motor compartilhado dos sete laudos.
 *
 * Aqui mora tudo o que NÃO muda de um laudo para o outro: a paginação da
 * impressão, o ajuste automático de fonte e entrelinha, a barra de formatação,
 * o rascunho automático, a máscara de CPF e a validação dos campos decimais.
 * Antes de 2026-09-01 esse mesmo código estava copiado dentro de cada um dos
 * sete arquivos .html — e já tinha começado a divergir sozinho (o guard de
 * `wireDecimalInputs` existia em quatro laudos e faltava em três).
 *
 * COMO USAR, num laudo novo: carregue este arquivo antes do <script> do laudo
 *
 *     <script src="laudo-core.js"></script>
 *
 * e, na PRIMEIRA linha de dentro do IIFE do laudo, crie o motor e pegue dele o
 * que for usar:
 *
 *     const motor = criarMotorLaudo({
 *       DRAFT_KEY: 'laudo-rascunho-<nome-do-laudo>-v1',
 *       render:           () => render(),
 *       draftSnapshot:    () => draftSnapshot(),
 *       tituloExame:      () => tituloExame(),
 *       applyVRToInputs:  () => applyVRToInputs(),
 *       getVR: () => VR,  setVR: novo => { VR = novo; },
 *       wordCopy: () => WORD_COPY,
 *     });
 *     const { $, st, kvStore, EXECUTANTES, MARGINS, render... } = motor;
 *
 * Tudo o que o motor recebe em `cfg` é uma função, de propósito: assim ele pode
 * ser criado na primeira linha do laudo sem esbarrar em nenhuma const que ainda
 * não foi declarada.
 *
 * O ESTADO COMPARTILHADO VIVE EM `motor.st`. São as variáveis que o motor e o
 * laudo escrevem os dois (`st.printPaginated`, `st.draftReady`, …). No laudo
 * elas se escrevem `st.printPaginated`, nunca `printPaginated` solto — uma
 * cópia local se desgarraria da do motor sem dar erro nenhum.
 *
 * ⚠ Ao mexer aqui, lembre que a mudança vale para os SETE laudos de uma vez.
 *   É esse o ponto: um conserto, um lugar. O que é de um laudo só (o render(),
 *   as impressões diagnósticas, o WORD_COPY, a integração com a Curva de
 *   Crescimento) continua dentro do .html dele.
 */
function criarMotorLaudo(cfg){
  const DRAFT_KEY = cfg.DRAFT_KEY;

  const $ = id => document.getElementById(id);

  const kvStore = {
    async get(key){
      try{
        if(window.storage && typeof window.storage.get === 'function'){
          const r = await window.storage.get(key, false);
          return r ? r.value : null;
        }
      }catch(e){ /* fall through to localStorage */ }
      try{ return localStorage.getItem(key); }catch(e){ return null; }
    },
    async set(key, value){
      try{
        if(window.storage && typeof window.storage.set === 'function'){
          await window.storage.set(key, value, false);
          return;
        }
      }catch(e){ /* fall through to localStorage */ }
      try{ localStorage.setItem(key, value); }catch(e){ /* storage unavailable this session */ }
    },
    async remove(key){
      try{
        if(window.storage && typeof window.storage.remove === 'function'){
          await window.storage.remove(key);
          return;
        }
      }catch(e){ /* fall through to localStorage */ }
      try{ localStorage.removeItem(key); }catch(e){ /* storage unavailable this session */ }
    }
  };

  const PAGE_SAFETY_PX = 38;

  const MIN_LINE_HEIGHT = 1.0;

  const LINE_HEIGHT_STEP = 0.03;

  // Piso do ajuste automático de fonte na impressão: por padrão 11pt, mas um
  // laudo pode elevar esse piso (cfg.minFontSize) quando 11pt fica pequeno
  // demais para o conteúdo dele — o ajuste automático nunca desce abaixo
  // disso, mesmo que precise estourar para uma segunda página.
  const MIN_FONT_SIZE = cfg.minFontSize || 11;

  const FONT_SIZE_STEP = 0.5;

  const MARGINS = ['margin-top','margin-right','margin-bottom','margin-left'];

  const EXECUTANTES = {
    morgana: {nome:'Dra. Morgana Fialho Caldas Kummer', qual1:'Especialista em Ultrassonografia Geral pelo CBR.', qual2:'Pós-Graduação em Medicina Fetal pela FCMMG.', crm:'CRMMG: 45.304 - RQE: 39.156'},
    barbara: {nome:'Dra. Bárbara Rodrigues Moreira', qual1:'Especialista em Ultrassonografia Geral pelo CBR.', qual2:'', crm:'CRMMG: 66.451 - RQE: 51.530'},
    paulo: {nome:'Dr. Paulo Moreira Gontijo Junior', qual1:'', qual2:'', crm:'CRMMG: 76.670'},
    carolina: {nome:'Dra. Carolina Piedade Martins', qual1:'', qual2:'', crm:'CRMMG: 75.163'}
  };

  const DRAFT_DEBOUNCE_MS = 800;

  // Estado que o motor e o laudo compartilham. Ver o aviso do cabeçalho: no
  // laudo isto se lê e se escreve sempre por `st.`.
  const st = {
    lastBlockHtml: {},
    pagePreviewTimer: null,
    printPaginated: false,
    renderPendingAfterPrint: false,
    draftTimer: null,
    draftReady: false,
    draftRestoring: false,
    draftBaseline: null,
  };

  function dedupBlocos(root){
    // A invariante do #paper: um elemento por data-blk, sempre filho DIRETO.
    // Tudo o que renderBlocks() reconcilia sai da consulta
    // ':scope > [data-blk="id"]', que devolve um só nó — o primeiro. Qualquer
    // segundo elemento com o mesmo data-blk, ou um data-blk enfiado dentro de
    // outro bloco, fica invisível para essa consulta: vira um órfão que
    // nenhum render() move nem remove, o laudo em duplicata que a médica vê
    // na tela e na impressão, sem jeito de desfazer editando de novo.
    //
    // Isso não deveria acontecer — wireEnterLineBreaks() e wirePastePlainText()
    // fecham os dois caminhos conhecidos —, mas o estrago é grande demais e o
    // conserto é barato demais para depender só de prevenção. Aqui é a rede:
    // roda a cada render(), a cada rascunho salvo e antes de cada impressão,
    // então um laudo que já tenha duplicado (inclusive um rascunho gravado
    // torto antes deste conserto) se conserta sozinho no próximo desenho.
    if(!root) return;
    const vistos = Object.create(null);
    const involucros = [];
    Array.from(root.querySelectorAll('[data-blk]')).forEach(el=>{
      const id = el.getAttribute('data-blk');
      // Segundo elemento com o mesmo id: é a cópia órfã, e some.
      if(vistos[id]){ el.remove(); return; }
      vistos[id] = true;
      if(el.parentElement === root) return;
      // Aninhado, mas único: o bloco é bom, só está na altura errada — sobe
      // até virar filho direto, na mesma posição. Apagar aqui custaria a
      // observação que a médica escreveu à mão dentro dele (o Word e o
      // rascunho saem deste mesmo caminho, e nesses dois nada é redesenhado
      // depois para repor o que se perdesse).
      let topo = el;
      while(topo.parentElement && topo.parentElement !== root) topo = topo.parentElement;
      if(topo.parentElement !== root) return;
      involucros.push(topo);
      root.insertBefore(el, topo);
    });
    // O invólucro que ficou sem nada dentro era só andaime do navegador.
    involucros.forEach(el=>{
      if(el.parentElement === root && !el.querySelector('[data-blk]') && !el.textContent.trim()) el.remove();
    });
  }
  function unwrapPrintPages(root){
    if(!root) return false;
    if(!root.querySelector(':scope > .print-page')){ dedupBlocos(root); return false; }
    Array.from(root.children).forEach(page=>{
      if(!page.classList || !page.classList.contains('print-page')) return;
      while(page.firstChild) root.insertBefore(page.firstChild, page);
      page.remove();
    });
    // Do que sobra, só fica o que renderBlocks() sabe reconciliar: um bloco por
    // data-blk, o primeiro de cada. O resto é andaime da impressão — o
    // "Continua…", o espaçador que empurra a assinatura para o pé da folha, a
    // cópia do cabeçalho de identificação no topo de cada folha e o
    // <ul class="impressao"> remontado (a lista pode ser cortada ao meio, e
    // cada pedaço volta sem o data-blk do bloco original).
    const vistos = {};
    Array.from(root.children).forEach(el=>{
      const id = el.getAttribute ? el.getAttribute('data-blk') : null;
      if(!id || vistos[id]) el.remove(); else vistos[id] = true;
    });
    dedupBlocos(root);
    return true;
  }
  function renderBlocks(blocks){
    const paperEl = $('paper');
    // Rede de segurança: se por qualquer caminho o laudo chegar aqui ainda
    // paginado, desfaz antes de reconciliar — a consulta ':scope > [data-blk]'
    // abaixo não enxerga bloco nenhum dentro de uma .print-page e duplicaria o
    // laudo inteiro.
    unwrapPrintPages(paperEl);
    let prevNode = null;
    const keepIds = new Set();
    blocks.forEach(b=>{
      keepIds.add(b.id);
      let node = paperEl.querySelector(':scope > [data-blk="'+b.id+'"]');
      if(!node || st.lastBlockHtml[b.id] !== b.html){
        const tmp = document.createElement('div');
        tmp.innerHTML = b.html;
        const fresh = tmp.firstElementChild;
        fresh.setAttribute('data-blk', b.id);
        if(node) node.replaceWith(fresh);
        node = fresh;
        st.lastBlockHtml[b.id] = b.html;
      }
      const wantedNext = prevNode ? prevNode.nextSibling : paperEl.firstChild;
      if(wantedNext !== node) paperEl.insertBefore(node, wantedNext);
      prevNode = node;
    });
    Array.from(paperEl.querySelectorAll(':scope > [data-blk]')).forEach(el=>{
      const id = el.getAttribute('data-blk');
      if(!keepIds.has(id)){ el.remove(); delete st.lastBlockHtml[id]; }
    });
  }
  function restoreMissingBlocks(paperEl){
    // Rede de segurança irmã do dedupBlocos(): aquele conserta bloco duplicado,
    // esta conserta bloco que sumiu. #paper é uma única área contenteditable —
    // uma seleção que se estende mais do que a médica pretendia (arrastar o
    // mouse, um clique duplo que pega o parágrafo errado) e um Backspace, ou
    // digitar por cima dela, apaga de uma vez todo mundo que estava no meio,
    // blocos inteiros inclusive, mesmo os que ficam ANTES de onde ela estava
    // mexendo. Diferente do Enter e do colar, isso não tem como interceptar
    // sem quebrar a edição normal — mas dá para consertar depois: texto
    // digitado direto no #paper não passa por render() (só o rascunho ouve o
    // 'input'), então nada reconciliaria isso até a médica mexer em outro
    // campo do formulário, e ela pode nunca mexer, indo direto para a
    // impressão com o laudo faltando pedaço.
    //
    // Roda a cada 'input' dentro do #paper: qualquer data-blk que existia no
    // último render() e não é mais filho direto do #paper volta, com o mesmo
    // HTML gerado da última vez — a mesma fonte que o rascunho (`st.
    // lastBlockHtml`) já usa para saber o que é texto gerado.
    if(!paperEl || st.printPaginated || st.draftRestoring) return;
    let prevNode = null;
    Object.keys(st.lastBlockHtml).forEach(id=>{
      let node = paperEl.querySelector(':scope > [data-blk="'+id+'"]');
      if(!node){
        const tmp = document.createElement('div');
        tmp.innerHTML = st.lastBlockHtml[id];
        const fresh = tmp.firstElementChild;
        if(fresh){
          fresh.setAttribute('data-blk', id);
          const wantedNext = prevNode ? prevNode.nextSibling : paperEl.firstChild;
          paperEl.insertBefore(fresh, wantedNext);
          node = fresh;
        }
      }
      if(node) prevNode = node;
    });
  }
  function showFormatWarning(el, show, message){
    let msg = el.parentElement.querySelector('.format-warning');
    if(show){
      el.classList.add('format-error');
      if(!msg){
        msg = document.createElement('span');
        msg.className = 'format-warning';
        el.insertAdjacentElement('afterend', msg);
      }
      msg.textContent = message;
    } else {
      el.classList.remove('format-error');
      if(msg) msg.remove();
    }
  }
  function sanitizeChars(el){
    const cleaned = el.value.replace(/[^0-9,.]/g, '');
    if(cleaned !== el.value) el.value = cleaned;
  }
  function decimalFormatOk(el){
    const maxDecimals = parseInt(el.dataset.decimals || '0', 10);
    const maxInt = parseInt(el.dataset.maxint || '0', 10);
    const normalized = el.value.replace(/\./g, ',');
    if(normalized === '') return true;
    const intPart = maxInt > 0 ? ('\\d{1,'+maxInt+'}') : '\\d+';
    return maxDecimals <= 0
      ? new RegExp('^'+intPart+'$').test(normalized)
      : new RegExp('^'+intPart+'(,\\d{1,'+maxDecimals+'})?$').test(normalized);
  }
  function isValidDecimal(el){
    if(!decimalFormatOk(el)) return false;
    const normalized = el.value.replace(/\./g, ',');
    if(normalized === '' || el.dataset.max === undefined) return true;
    const num = parseFloat(normalized.replace(',', '.'));
    return isNaN(num) || num <= parseFloat(el.dataset.max);
  }
  function checkDecimalFormat(el){
    sanitizeChars(el);
    const maxDecimals = parseInt(el.dataset.decimals || '0', 10);
    const maxInt = parseInt(el.dataset.maxint || '0', 10);
    let message = maxDecimals <= 0
      ? 'Revise o número — apenas dígitos, sem vírgula.'
      : (maxInt > 0
        ? 'Revise o número — até '+maxInt+' algarismo'+(maxInt>1?'s':'')+' antes da vírgula e '+maxDecimals+' depois (ex: '+('9'.repeat(maxInt))+',0).'
        : 'Revise o número — precisa de um algarismo antes da vírgula (ex: 1,2).');
    if(decimalFormatOk(el) && el.dataset.max !== undefined){
      message = 'Revise o número — valor máximo aceito: '+el.dataset.max.replace('.',',')+'.';
    }
    showFormatWarning(el, !isValidDecimal(el), message);
  }
  function toggle(id, show){ const el=$(id); if(!el) return; el.classList.toggle('show', show); }
  function v(id){ const el = $(id); return el ? el.value.trim() : ''; }
  function num(id){ const x = parseFloat(v(id).replace(',', '.')); return isNaN(x) ? null : x; }
  function vNoDot(id){ return v(id).replace(/\.+\s*$/, ''); }
  function aplicarMascaraCPF(){
    const el = $('cpfPaciente');
    if(!el) return;
    const digits = el.value.replace(/\D/g, '').slice(0, 11);
    let out = digits.slice(0,3);
    if(digits.length > 3) out += '.'+digits.slice(3,6);
    if(digits.length > 6) out += '.'+digits.slice(6,9);
    if(digits.length > 9) out += '-'+digits.slice(9);
    if(out === el.value) return;
    el.value = out;
    try{ el.setSelectionRange(out.length, out.length); }catch(e){ /* not focused/selectable */ }
  }
  function blankOrValue(val, suffix){
    if(val === '' || val === null || val === undefined) return {text:'____', filled:false};
    return {text: val + (suffix||''), filled:true};
  }
  function span(obj){
    return '<span class="'+(obj.filled?'filled':'blank')+'">'+escapeHtml(obj.text)+'</span>';
  }
  function escapeHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function pageBudgetPx(){
    const ref = document.createElement('div');
    ref.style.cssText = 'position:absolute;visibility:hidden;left:-99999px;top:0;width:0;height:24.2cm;';
    document.body.appendChild(ref);
    const pageHeightPx = ref.getBoundingClientRect().height;
    document.body.removeChild(ref);
    return pageHeightPx - PAGE_SAFETY_PX;
  }
  function autoFitPages(paperEl, budgetPx){
    const html = paperEl.innerHTML;
    const baseLineHeight = parseFloat(paperEl.style.lineHeight) || 1.15;
    const baseFontSize = parseFloat(paperEl.style.fontSize) || 12;

    function fitAtFontSize(fontSize){
      for(let lh = baseLineHeight; lh >= MIN_LINE_HEIGHT - 1e-9; lh -= LINE_HEIGHT_STEP){
        const attempt = packAt(paperEl, html, lh, fontSize + 'pt', budgetPx);
        if(attempt.pages.length === 1) return {packed: attempt, lineHeight: lh, fontSize};
      }
      return null;
    }

    let fit = fitAtFontSize(baseFontSize);
    for(let fs = baseFontSize - FONT_SIZE_STEP; !fit && fs >= MIN_FONT_SIZE - 1e-9; fs -= FONT_SIZE_STEP){
      fit = fitAtFontSize(fs);
    }
    if(fit) return fit;
    return {
      packed: packAt(paperEl, html, baseLineHeight, baseFontSize + 'pt', budgetPx),
      lineHeight: baseLineHeight,
      fontSize: baseFontSize
    };
  }
  function schedulePagePreview(){
    clearTimeout(st.pagePreviewTimer);
    st.pagePreviewTimer = setTimeout(updatePagePreview, 250);
  }
  function sanitizeFilenamePart(s){
    return s.replace(/[\\/:*?"<>|]/g, '').trim();
  }
  function nomeArquivoLaudo(){
    const paciente = sanitizeFilenamePart(v('nomePaciente'));
    return paciente ? paciente + ' - ' + cfg.tituloExame() : 'Laudo - ' + cfg.tituloExame();
  }
  function setDefaultDataExame(){
    const el = $('dataExame');
    if(!el || el.value) return;
    const pad = n => String(n).padStart(2, '0');
    const d = new Date();
    el.value = pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear();
  }
  function draftHora(ts){
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    const hora = pad(d.getHours())+':'+pad(d.getMinutes());
    return d.toDateString() === new Date().toDateString()
      ? 'hoje às '+hora
      : 'em '+pad(d.getDate())+'.'+pad(d.getMonth()+1)+' às '+hora;
  }
  function setDraftPill(text, warn){
    const pill = $('draftPill');
    if(!pill) return;
    if(!text){ pill.style.display = 'none'; return; }
    pill.textContent = text;
    pill.classList.toggle('pending', !!warn);
    pill.style.display = 'inline-block';
  }
  function draftSchedule(){
    if(!st.draftReady || st.draftRestoring) return;
    clearTimeout(st.draftTimer);
    st.draftTimer = setTimeout(draftSaveNow, DRAFT_DEBOUNCE_MS);
  }
  function draftDiscard(){
    clearTimeout(st.draftTimer);
    st.draftTimer = null;
    try{ localStorage.removeItem(DRAFT_KEY); }catch(e){}
    const note = $('draftNote');
    if(note) note.classList.remove('show');
    setDraftPill(null);
    st.draftBaseline = st.draftReady ? draftFingerprint(cfg.draftSnapshot()) : null;
  }
  function draftRead(){
    try{
      const raw = localStorage.getItem(DRAFT_KEY);
      const d = raw ? JSON.parse(raw) : null;
      return (d && d.v === 1 && d.fields) ? d : null;
    }catch(e){ return null; }
  }
  function packAt(paperEl, html, lineHeight, fontSize, budgetPx){
    const measure = document.createElement('div');
    measure.className = 'paper';
    measure.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:-99999px;top:0;width:17cm;max-height:none;overflow:visible;background:none;border:none;box-shadow:none;padding:0;margin:0;';
    measure.style.lineHeight = lineHeight;
    measure.style.fontSize = fontSize;
    measure.innerHTML = html;
    document.body.appendChild(measure);

    const continuaP = document.createElement('p');
    continuaP.className = 'continua';
    continuaP.textContent = 'Continua…';
    measure.appendChild(continuaP);
    const continuaHeight = continuaP.getBoundingClientRect().height;
    measure.removeChild(continuaP);
    const continuaHtml = continuaP.outerHTML;

    const measureRect = measure.getBoundingClientRect();
    const realTop = Array.from(paperEl.children);
    const measureTop = Array.from(measure.children);
    const boxes = [];
    // Cabeçalho de identificação: se o laudo tiver mais de uma página, cada
    // página a partir da 2ª leva uma cópia do id-card no topo — senão, uma
    // folha solta no meio da impressão fica sem como identificar a paciente.
    // Altura e margem são lidas aqui, do próprio "measure" (com o lineHeight/
    // fontSize candidatos desta chamada já aplicados) — não do #paper vivo,
    // que pode ainda estar no tamanho base e dar uma margem em em errada.
    let idCardHtml = '';
    let idCardRepeatHeight = 0;
    realTop.forEach((realChild, idx)=>{
      const measureChild = measureTop[idx];
      if(!measureChild) return;
      // Blocos marcados com data-split="rows" (a morfologia fetal) quebram
      // entre as linhas da tabela: são altos demais para pular inteiros para a
      // folha seguinte, e a médica precisa poder empurrar só o final deles.
      // Cada <tr> vira um box; o parágrafo do título vira um 'heading', que a
      // regra logo abaixo nunca deixa sozinho no pé da página.
      if(realChild.getAttribute && realChild.getAttribute('data-split')==='rows'){
        const realParts = Array.from(realChild.children);
        const measureParts = Array.from(measureChild.children);
        realParts.forEach((realPart, j)=>{
          const measurePart = measureParts[j];
          if(!measurePart) return;
          if(realPart.tagName === 'TABLE'){
            const estilo = realPart.getAttribute('style');
            const abre = '<table class="'+realPart.className+'"'+(estilo ? ' style="'+estilo+'"' : '')+'>';
            const realRows = Array.from(realPart.querySelectorAll('tr'));
            const measureRows = Array.from(measurePart.querySelectorAll('tr'));
            realRows.forEach((tr, k)=>{
              if(!measureRows[k]) return;
              const r = measureRows[k].getBoundingClientRect();
              boxes.push({top:r.top-measureRect.top, bottom:r.bottom-measureRect.top, kind:'trow', html: tr.outerHTML, tableOpen: abre, node: tr});
            });
          }else{
            const r = measurePart.getBoundingClientRect();
            boxes.push({top:r.top-measureRect.top, bottom:r.bottom-measureRect.top, kind:'heading', html: realPart.outerHTML, node: realPart});
          }
        });
      } else if(realChild.tagName==='UL' && realChild.classList.contains('impressao')){
        const realLis = Array.from(realChild.children);
        const measureLis = Array.from(measureChild.children);
        realLis.forEach((li, i)=>{
          if(!measureLis[i]) return;
          const r = measureLis[i].getBoundingClientRect();
          boxes.push({top:r.top-measureRect.top, bottom:r.bottom-measureRect.top, kind:'li', html: li.outerHTML, node: li});
        });
      } else {
        const r = measureChild.getBoundingClientRect();
        boxes.push({top:r.top-measureRect.top, bottom:r.bottom-measureRect.top, kind:(realChild.tagName==='H4' ? 'heading' : 'block'), html: realChild.outerHTML, node: realChild});
        if(realChild.classList && realChild.classList.contains('id-card')){
          idCardHtml = realChild.outerHTML;
          const marginBottom = parseFloat(getComputedStyle(measureChild).marginBottom) || 0;
          idCardRepeatHeight = (r.bottom - r.top) + marginBottom;
        }
      }
    });
    document.body.removeChild(measure);

    const pages = [[]];
    let pageStart = boxes.length ? boxes[0].top : 0;
    boxes.forEach(box=>{
      const budgetHere = pages.length > 1 ? (budgetPx - idCardRepeatHeight - continuaHeight) : budgetPx;
      if((box.bottom - pageStart) > budgetHere && pages[pages.length-1].length > 0){
        pages.push([]);
        pageStart = box.top;
      }
      pages[pages.length-1].push(box);
    });
    for(let p=0; p<pages.length-1; p++){
      const pg = pages[p];
      if(pg.length && pg[pg.length-1].kind==='heading'){
        pages[p+1].unshift(pg.pop());
      }
    }
    return {pages, continuaHtml, continuaHeight, idCardHtml, idCardRepeatHeight};
  }
  function paginateForPrint(){
    const paperEl = $('paper');
    paperEl.querySelectorAll('.pg-break-marker').forEach(el=>el.remove());
    // Um 'afterprint' que não chegou a disparar deixaria o laudo em folhas:
    // paginar por cima disso guardaria a remontagem como "original".
    unwrapPrintPages(paperEl);
    const originalHTML = paperEl.innerHTML;
    const originalLineHeight = paperEl.style.lineHeight;
    const originalFontSize = paperEl.style.fontSize;

    const packBudgetPx = pageBudgetPx();

    const baseLineHeight = parseFloat(paperEl.style.lineHeight) || 1.15;
    const baseFontSize = parseFloat(paperEl.style.fontSize) || 12;
    const fit = autoFitPages(paperEl, packBudgetPx);
    const packed = fit.packed;
    const usedLineHeight = fit.lineHeight;
    const usedFontSize = fit.fontSize;
    if(usedLineHeight !== baseLineHeight) paperEl.style.lineHeight = usedLineHeight;
    if(usedFontSize !== baseFontSize) paperEl.style.fontSize = usedFontSize + 'pt';

    const {pages, continuaHtml, continuaHeight, idCardHtml, idCardRepeatHeight} = packed;

    const wrap = document.createElement('div');
    pages.forEach((pageBoxes, pageIdx)=>{
      const isLast = pageIdx === pages.length - 1;
      const pinned = isLast ? pageBoxes[pageBoxes.length - 1] : null;
      const contentBoxes = isLast ? pageBoxes.slice(0, -1) : pageBoxes;

      const pageEl = document.createElement('div');
      pageEl.className = 'print-page';
      if(pageIdx > 0 && idCardHtml) pageEl.insertAdjacentHTML('beforeend', idCardHtml);
      let i = 0;
      while(i < contentBoxes.length){
        if(contentBoxes[i].kind === 'li'){
          const ul = document.createElement('ul');
          ul.className = 'impressao';
          while(i < contentBoxes.length && contentBoxes[i].kind === 'li'){ ul.insertAdjacentHTML('beforeend', contentBoxes[i].html); i++; }
          pageEl.appendChild(ul);
        } else if(contentBoxes[i].kind === 'trow'){
          // As linhas que couberam nesta folha voltam para dentro de uma tabela
          // igual à original (mesma classe e mesma largura); o resto monta
          // outra, na folha seguinte.
          const abre = contentBoxes[i].tableOpen;
          let linhas = '';
          while(i < contentBoxes.length && contentBoxes[i].kind === 'trow' && contentBoxes[i].tableOpen === abre){
            linhas += contentBoxes[i].html; i++;
          }
          pageEl.insertAdjacentHTML('beforeend', abre + linhas + '</table>');
        } else {
          pageEl.insertAdjacentHTML('beforeend', contentBoxes[i].html);
          i++;
        }
      }
      const contentHeight = contentBoxes.length ? (contentBoxes[contentBoxes.length-1].bottom - contentBoxes[0].top) : 0;

      const pinnedHtml = isLast ? (pinned ? pinned.html : '') : continuaHtml;
      const pinnedHeight = isLast ? (pinned ? (pinned.bottom - pinned.top) : 0) : continuaHeight;
      if(pinnedHtml){
        const idCardExtra = pageIdx > 0 ? idCardRepeatHeight : 0;
        const spacerPx = Math.max(0, packBudgetPx - idCardExtra - contentHeight - pinnedHeight);
        const spacer = document.createElement('div');
        spacer.style.height = spacerPx + 'px';
        pageEl.appendChild(spacer);
        pageEl.insertAdjacentHTML('beforeend', pinnedHtml);
      }
      wrap.appendChild(pageEl);
    });
    st.printPaginated = true;
    paperEl.innerHTML = wrap.innerHTML;

    return function restore(){
      paperEl.innerHTML = originalHTML;
      paperEl.style.lineHeight = originalLineHeight;
      paperEl.style.fontSize = originalFontSize;
      st.printPaginated = false;
      if(st.renderPendingAfterPrint){ st.renderPendingAfterPrint = false; cfg.render(); }
      updatePagePreview();
    };
  }
  function updatePagePreview(){
    // O debounce de 250 ms pode vencer com a impressão já em curso: aí o #paper
    // está em folhas e a contagem sairia sobre a remontagem, não sobre o laudo.
    if(st.printPaginated) return;
    const paperEl = $('paper');
    paperEl.querySelectorAll('.pg-break-marker').forEach(el=>el.remove());

    const pill = $('pageCountPill');
    if(!paperEl.children.length){ if(pill){ pill.textContent='1 página'; pill.classList.remove('pending'); } return; }

    const pages = autoFitPages(paperEl, pageBudgetPx()).packed.pages;

    if(pill){
      pill.textContent = pages.length===1 ? '1 página' : pages.length+' páginas';
      pill.classList.toggle('pending', pages.length > 1);
    }
    for(let p=0; p<pages.length-1; p++){
      const node = pages[p+1][0] && pages[p+1][0].node;
      if(!node || !node.parentNode) continue;
      // A quebra pode cair no meio da lista de impressões ou da tabela de
      // morfologia: ali o marcador precisa ser um <li> ou um <tr>, senão vira
      // um filho inválido do <ul>/<table> e o navegador o joga para fora.
      const texto = 'Fim da página ' + (p+1);
      let marker;
      if(node.tagName === 'TR'){
        marker = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 2;
        cell.className = 'pg-break-marker';
        cell.textContent = texto;
        marker.appendChild(cell);
      }else{
        marker = document.createElement(node.tagName === 'LI' ? 'li' : 'div');
        marker.textContent = texto;
      }
      marker.className = 'pg-break-marker';
      marker.contentEditable = 'false';
      node.parentNode.insertBefore(marker, node);
    }
  }
  function copyComputedToClone(liveRoot, cloneRoot){
    cfg.wordCopy().forEach(function(rule){
      const sel = rule[0], props = rule[1];
      const live = liveRoot.querySelectorAll(sel);
      const copy = cloneRoot.querySelectorAll(sel);
      // O clone é cópia fiel do vivo, então as duas listas casam elemento a
      // elemento. Se algum dia não casarem, é melhor não estilizar nada do que
      // pintar o estilo de um parágrafo em cima de outro.
      if(live.length !== copy.length) return;
      for(let i=0;i<live.length;i++){
        const cs = getComputedStyle(live[i]);
        props.forEach(function(p){
          const val = cs.getPropertyValue(p);
          if(val) copy[i].style.setProperty(p, val);
        });
      }
    });
  }
  function wirePastePlainText(paperEl){
    // Colar dentro do #paper com o HTML original do clipboard é o mesmo risco
    // que o Enter no meio do título (ver o comentário no laudo, perto do
    // keydown): se o texto colado veio de dentro do próprio #paper — a médica
    // seleciona um trecho do laudo já escrito para usar de base numa observação
    // nova —, o HTML copiado carrega o atributo data-blk junto. O navegador não
    // cola isso como filho direto do #paper (que teria pelo menos a chance de
    // ser limpo por renderBlocks()): ele insere no ponto do cursor, quase
    // sempre dentro do último bloco existente. O resultado é um data-blk
    // duplicado *dentro* de outro bloco, invisível para a consulta
    // ':scope > [data-blk]' de renderBlocks() — e por isso nunca mais some,
    // sobrevivendo a cada render() como se o laudo tivesse duplicado sozinho.
    // Colar sempre como texto puro fecha esse caminho de uma vez, venha o
    // texto de dentro do próprio laudo ou de fora (Word, e-mail, WhatsApp).
    if(paperEl.dataset.pastePlainWired) return;
    paperEl.dataset.pastePlainWired = '1';
    paperEl.addEventListener('paste', e=>{
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, texto);
    });
  }
  function wireEnterLineBreaks(paperEl, getIdCardGapSel){
    // Por padrão, Enter dentro de um contenteditable divide em dois o
    // elemento de bloco mais próximo do cursor. Quando esse elemento é o
    // próprio portador do data-blk — um <p>/<h3>/<h4> sem filhos de bloco,
    // caso do <h3 class="doctitle">, de "Ao exame:" e de qualquer <p
    // class="linha">/<h4 class="sec"> que seja o bloco inteiro — as duas
    // metades da divisão herdam o MESMO data-blk. renderBlocks() só enxerga
    // o primeiro de cada id (a consulta ':scope > [data-blk="id"]' pega um
    // só) e nunca mais toca no segundo: ele fica um órfão que nenhuma
    // reconciliação move nem remove, empurrando o resto do laudo — inclusive
    // a assinatura — para lugar nenhum a cada novo render() ou impressão, e
    // sem jeito de voltar ao estado anterior editando de novo. Foi assim que
    // a divisão do <h3 class="doctitle"> foi flagrada originalmente; a mesma
    // divisão vale para qualquer outro bloco de parágrafo único, então a
    // proteção aqui é para o #paper inteiro, não só para o título.
    //
    // A primeira versão desta proteção (2026-09-02, de manhã) tentava adivinhar
    // o alvo da divisão: se o bloco tivesse filhos de bloco, o Enter partiria
    // um dos filhos e o data-blk ficaria intacto. Não é verdade. O navegador
    // não divide o elemento mais próximo do cursor: divide o bloco que ele
    // considera "o parágrafo" ali, e no fim de uma cadeia aninhada isso sobe
    // vários níveis de uma vez. Dois contraexemplos, os dois com filhos de
    // bloco e os dois duplicando mesmo assim:
    //
    //   - Líquido amniótico do obstétrico: <div> com <p> e <table> dentro. A
    //     médica clica no fim do bloco e digita a observação extra; o texto
    //     entra solto, irmão da <table>, e o Enter parte a <div> com data-blk.
    //     Foi o laudo em duplicata que ela mandou em 2026-09-02.
    //   - Risco fetal do morfológico de 1º trimestre: <div data-blk> com um
    //     <div class="risk-card"> dentro. Mesmo com o cursor DENTRO do
    //     risk-card, o Enter no fim dele parte a <div> de fora, a com data-blk.
    //
    // Então a regra deixou de adivinhar. O Enter só corre solto onde a divisão
    // é presa por construção — dentro de um <li> (parte o item, nunca o <ul>
    // em volta, e é assim que se acrescenta uma linha à impressão diagnóstica)
    // e dentro de uma célula de tabela (a divisão fica dentro da célula). Em
    // todo o resto do #paper ele vira quebra de linha, que é o que a médica
    // quer quando digita uma observação a mais: linha nova, não bloco novo.
    if(paperEl.dataset.enterLineBreaksWired) return;
    paperEl.dataset.enterLineBreaksWired = '1';

    function cursorNoInicioDoTitulo(range){
      const titleEl = paperEl.querySelector('h3.doctitle');
      if(!titleEl || !range.collapsed || !titleEl.contains(range.startContainer)) return null;
      const antes = document.createRange();
      antes.selectNodeContents(titleEl);
      antes.setEnd(range.startContainer, range.startOffset);
      return antes.toString().length === 0 ? titleEl : null;
    }
    function passoEspacoTitulo(direcao){
      const idCardGapSel = getIdCardGapSel();
      if(!idCardGapSel) return;
      const i = idCardGapSel.selectedIndex + direcao;
      if(i < 0 || i >= idCardGapSel.options.length) return;
      idCardGapSel.selectedIndex = i;
      idCardGapSel.dispatchEvent(new Event('change'));
    }
    const ITEM_OU_CELULA = /^(LI|TD|TH)$/;
    function enterDivideOProprioBlk(blk, anchorEl){
      for(let el = anchorEl; el && el !== blk; el = el.parentElement){
        if(ITEM_OU_CELULA.test(el.tagName)) return false;
      }
      return true;
    }
    paperEl.addEventListener('keydown', e=>{
      if(e.key !== 'Enter' && e.key !== 'Backspace') return;
      const sel = window.getSelection();
      if(!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);

      if(cursorNoInicioDoTitulo(range)){
        e.preventDefault();
        passoEspacoTitulo(e.key === 'Enter' ? 1 : -1);
        return;
      }
      if(e.key !== 'Enter') return;

      const anchorNode = sel.anchorNode;
      const anchorEl = anchorNode ? (anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentElement) : null;
      const blk = anchorEl ? anchorEl.closest('[data-blk]') : null;
      if(blk && enterDivideOProprioBlk(blk, anchorEl)){
        e.preventDefault();
        document.execCommand('insertLineBreak');
      }
    });
  }
  function wireDecimalInputs(){
    document.querySelectorAll('input[data-decimals]').forEach(el=>{
      if(el.dataset.decimalsWired) return;
      el.dataset.decimalsWired = '1';
      el.addEventListener('input', ()=>{
        sanitizeChars(el);
        if(isValidDecimal(el)) showFormatWarning(el, false);
      });
      el.addEventListener('blur', ()=> checkDecimalFormat(el));
    });
  }
  function draftPaperHtml(){
    // Os marcadores de fim de página são recalculados a cada render(); sem
    // tirá-los daqui, voltariam duplicados junto com o rascunho.
    const clone = $('paper').cloneNode(true);
    clone.querySelectorAll('.pg-break-marker').forEach(el=>el.remove());
    // O autosave pode cair com a impressão em curso (o 'visibilitychange' da
    // janela de impressão chama draftSaveNow() na hora): o rascunho guarda
    // sempre o laudo desmontado, nunca as folhas de impressão.
    unwrapPrintPages(clone);
    return clone.innerHTML;
  }
  function draftSaveNow(){
    if(!st.draftReady || st.draftRestoring) return;
    clearTimeout(st.draftTimer);
    st.draftTimer = null;
    try{
      const snap = cfg.draftSnapshot();
      if(st.draftBaseline && draftFingerprint(snap) === st.draftBaseline){
        localStorage.removeItem(DRAFT_KEY);
        setDraftPill(null);
        return;
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(snap));
      st.draftBaseline = null;  // já tem laudo digitado: nada aqui é mais "em branco"
      setDraftPill('✓ Rascunho salvo '+draftHora(snap.ts));
    }catch(e){
      // Espaço esgotado, aba anônima ou armazenamento bloqueado: melhor avisar
      // do que deixar a médica achar que está protegida.
      setDraftPill('⚠ Não consegui salvar o rascunho neste navegador', true);
    }
  }
  function applyExecutante(id){
    const d = EXECUTANTES[id];
    if(!d) return;
    cfg.setVR(Object.assign({}, cfg.getVR(), {medicoNome:d.nome, medicoQual1:d.qual1, medicoQual2:d.qual2, medicoCRM:d.crm}));
    cfg.applyVRToInputs();
    cfg.render();
  }
  function draftFingerprint(s){
    // Superconjunto das chaves que os laudos usam: as que este laudo não tem
    // entram como null, e a impressão digital só precisa ser estável entre
    // duas chamadas do mesmo laudo. `s.anexoFmf` só existe no morfológico de
    // 1º trimestre (página de imagem colada do cálculo de risco); `s.noduloUids`
    // só existe na tireoide (lista de nódulos); nos laudos que não têm cada uma
    // dessas chaves elas são sempre undefined dos dois lados da comparação,
    // então não mudam nada para eles.
    return JSON.stringify([s.fields, s.uids, s.miomaUids, s.noduloUids, s.checked, s.overrides, s.paper, s.anexoFmf]);
  }

  // Rede de segurança: se o 'afterprint' do navegador não disparar depois de
  // abrir a impressão (acontece — algumas combinações de navegador, SO e
  // driver de impressora não avisam ao fechar o diálogo), o #paper fica preso
  // em folhas para sempre: `st.printPaginated` nunca volta a `false`, e
  // render() passa a sair sem fazer nada em toda chamada seguinte. A médica
  // marca uma caixa a mais na Impressão diagnóstica — a caixa em si marca
  // normalmente, é um <input> nativo —, mas o laudo na tela (e o que sairia
  // impresso ou no Word) nunca mais acompanha, em silêncio. Ao voltar o foco
  // pra aba — fechar o diálogo de impressão é o jeito mais comum disso
  // acontecer — se ainda estiver preso, desfaz a paginação e redesenha. Se o
  // 'afterprint' tiver disparado normalmente, st.printPaginated já está
  // false e isso não faz nada.
  function recoverFromStuckPrint(){
    if(!st.printPaginated) return;
    unwrapPrintPages($('paper'));
    st.printPaginated = false;
    st.renderPendingAfterPrint = false;
    cfg.render();
  }
  window.addEventListener('focus', recoverFromStuckPrint);
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) recoverFromStuckPrint(); });

  // Só existe #paper nos laudos que usam data-blk/renderBlocks(); nos outros
  // (medicina interna) st.lastBlockHtml nunca sai de {} e isto não faz nada.
  const paperEl0 = $('paper');
  if(paperEl0) paperEl0.addEventListener('input', ()=> restoreMissingBlocks($('paper')));

  return {
    $: $, kvStore: kvStore, st: st, DRAFT_KEY: DRAFT_KEY,
    EXECUTANTES: EXECUTANTES, MARGINS: MARGINS, DRAFT_DEBOUNCE_MS: DRAFT_DEBOUNCE_MS,
    PAGE_SAFETY_PX: PAGE_SAFETY_PX, MIN_LINE_HEIGHT: MIN_LINE_HEIGHT,
    LINE_HEIGHT_STEP: LINE_HEIGHT_STEP, MIN_FONT_SIZE: MIN_FONT_SIZE, FONT_SIZE_STEP: FONT_SIZE_STEP,
    aplicarMascaraCPF: aplicarMascaraCPF,
    applyExecutante: applyExecutante,
    autoFitPages: autoFitPages,
    blankOrValue: blankOrValue,
    checkDecimalFormat: checkDecimalFormat,
    copyComputedToClone: copyComputedToClone,
    decimalFormatOk: decimalFormatOk,
    draftDiscard: draftDiscard,
    draftFingerprint: draftFingerprint,
    draftHora: draftHora,
    draftPaperHtml: draftPaperHtml,
    draftRead: draftRead,
    draftSaveNow: draftSaveNow,
    draftSchedule: draftSchedule,
    escapeHtml: escapeHtml,
    isValidDecimal: isValidDecimal,
    nomeArquivoLaudo: nomeArquivoLaudo,
    num: num,
    packAt: packAt,
    pageBudgetPx: pageBudgetPx,
    paginateForPrint: paginateForPrint,
    renderBlocks: renderBlocks,
    sanitizeChars: sanitizeChars,
    sanitizeFilenamePart: sanitizeFilenamePart,
    schedulePagePreview: schedulePagePreview,
    setDefaultDataExame: setDefaultDataExame,
    setDraftPill: setDraftPill,
    showFormatWarning: showFormatWarning,
    span: span,
    toggle: toggle,
    unwrapPrintPages: unwrapPrintPages,
    dedupBlocos: dedupBlocos,
    restoreMissingBlocks: restoreMissingBlocks,
    updatePagePreview: updatePagePreview,
    v: v,
    vNoDot: vNoDot,
    wireDecimalInputs: wireDecimalInputs,
    wireEnterLineBreaks: wireEnterLineBreaks,
    wirePastePlainText: wirePastePlainText
  };
}
