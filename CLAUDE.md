# laudos-dramorgana

Laudos de ultrassonografia, cada um um arquivo HTML, sem build, mais um
**`laudo-core.js`** que todos carregam: o motor comum a todos eles. Cobrem três
áreas — medicina interna, ginecologia e obstetrícia — organizadas em três
categorias no `index.html` e no dropdown "Trocar de laudo" de cada arquivo. O
`README.md` descreve laudo a laudo (o que cada um tem, o rascunho automático, o
layout de referência); este arquivo trata do que não se vê olhando um laudo
isolado: o que é do motor e o que é de cada laudo, a integração com o app de
Curva de Crescimento e as armadilhas de manutenção que já morderam antes.

Os laudos de **medicina interna** (`abdome-total.html`,
`rins-vias-urinarias.html`, `tireoide-doppler.html`) usam o mesmo motor mas não têm CPF, não têm feto e
não tocam em `patients`/`gestacoes`/`exams` — nenhuma integração com a Curva de
Crescimento, igual ao `rastreamento-ovulacao.html` nesse aspecto (mas sem
tabela própria no Supabase: não salvam nada, é preenche-e-imprime). A seção
"O que cada laudo grava", mais abaixo, é sobre os laudos obstétricos — não se
aplica a eles.

## Publicação

O GitHub Pages publica a partir da **`main`** (workflow "pages build and
deployment", ~1 minuto após o push). Confirmado em 2026-08-23 pelo `head_branch`
dos runs. Merge na `main` = está no ar — mas o navegador da médica pode segurar
a versão antiga em cache: quando ela disser que a mudança "não apareceu", peça um
hard refresh antes de sair investigando o código.

## `laudo-core.js`: conserta-se num lugar só

Até 2026-09-01 os sete laudos carregavam cada um a sua cópia do mesmo motor —
paginação da impressão, ajuste automático de fonte e entrelinha, barra de
formatação, rascunho automático, máscara de CPF, validação de decimais. Toda
correção nessa parte era a mesma edição feita sete vezes, à mão, e bastava
esquecer um arquivo para o conserto valer só em seis.

**Não era hipótese: já tinha acontecido.** No dia da extração, o guard de
`wireDecimalInputs` (que impede o mesmo `<input>` ganhar um listener novo a cada
`render()`) existia em quatro laudos e faltava em três; `packAt()`,
`paginateForPrint()` e `updatePagePreview()` tinham duas versões diferentes
circulando, e outras oito funções divergiam em comentários — sinal de conserto
aplicado num arquivo e copiado a meio caminho nos outros.

Hoje esse motor é um arquivo só, `laudo-core.js`, e cada laudo o carrega antes
do próprio `<script>`:

```html
<script src="laudo-core.js"></script>
```

**Mudança no motor = mudança nos sete de uma vez, sem tocar em nenhum `.html`.**
É esse o ponto. O cabeçalho do `laudo-core.js` explica a interface; o resumo:

- O laudo cria o motor na **primeira linha** de dentro do IIFE, com
  `criarMotorLaudo({...})`, e desestrutura dele o que for usar.
- Tudo o que o motor recebe em `cfg` é **função** (`render: () => render()`),
  de propósito: assim ele pode ser criado antes de qualquer `const` do laudo
  existir, sem esbarrar em TDZ.
- **O estado que os dois lados escrevem vive em `motor.st`** —
  `st.printPaginated`, `st.draftReady`, `st.lastBlockHtml`, `st.draftTimer` e
  companhia. No laudo eles se escrevem sempre com o `st.` na frente. Declarar um
  `let printPaginated` local de novo não dá erro nenhum: só cria uma segunda
  cópia que se desgarra da do motor em silêncio, que é exatamente o tipo de bug
  que essa extração veio matar.

### Conferindo uma mudança no motor

Como o `laudo-core.js` vale para os sete, um erro nele quebra os sete de uma vez
— e nem todo estrago aparece na tela do laudo em que se estava mexendo.
`ferramentas/testar-laudos.mjs` abre os sete num Chromium, preenche tudo com
valores fixos, imprime, salva o rascunho, baixa o Word e guarda o HTML que saiu
de cada passo; rodado antes e depois, aponta qual laudo mudou de comportamento.

```
npx http-server . -p 8901 -s &
node ferramentas/testar-laudos.mjs http://127.0.0.1:8901 antes.json
# ... a mudança ...
node ferramentas/testar-laudos.mjs http://127.0.0.1:8901 depois.json
node ferramentas/testar-laudos.mjs --comparar antes.json depois.json
```

Foi assim que a própria extração do motor foi conferida: das dezenas de valores
comparados, os únicos que mudaram nos sete laudos foram os três esperados — o
guard de decimais passando a existir em `pelvico-infantil`,
`rastreamento-ovulacao` e `transvaginal`. Todo o resto, incluindo o HTML do
laudo montado, saiu byte a byte igual.

### O que continua dentro de cada `.html`

O motor é o que não muda de laudo para laudo. O que é do laudo continua nele, e
é bastante: `render()`, `buildImpressao()`, `buildReportHtml()`, `WORD_COPY`,
`renderChecklist()`, `tituloExame()`, `draftSnapshot()`, `draftRestore()`,
`draftInit()`, `applyVRToInputs()`, `VR`/`PHRASES` e a integração com a Curva de
Crescimento. Essas divergem de propósito — cada laudo mede coisas diferentes.

Ao criar um laudo novo, o caminho é copiar um laudo parecido, apagar o que é
dele e **não** recopiar o motor: o `<script src="laudo-core.js">` já entrega
tudo aquilo pronto.

### O laudo não abre mais sozinho, fora da pasta

O preço de ter um motor só é que o `.html` deixou de ser um arquivo que se abre
solto: sem o `laudo-core.js` do lado, ele carrega e não monta nada. Cada laudo
tem, logo depois do `<script src>`, um teste de `typeof criarMotorLaudo` que
mostra um aviso explicando o que falta — em vez de deixar a médica diante de uma
tela pela metade, sem pista nenhuma. Pelo GitHub Pages os dois arquivos estão
sempre juntos e nada disso aparece.

## ⚠️ "Add files via upload" apaga o que foi corrigido aqui

A Dra. Morgana às vezes sobe o arquivo de laudo pelo botão "Add files via upload"
do site do GitHub, a partir da cópia que tem no computador dela. Esse upload
**substitui o arquivo inteiro** — tudo o que foi corrigido no repositório depois
da cópia local dela desaparece, sem conflito e sem aviso.

Já aconteceu, e custou um dia inteiro de integração quebrada em silêncio: em
2026-08-22, de manhã, entraram os commits `68d39de` (filtro de lixeira) e
`bb5ecd4` (artérias uterinas); às 12h59 do mesmo dia o upload `3b10dc0` desfez os
dois. Só foram recolocados no dia seguinte (`74bb127`), depois de alguém
perguntar "está tudo integrado?".

Com o motor separado há uma terceira forma disso acontecer: subir por upload uma
cópia **antiga** de um laudo — de antes de 2026-09-01 — devolve aquele arquivo ao
tempo em que ele trazia o motor inteiro dentro de si. Ele até funciona (ignora o
`laudo-core.js` e usa a cópia velha que carrega), e é justamente por funcionar
que passa despercebido: aquele laudo simplesmente para de receber os consertos
feitos no motor, calado. Se um laudo começar a divergir dos outros seis sem
motivo, confira se ele ainda tem o `<script src="laudo-core.js">` no topo.

Duas consequências práticas:

- **Ao pegar uma tarefa nesses arquivos, desconfie de regressão silenciosa.**
  `git log --format="%h %s" | grep "Add files via upload"` lista os uploads; para
  cada um, `git show <hash> -- <arquivo> | grep "^-"` mostra o que ele apagou.
- **Ao terminar, avise que editar a cópia local e subir por upload desfaz o
  trabalho.** O caminho seguro é pedir a mudança aqui, sobre o que já está no
  repositório.

## O #paper em folhas: a invariante que duplicava o laudo

Nos sete laudos o corpo do documento é um `#paper` `contenteditable` cujos
**filhos diretos** são os blocos gerados por `render()`, cada um com um
`data-blk` estável. `renderBlocks()` reconcilia por essa chave — e só olha
`:scope > [data-blk]`, filho direto, nunca neto.

Entre o `beforeprint` e o `afterprint`, `paginateForPrint()` quebra essa
invariante: troca o conteúdo do `#paper` por uma sequência de
`<div class="print-page">` (uma por folha física, para prender a assinatura no
pé da última e repetir o cabeçalho de identificação no topo das demais). Nesse
intervalo os blocos são **netos** do `#paper`.

Foi daí que saiu o laudo impresso em duplicata (corrigido em 2026-09-01, nos
sete arquivos): qualquer `render()` ou autosave que caísse nesse intervalo —
o debounce de 800 ms do texto recém-digitado, o `visibilitychange` que a janela
de impressão dispara — via um `#paper` "vazio" e montava outro laudo por cima,
sem conseguir remover o antigo (invisível pela mesma consulta). Pior: o
rascunho gravava o laudo já paginado, e a duplicação voltava a cada abertura.

O que segura isso hoje, e precisa continuar valendo em qualquer mexida no
pipeline de impressão:

- **`st.printPaginated`** marca o intervalo. `render()` adia (`st.renderPendingAfterPrint`,
  rodado pelo `restore()`) e `updatePagePreview()` sai na hora.
- **`unwrapPrintPages(root)`** (no `laudo-core.js`) desfaz a paginação: tira os blocos das
  `.print-page` e mantém só um elemento por `data-blk` — o resto (o
  "Continua…", o espaçador da assinatura, a cópia do cabeçalho, o
  `<ul class="impressao">` remontado) é andaime de impressão e vai fora. Roda
  em `renderBlocks()`, no `draftPaperHtml()`, ao recolocar o rascunho e no
  começo do próprio `paginateForPrint()`.

**Todo código novo que leia, salve ou reconcilie o `#paper` tem de passar por
`unwrapPrintPages()` antes** — ou assumir que pode estar rodando com o laudo em
folhas.

### A morfologia quebra linha a linha

O bloco da morfologia fetal (nos dois morfológicos) sai com
`data-split="rows"`: `packAt()` gera um box por `<tr>` em vez de um box para o
bloco inteiro, e `paginateForPrint()` remonta as linhas que couberam numa
tabela por folha. Sem isso a morfologia inteira pulava para a folha seguinte e
deixava meia página em branco — e não havia como empurrar só o final dela.
O marcador de quebra do preview vira um `<tr>` quando cai dentro da tabela;
um `<div>` ali seria filho inválido e o navegador o jogaria para fora.

### Enter num parágrafo digitado à mão também duplicava o bloco

Mesma família do bug acima, gatilho diferente: por padrão, Enter dentro de um
`contenteditable` divide em dois o elemento de bloco mais próximo do cursor.
Quando esse elemento É o próprio portador do `data-blk` — um `<p>`/`<h3>`/`<h4>`
sem filhos de bloco, como `<h3 class="doctitle">` ou o `<p class="linha">` de
"Ao exame:" —, as duas metades da divisão herdam o **mesmo** `data-blk`.
`renderBlocks()` só enxerga o primeiro de cada id (`:scope >
[data-blk="id"]` pega um só) e nunca mais toca no segundo: ele vira um órfão
que nenhuma reconciliação move nem remove, arrastando o resto do laudo —
inclusive a assinatura — para lugar nenhum a cada novo `render()` ou
impressão, sem jeito de voltar ao estado anterior editando de novo.

Isso já tinha sido flagrado e corrigido, mas só para o `<h3 class="doctitle">`
(o atalho de Enter no título vira mover o seletor de espaço acima dele, não
uma quebra de linha — ver comentário histórico ainda em alguns laudos). O
mesmo bug em qualquer outro bloco de parágrafo único ficou sem proteção até
2026-09-02, quando a Dra. Morgana relatou digitar uma observação extra
diretamente no preview e ver "Ao exame" pular para depois da assinatura, sem
conseguir mais desfazer digitando de novo.

A correção — `wireEnterLineBreaks(paperEl, getIdCardGapSel)`, em
`laudo-core.js` — generaliza a proteção do título para o `#paper` inteiro: o
Enter é interceptado e vira uma quebra de linha
(`document.execCommand('insertLineBreak')`) dentro do mesmo nó, em vez de uma
divisão.

**A primeira versão dessa correção, na manhã do mesmo dia, não bastou.** Ela
protegia só os blocos "sem filhos de bloco", partindo da ideia de que num
bloco com filhos quem se divide é o filho, sem `data-blk` próprio. Na mesma
tarde a Dra. Morgana mandou um obstétrico simples impresso em duplicata: o
navegador **não divide o elemento mais próximo do cursor**, divide o que ele
considera "o parágrafo" ali, e no fim de uma cadeia aninhada isso sobe vários
níveis de uma vez. Dois contraexemplos, os dois com filhos de bloco e os dois
duplicando mesmo assim:

- **Líquido amniótico do obstétrico** — `<div>` com `<p>` e `<table>` dentro.
  Ela clica no fim do bloco para escrever uma observação extra; o texto entra
  solto, irmão da `<table>`, e o Enter parte a `<div>` que carrega o `data-blk`.
- **Risco fetal do morfológico de 1º trimestre** — `<div data-blk>` com um
  `<div class="risk-card">` dentro. Mesmo com o cursor **dentro** do risk-card,
  o Enter no fim dele parte a `<div>` de fora, a do `data-blk`.

Por isso a regra deixou de adivinhar o alvo da divisão. Hoje o Enter só corre
solto onde a divisão é presa por construção — dentro de um `<li>` (parte o
item, nunca o `<ul>` em volta; é assim que se acrescenta uma linha à impressão
diagnóstica) e dentro de uma célula de tabela. Em todo o resto do `#paper` ele
vira quebra de linha, que é o que ela quer ao digitar uma observação a mais:
linha nova, não bloco novo.

### `dedupBlocos()`: a rede embaixo, para o estrago não ser permanente

Prevenir o Enter e a colagem fecha os caminhos **conhecidos**. O que torna esse
bug caro não é ele acontecer: é ele ser irreversível — uma vez duplicado, o
laudo continua duplicado a cada `render()`, vai duplicado para o rascunho e
volta duplicado na próxima abertura, sem nada que a médica possa digitar para
desfazer.

`dedupBlocos(root)`, no `laudo-core.js`, restabelece a invariante do `#paper`
(um elemento por `data-blk`, sempre filho **direto**):

- `data-blk` repetido → o segundo, o órfão, é removido.
- `data-blk` aninhado dentro de outro elemento → **sobe** para filho direto, na
  mesma posição; não é apagado. O Word (`buildReportHtml()`) e o rascunho
  (`draftPaperHtml()`) saem desse mesmo caminho e nada é redesenhado depois
  para repor o que se perdesse ali.

Ela roda dentro do `unwrapPrintPages()`, antes do retorno adiantado — ou seja,
em **todos** os caminhos que já chamavam essa função: `renderBlocks()`,
`paginateForPrint()`, `draftPaperHtml()` e o `buildReportHtml()` dos onze
laudos. Consequência prática: qualquer laudo que já tenha duplicado — inclusive
um rascunho gravado torto antes deste conserto — se endireita sozinho no
próximo desenho, sem a médica precisar recomeçar o laudo.

**Ao mexer no pipeline do `#paper`, não troque essa subida por um `remove()`.**
Apagar o bloco aninhado é uma linha mais curta e passa nos mesmos testes (o
`renderBlocks()` regeneraria o bloco a partir do formulário), mas o Word e o
rascunho sairiam sem ele.

### `restoreMissingBlocks()`: a rede irmã, para bloco que sumiu em vez de duplicou

`dedupBlocos()` conserta bloco duplicado; `restoreMissingBlocks()` (2026-09-04),
também no `laudo-core.js`, conserta o oposto — bloco que sumiu inteiro. O
`#paper` é uma única área `contenteditable`: uma seleção que se estende mais do
que a médica pretendia (arrastar o mouse, um clique duplo que pega o parágrafo
errado) e um Backspace, ou digitar por cima dela, apaga de uma vez todo mundo
que estava no meio — blocos inteiros, inclusive os que ficam **antes** de onde
ela estava mexendo. Foi assim que a Dra. Morgana viu "Motivo do exame" e "Ao
exame:" sumirem do `transvaginal.html` depois de mexer em frases perto do fim
do laudo: a seleção pegou mais do que devia e apagou os dois blocos, que ficam
logo no topo.

Na época em que isto foi escrito, essa seleção larga demais não tinha como ser
interceptada sem quebrar a edição normal — mas dava para consertar depois.
Texto digitado direto no `#paper` não passa por `render()` (só o rascunho ouve
o `'input'`), então nada reconciliaria o estrago até a médica mexer em outro
campo do formulário — e ela pode nunca mexer, indo direto para a impressão com
o laudo faltando pedaço. (Isso mudou em 2026-09-08 — ver
`wireBlockBoundaryGuard()` abaixo —, mas `restoreMissingBlocks()` continua
valendo: é quem conserta um rascunho já salvo torto antes desse dia, e
qualquer caminho de edição que a interceptação não cubra.)

`restoreMissingBlocks()` roda a cada `'input'` dentro do `#paper` (é o motor
quem liga esse listener sozinho, ao criar o motor — nenhum `.html` precisou
mudar): qualquer `data-blk` que existia no último `render()` e não é mais
filho direto do `#paper` volta, com o mesmo HTML gerado da última vez —
`st.lastBlockHtml`, a mesma fonte que o rascunho já usa para diferenciar texto
gerado de texto digitado à mão. Só faz sentido nos laudos com `data-blk` — e
isso inclui os de medicina interna: `abdome-total.html`, `rins-vias-urinarias.html`
e `tireoide-doppler.html` também montam o `#paper` por `blocks.push()` +
`renderBlocks()`, igual aos demais.

### `wireBlockBoundaryGuard()`: quando o bloco não some, sobra vazio ou com o texto errado

As três redes acima (`wireEnterLineBreaks()`, `dedupBlocos()`,
`restoreMissingBlocks()`) resolvem bloco dividido, duplicado ou que sumiu
inteiro. Ficava de fora um quarto jeito de estragar o `#paper`, relatado pela
Dra. Morgana em 2026-09-08 no `abdome-total.html`: ela escreveu uma observação
livre com uma seleção que sobrou maior do que pretendia — cobrindo o fim do
`<h3 class="doctitle">` e o começo do `<p data-blk="aoExameLabel">` de "Ao
exame:" — e viu os dois **sumirem** da tela; ao redigitar o título, o que
tinha acabado de escrever na observação sumiu de novo.

O motivo é diferente do que `restoreMissingBlocks()` cobre: apagar (ou digitar
por cima de) uma seleção que cruza dois `data-blk` nem sempre remove o
elemento do segundo bloco do DOM — o navegador às vezes só **esvazia** o
título (`<h3 data-blk="doctitle"><br></h3>`) ou mescla o resto de um parágrafo
dentro do outro. O elemento com `data-blk` continua lá, um por id, filho
direto do `#paper` — exatamente a invariante que `dedupBlocos()` e
`restoreMissingBlocks()` verificam —, então nenhuma das duas rede enxerga
problema. O estrago é silencioso e definitivo do mesmo jeito: o bloco fica
vazio ou com o texto errado, o rascunho grava esse estado, e reabrir o laudo
não devolve nada.

`wireBlockBoundaryGuard(paperEl)`, no `laudo-core.js`, fecha esse caminho na
origem, ouvindo `'beforeinput'` no `#paper`: sempre que a seleção não está
colapsada e o início e o fim dela caem em `data-blk` diferentes — digitar uma
letra por cima, Backspace, Delete, colar (que já vira
`execCommand('insertText', ...)` em `wirePastePlainText()`), recortar —, o
evento é cancelado e a seleção colapsa para o início dela, igual já se fazia
para o Enter: **nunca apaga o que já estava escrito nos blocos vizinhos**. Para
digitar ou colar (`inputType` `insertText`/`insertReplacementText`), o texto
que a médica estava inserindo ainda entra normalmente no ponto colapsado —
só o texto que já estava no laudo, dentro da seleção larga demais, é que
continua intacto em vez de ser apagado ou misturado. Auto-wired junto com
`restoreMissingBlocks()` ao criar o motor — nenhum `.html` precisou mudar, e
vale para os onze laudos com `#paper`, incluindo os de medicina interna.

Achar o `data-blk` de cada ponta da seleção não é só `closest()` no container:
quando a seleção começa ou termina **entre** dois blocos (um clique-arrasto que
solta antes do título e recomeça depois de "Ao exame:"), o `startContainer`/
`endContainer` do Range é o próprio `#paper`, não um nó de texto dentro do
bloco — o offset é que aponta o índice do filho vizinho. `closest()` direto no
`#paper` sempre devolveria `null` (ele não tem `data-blk`), por isso
`blocoDoLimite()` primeiro acha o nó vizinho de verdade (`childNodes[offset]`,
ou o anterior se o offset for o último) antes de subir procurando o
`data-blk`.

### O mesmo estrago sem seleção nenhuma: Backspace no início / Delete no fim de um bloco

`wireBlockBoundaryGuard()` só cobria seleção **não colapsada** cruzando dois
blocos. Faltava o caso mais comum de todos, sem seleção nenhuma: cursor
colapsado bem no início de um bloco e Backspace, ou bem no fim e Delete — o
gesto normal de "apagar a última letra da linha de cima" ou "juntar duas
frases". O contenteditable trata isso como uma mesclagem de bloco, igual ao
Enter que divide (`wireEnterLineBreaks()`), só que ao contrário: cola o
conteúdo de um `data-blk` dentro do vizinho. E faz isso sem remover nenhum
dos dois elementos de forma limpa — reproduzido em 2026-09-09 no
`abdome-total.html`: cursor no início de `<p data-blk="aoExameLabel">Ao
exame:</p>` e Backspace colou "Ao exame:" dentro do `<h3 data-blk="doctitle">`
anterior (virou "ULTRASSOM DE ABDOME TOTALAo exame:"), mas o `<p
data-blk="aoExameLabel">` **continuou existindo**, intacto, embaixo — os dois
elementos com `data-blk` sobreviveram, um cada, filho direto do `#paper`,
então nem `dedupBlocos()` nem `restoreMissingBlocks()` veem problema (a
mesma cegueira do caso acima, por um caminho diferente: aqui não há seleção
para o cheque de `startBlk !== endBlk` examinar). O resultado na tela e na
impressão é a frase "Ao exame:" literalmente duplicada, sem apagar nada e
sem qualquer clique-arrasto — só digitando normalmente.

O conserto ficou na mesma função, no mesmo `'beforeinput'`: quando a seleção
**é** colapsada e o evento é algum `delete*Backward`/`delete*Forward`
(`deleteContentBackward`/`Forward`, `deleteWordBackward`/`Forward`, etc.), se
o cursor está na borda do bloco voltada para a mesclagem — nada de texto
entre o início do bloco e o cursor (Backspace) ou entre o cursor e o fim do
bloco (Delete) — **e** o vizinho nessa direção (`previousElementSibling`/
`nextElementSibling`) também carrega `data-blk`, o evento é cancelado sem
mais nada: nunca chega a mesclar. Se o cursor não estiver na borda (apagando
um caractere no meio do texto) ou o vizinho não tiver `data-blk` próprio
(mesclar dois `<li>` dentro do mesmo `<ul data-blk="impressaoList">`, que é
como se acrescenta uma linha à impressão diagnóstica), o Backspace/Delete
segue normal — a checagem olha o `data-blk` mais próximo por `closest()`, que
para um `<li>` sobe direto para o `<ul>` que os dois compartilham, então
mesclar dois itens da mesma lista nunca é bloqueado.

### "Espaçamento entre linhas": o mesmo bug de seleção larga, mas fora do motor

O seletor "Espaçamento entre linhas" da barra de formatação — `lineHeightSel`,
presente nos onze laudos com `#paper` — deixa a médica **escopar** a mudança a
um trecho: selecionar um pedaço do laudo e só então escolher Mínimo/Compacto/
Estreito/Normal/Largo aplica a margem só ali, em vez de mudar o laudo inteiro.
Diferente de `wireEnterLineBreaks()`/`wireBlockBoundaryGuard()`, **esse recurso
nunca foi extraído para o `laudo-core.js`** — cada um dos treze `.html` tem sua
própria cópia de `captureSelectionInPaper()`, `wrapSelectionInStyledSpan()` e
do `lineHeightSel.addEventListener('change', ...)`, e já tinha divergido antes
disso ser notado: cinco laudos (`morfologico-1trimestre`, `morfologico-2trimestre`,
`obstetrico-1trimestre`, `obstetrico-tn-doppler-colo`, `obstetrico`) usavam
margens em `em` (acompanham o auto-fit reduzindo a fonte); os outros oito ainda
usavam `mm` fixos, do jeito antigo.

Em 2026-09-08 a Dra. Morgana relatou que, no `obstetrico-1trimestre.html`,
tentar abrir espaço antes de "IMPRESSÕES DIAGNÓSTICAS:" (selecionando um
trecho e escolhendo "Largo") duplicava o cabeçalho. A causa: o código só
contava quantos `p.linha`/`p.recomendacao` a seleção tocava para decidir entre
dois caminhos — mais de um, aplica a margem direto em cada um; um só (ou
zero), envolve a seleção inteira num `<span>` via `wrapSelectionInStyledSpan()`.
Uma seleção que sai de um `p.linha` reconhecido e invade um bloco que essa
lista não contava — um `<h4 class="sec">`, uma tabela — ainda contava "1
parágrafo", caía no caminho do `<span>`, e `range.surroundContents()` falha ao
envolver uma seleção que cruza blocos: o `catch` (`extractContents()` +
`insertNode()`) parte os dois blocos da fronteira em dois, cada metade
carregando o mesmo `data-blk` do original — o mesmo estrago do Enter em
`wireEnterLineBreaks()` (ver acima), só que por um caminho diferente, sem
passar pelo teclado.

O conserto (replicado nos treze arquivos, já que o recurso não está no motor):
a decisão de qual caminho seguir passou a contar **todo filho direto do
`#paper` com `data-blk`** que a seleção toca (`:scope > [data-blk]`), não só
os parágrafos reconhecidos — qualquer seleção que saia de um bloco cai no
caminho seguro. A lista de parágrafos que de fato recebem a margem continua
restrita (`p.linha`, `p.recomendacao` onde já existia, e agora também
`h4.sec`) — **não** virou `:scope > [data-blk]` também, e essa distinção
importa: a primeira tentativa de conserto usou a mesma lista ampla para as
duas coisas, e uma tabela com margem própria (`table.acompanhamento`, no
`rastreamento-ovulacao.html`) entrou na lista de "parágrafos" a limpar —
`el.style.marginBottom = ''` numa tabela cujo `style="margin:0 0 16px"` era um
valor abreviado (`shorthand`) fez o navegador espalhá-lo em
`margin-top`/`right`/`left` explícitos, mudando o HTML servido sem mudar nada
visualmente, mas quebrando a suíte de comparação. Ao mexer aqui de novo,
manter as duas listas separadas: uma ampla só para contar blocos, outra
restrita para aplicar estilo.

Se esse recurso precisar de outro conserto, vale considerar extraí-lo para o
`laudo-core.js` de uma vez — évidente candidato ao mesmo problema que motivou
a extração original (2026-09-01): treze cópias que já divergiram uma vez
(`em` vs `mm`) e não vão parar de divergir sozinhas.

## A integração com a Curva de Crescimento

O app de curvas é outro repositório, **`morgckummer-debug/curva-fetal`** — página
única, mesmo Supabase (projeto `ulcqnqwxguydrpoaplcv`). Os dois escrevem nas
mesmas tabelas `patients`, `gestacoes` e `exams`, e **não há uma linha de código
compartilhada entre eles**: o alinhamento é só combinação, e por isso quebra
calado.

O `CLAUDE.md` do `curva-fetal` descreve o mesmo contrato do lado de lá, e o
`supabase/schema.sql` dele é a fonte de verdade das colunas de `patients`,
`gestacoes` e `exams`. **Toda mudança em como este repositório grava CPF, id,
lixeira ou colunas de exame precisa ser espelhada lá — e vice-versa.** Quando
a tarefa mexer nisso, leia os dois lados antes de escrever qualquer coisa.

Onde fica o código aqui: bloco `// ---- Integração com a Curva de Crescimento
(Supabase) ----`, no fim do `<script>` de `obstetrico.html` e
`obstetrico-1trimestre.html`, no handler do botão `#btnSalvarCG`.

**`rastreamento-ovulacao.html` é diferente: não tem feto, então não grava em
`exams`/`gestacoes`.** Tem sua própria tabela — `laudos_ovulacao` — que guarda
um snapshot completo do formulário (`draftSnapshot()`) por visita, usada só
para o botão "Buscar laudo anterior" no topo do próprio laudo continuar de
onde parou. O app de curvas **nunca lê essa tabela**; ela não aparece no
`schema.sql` do `curva-fetal` (foi criada direto no painel do Supabase, sem
migração registrada em nenhum dos dois repositórios — se for criar uma tabela
nova nesse mesmo padrão para outro laudo, escreva o SQL aqui, no laudo novo,
já que não há onde mais isso ficaria documentado). Ainda usa `patients` para
achar/criar a paciente pelo CPF — mesma paciente das curvas — o que faz as
quatro regras abaixo valerem para ele também, exceto a de colunas de exame.

`transvaginal.html` e `pelvico-infantil.html` tinham o mesmo padrão (tabelas
`laudos_tv` e `laudos_pelvico_infantil`), mas em 2026-08-29 a Dra. Morgana
pediu para tirar a busca de laudo/paciente anterior desses dois — deve existir
só no rastreamento de ovulação. O código foi removido dos dois arquivos
(login, busca, carregar e salvar); eles não tocam mais em `patients` nem em
Supabase. As tabelas `laudos_tv` e `laudos_pelvico_infantil` continuam
existindo no banco com o histórico salvo até então, só não recebem gravação
nova.

### As quatro regras que não podem ser quebradas

- **CPF: `000.000.000-00` é a forma canônica no banco.** O campo da tela tem
  máscara (`aplicarMascaraCPF()`), mas a pontuação é só visual: o salvamento
  passa por `cgOnlyDigits()` e reformata antes de gravar. A busca usa
  `.in('cpf', [cpf, cpfFormatado])` porque ainda existem linhas antigas sem
  pontuação. Gravar só os dígitos parece mais limpo e **não é**: o app de curvas
  normaliza tudo para pontuado ao carregar e reescreve a linha no próximo save,
  a migração `003_normaliza_cpf.sql` existe justamente para consertar o estrago
  que essa divergência causou (a mesma paciente em duas linhas, o exame do laudo
  numa gestação invisível), e a `004` põe unique parcial em `(user_id, cpf)`.
- **Ids: aqui se insere sem `id`.** A identity do Postgres gera, a partir de
  1.000.000 (migração 004). O app de curvas escolhe o id dele (maior id + 1,
  abaixo dessa fronteira) e grava por upsert que reescreve as tabelas inteiras —
  se um insert daqui usar id explícito, ele colide ou é sobrescrito em silêncio.
- **Lixeira: toda busca filtra `.is('excluido_em', null)`.** Uma paciente ou
  gestação mandada para a lixeira está fora de toda leitura normal do app de
  curvas; sem o filtro, o laudo a encontra, pendura o exame nela e o exame nunca
  mais aparece no prontuário.
- **Colunas de exame vêm do schema, não do palpite.** `_EXAM_COLUMNS`, no
  `index.html` do `curva-fetal`, é a lista viva do que a tabela `exams` tem.
  Campo do formulário que não é enviado sai no laudo impresso e some na
  integração — foi o que aconteceu com as artérias uterinas (`aut_e`/`aut_d`)
  entre a criação do bloco e o commit `bb5ecd4`.

### O que cada laudo grava

Os dois seguem a mesma sequência: acha ou cria a paciente pelo CPF → acha a
gestação `ativa` (ou cria uma, deduzindo DUM/DPP da cronologia do laudo, e
recusa com aviso se não houver data de referência) → insere **um `exams` por
feto**.

| | `obstetrico.html` (2º/3º tri) | `obstetrico-1trimestre.html` |
|---|---|---|
| Colunas de `exams` | `dbp`, `cc`, `ca`, `femur`, `au_ip`, `acm_ip`, `aut_e`, `aut_d`, `cpr`, `ila`, `bolsao`, `colo`, `ig_dias_manual` | `ccn` |
| Múltiplos | um exame por feto, coluna `feto` | um exame por saco, coluna `feto` |

As artérias uterinas e o colo são **maternos**, não fetais: numa gemelar o mesmo
valor vai repetido nos exames dos dois fetos, de propósito.

### Gestação múltipla: um `exams` por feto, A/B/C

O laudo de 2º/3º trimestre atende até três fetos (`MAX_FETOS = 3`) e manda um
`exams` por feto: o Feto 1 do laudo é o `'A'` lá, o 2 é `'B'`, o 3 é `'C'`
(`String.fromCharCode(65 + idx)`). `tipo_gestacao` acompanha — `'gemelar'` com
dois, `'trigemelar'` com três.

Isso só passou a existir com a **migração 005** do `curva-fetal`, que soltou os
checks (`exams.feto` aceitava só A e B; `tipo_gestacao`, só única e gemelar).
Antes dela o laudo mandava o terceiro feto como `'B'` — passava no check e
confundia duas medidas diferentes sob o mesmo rótulo no prontuário. **Se algum
dia o banco voltar sem a 005, o insert do terceiro feto falha no check.**

A **corionicidade** segue o número de fetos nos dois lados: tricoriônica e
triamniótica só aparece com três, as de dois só aparecem com dois. O check do
banco é uma lista única, então ele não impede a combinação errada — quem impede
é o select de cada app. Se for mexer na lista, mexa nos dois: `updateGestacaoWrap()`
aqui e `_gestacaoTipoUI()` lá.

### Flags booleanas da gestação: sempre ratchet, nunca sobrescrita

`ppt_espontaneo_previo`, `progesterona_vaginal_em_uso` e `cerclagem_realizada`
(+ `cerclagem_ig_semanas`) alimentam `avaliarRiscoColoCurto()` do lado do
`curva-fetal` — o alerta de colo curto lê esses campos para não sugerir de novo
cerclagem ou progesterona já feitas, nem "avaliar cerclagem" com a gestante já
fora da janela de 2º trimestre (migrações `009` e `010` do `curva-fetal`).

Os dois laudos (`obstetrico.html`, `obstetrico-1trimestre.html`) gravam esses
três campos com o mesmo padrão: grava `true` quando o checkbox aqui está
marcado **e** a gestação ainda não tinha o campo como `true`; nunca escreve
`false` por cima de um `true` já salvo. Um laudo é uma visita — não teria como
saber se um "true" gravado numa visita anterior (por este laudo, pelo outro
trimestre, ou direto no app de curvas) deixou de valer; um checkbox
desmarcado aqui só significa "não mexi nisso agora", não "reverteu". Se
algum dia um desses campos precisar mesmo ser desfeito (ex.: cerclagem
removida), isso é edição manual na gestação, no app de curvas — não este
formulário.

Ao adicionar uma flag nova nesse molde, siga o mesmo padrão: campo no
formulário perto do antecedente de PPT, coluna no `select` que busca a
gestação ativa, valor no `insert` (gestação nova) e um `if(check && !valorNoBanco)`
próprio no bloco de gestação existente — nunca um único `else if` cobrindo
várias flags, porque aí só a primeira verdadeira do laudo seria gravada.
