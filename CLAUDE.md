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

### O marcador "Fim da página N" também é um vizinho sem `data-blk` — e esse não é seguro de ignorar

A frase acima — "mesclar dois itens da mesma lista nunca é bloqueado" — parte
de um pressuposto que quebrou em 2026-09-10: o único jeito de um `<li>` da
`<ul data-blk="impressaoList">` ter um vizinho sem `data-blk` seria outro
`<li>` de verdade. Não é mais assim desde que `updatePagePreview()` existe.
Esse marcador (`.pg-break-marker`, ver mais abaixo) mostra ao vivo, na tela,
onde a impressão vai quebrar de página — e quando a quebra cai no meio da
lista de impressão diagnóstica, ele entra como mais um `<li>`,
`contenteditable="false"`, irmão dos itens de verdade. Sem `data-blk`, do
mesmo jeito que um `<li>` comum.

A médica relatou: foi ao fim da última frase da conclusão e apertou Delete
para "subir a assinatura" — um gesto normal, sem seleção nenhuma. O Delete
caiu bem na borda de um `<li>` cujo vizinho seguinte era o marcador de
página. A checagem de `wireBlockBoundaryGuard()` olha `closest('[data-blk]')`
a partir do `<li>`, sobe até o `<ul>`, e só verifica o vizinho DO `<ul>` — não
o vizinho do `<li>` onde o cursor realmente está. Pelas regras de então, um
`<li>` vizinho sem `data-blk` é "seguro" (mesclar duas linhas da lista é
esperado). Só que o `contenteditable="false"` do marcador não impede o
Backspace/Delete nativo: o navegador pula por cima dele e mescla o `<li>`
atual com o item de VERDADE do outro lado — sumindo com uma linha inteira da
impressão diagnóstica, colada sem espaço na anterior, sem apagar nada visível
na tela. Reproduzido preenchendo o `obstetrico.html` até estourar 2 páginas e
apertando Delete no fim de "Gestação eutópica...": "Peso fetal (Hadlock)."
sumiu, colado no fim da frase anterior. Nem `dedupBlocos()` nem
`restoreMissingBlocks()` veem problema — o `<ul data-blk="impressaoList">`
continua um só, íntegro, filho direto do `#paper`; a rede das duas é cega ao
que acontece **dentro** dele.

O conserto, na mesma função: antes de olhar o vizinho do `<ul>`, olha primeiro
o vizinho do próprio `<li>` mais próximo do cursor (`closest('li')`) — se ele
for um `.pg-break-marker` e o cursor estiver na borda do `<li>` voltada para
lá, cancela, igual ao resto da função. O cheque do `<ul>` (nível de bloco)
também passou a tratar `.pg-break-marker` como vizinho perigoso, não só
`data-blk` — mesmo que o Chrome, na prática, já remova sozinho um marcador
que seja filho direto do `#paper` sem chegar a mesclar o resto (testado e
confirmado com Playwright), não vale depender desse comportamento não
documentado do navegador para o caso mais grave, dentro da lista.

Qualquer marcador de página que sobreviver a um Delete/Backspace bloqueado
aqui não é perda nenhuma: ele é descartado e recriado do zero a cada
`updatePagePreview()`, então volta (ou muda de lugar) sozinho no próximo
`render()`.

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

## Override da impressão diagnóstica: a linha editada à mão congelava com a IG antiga

Cada `<li>` da impressão diagnóstica pode ser reescrito à mão no preview — é o
recurso normal de ajustar a redação. O texto digitado vira um override
(`impressaoOverrides[key]`), guardado por chave da checklist, e daí em diante
`render()` usa ele no lugar do texto gerado.

O problema é que o override guardava **só o texto digitado**, sem nenhuma forma
de saber se os campos que geraram aquela frase tinham mudado depois. Uma vez
editada, a linha ficava congelada para sempre. Relatado em 2026-09-17 no
`obstetrico-1trimestre.html`, no pior lugar possível: a linha "Gestação
eutópica, de X semanas e Y dias pelo CCN". A médica ajustava a redação com uma
IG valendo, depois trocava o método de cronologia para DUM ignorada/incerta e
digitava a IG correta em "Idade gestacional pela USG" — e a linha impressa
seguia com a IG **antiga**, sem aviso nenhum. Só o checklist da barra lateral,
que nunca usa override, mostrava o valor certo. Reproduzido: 10 semanas e 1 dia
sobrevivendo a uma correção para 8 semanas e 2 dias.

O conserto guarda, junto de cada override, o texto automático que estava
valendo no instante da captura — `impressaoOverrideBase[key]`, copiado de
`lastAutoLabel[key]`, que `render()` atualiza a cada passagem com o `it.label`
de `buildImpressao()`. Na montagem de `impressaoListHtml`, um override cujo
`impressaoOverrideBase` não bate mais com o `it.label` atual é descartado e a
linha volta a sair dos campos. Editar a redação continua funcionando
normalmente enquanto os campos que geram a frase não mudarem.

Duas consequências ao mexer nisso:

- **O rascunho ganhou a chave `overridesBase`.** Rascunho gravado antes deste
  conserto não tem essa chave, e nesse caso todo override existente é tratado
  como desatualizado no primeiro `render()`: cai para o texto automático. Numa
  data gestacional isso é mais seguro do que confiar num texto digitado à mão
  sem como conferir se ainda bate com os campos.
- **Os outros treze laudos seguem com o padrão antigo.** `impressaoOverrides`
  existe em todos os catorze `.html`, e só o `obstetrico-1trimestre.html` tem a
  aferição de validade — os demais continuam podendo congelar uma linha editada
  à mão. Não é o mesmo risco em toda parte (uma data gestacional errada é pior
  que uma frase de textura desatualizada), mas é o mesmo bug. Ao portar, são as
  cinco peças: as duas variáveis novas, a cópia em `lastAutoLabel` logo depois
  de `buildImpressao()`, a captura da base no listener de `'input'` do `#paper`,
  o descarte na montagem da lista, e os resets (troca de paciente,
  `draftSnapshot()`, `draftRestore()` e o `catch` de rascunho corrompido).

## O botão "Baixar Word": o cabeçalho triplicava e a página não batia com o PDF

O `.doc` que o botão gera é HTML puro (o Word abre HTML como se fosse um
documento seu) — e chega lá **sem a folha de estilo da página**: só sobrevive
o que estiver em `style=""` no próprio elemento, mais o `<style>` que o motor
injeta no `<head>` do documento. `buildReportHtml()`, em cada laudo, clona o
`#paper` e usa `copyComputedToClone()` (WORD_COPY) para inlinar o que o CSS
faria — mas cobre só os seletores que cada laudo lista, e o resto (a régua da
página, o reset do estilo "Normal" do próprio Word) não tinha nenhum lugar
para morar antes de 2026-09-10, então cada um dos treze `.html` reescrevia à
mão o HTML do documento inteiro no handler do `#btnDownloadWord` — e essa
cópia já tinha divergido: só o `obstetrico-1trimestre.html` tinha corrigido a
margem de página e o reset do "Normal", os outros doze nunca receberam esse
conserto.

Relatado pela Dra. Morgana em 2026-09-10: o Word saía com entrelinha maior
que o PDF, o cabeçalho de identificação (nome/médico/GPA/DUM) não parecia
nada com o cartão do PDF, e a paragrafação vinha diferente. Três causas
distintas, confirmadas abrindo o `.doc` gerado no LibreOffice Writer (que
compartilha boa parte das mesmas manhas de importação de HTML do Word de
verdade — nenhum dos dois entende flexbox, `border-radius` ou margem de div
em volta de parágrafos):

- **O cartão de identificação saía em três caixas**, uma por linha, em vez do
  cartão único do PDF. `.id-card` é um `<div>` com borda ao redor de vários
  `<p>`/`<div class="id-card-row">`; o Word não sabe desenhar borda de div, e
  reaplica a borda em CADA parágrafo de dentro dele — exatamente o mesmo tipo
  de estrago que uma `<table>` evita (célula de tabela é objeto à parte, sem
  essa "propagação"). A primeira linha (Nome/Data) já virava uma `<table>`
  interna sem borda por outro motivo (o Word não faz flexbox) e por isso
  escapava do bug; as demais linhas, que ficavam como `<div>` puro, eram as
  que triplicavam.
- **A entrelinha vinha maior**: o Word, além do `line-height` em px copiado
  pelo `copyComputedToClone()`, também aplica a própria regra de espaçamento
  entre linhas por cima, calculada pela métrica dele para a fonte — que pode
  dar um valor maior que o navegador usou. `mso-line-height-rule:exact`
  desliga essa segunda conta.
- **A paragrafação vinha diferente**: sem um reset do estilo "Normal" do Word
  (o que `obstetrico-1trimestre.html` já tinha, sozinho: `p,h1-h4,ul,ol,li
  {margin:0}`, mais a família de fonte), o Word soma o espaçamento dele por
  cima da margem inline de cada bloco. E a margem de página do `@page` não
  reservava o mesmo espaço que a impressão reserva para o timbrado físico
  (3,5cm no topo, 2cm no pé e nas laterais — ver `.paper-table` no
  `@media print` de cada laudo): sem isso o Word usa a margem padrão dele
  (2,54cm iguais), o texto começa mais alto na folha e quebra em pontos
  diferentes do PDF.

O conserto foi para o motor — `buildIdCardTable(clone, paperEl)` e
`wordDocHtml(html, titulo)`, em `laudo-core.js` — pelo mesmo motivo de sempre:
as treze cópias já tinham divergido (só uma tinha a correção de margem) e iam
continuar divergindo. `buildIdCardTable()` troca o `.id-card` inteiro por uma
`<table>` de uma célula só, com a borda na `<td>` — a linha Nome/Data continua
uma tabela interna sem borda para alinhar as pontas, as demais viram `<p>`; o
morfológico de 1º trimestre e o TN+Doppler+colo, que separam a última linha
(risco calculado) com uma borda por cima via `.id-card-row:last-child` no
CSS, têm essa borda replicada lendo o computed style da própria linha ao
vivo, não hardcoded — só esses dois laudos, cujo CSS aplica a regra, acabam
reproduzindo o divisor. `wordDocHtml()` monta o `<html>` inteiro (xmlns do
Word, `@page` com a margem de 3,5cm/2cm/2cm/2cm, o reset do "Normal"), e
`copyComputedToClone()` passou a acrescentar `mso-line-height-rule:exact`
toda vez que copia `line-height`. Cada um dos treze `.html` só chama as duas
funções; nenhum HTML de `<html xmlns:o=...>` sobrou copiado à mão em arquivo
nenhum.

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
(Supabase) ----`, no fim do `<script>` de `obstetrico.html`,
`obstetrico-1trimestre.html`, `morfologico-1trimestre.html` e
`morfologico-2trimestre.html`, no handler do botão `#btnSalvarCG`. São quatro
laudos, não dois — os dois morfológicos ganharam a integração depois, e é aí
que mora o risco descrito em "O GPA e os quatro laudos", mais abaixo: uma
correção feita em um deles não chega sozinha nos outros três.

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

Os quatro seguem a mesma sequência: acha ou cria a paciente pelo CPF → acha a
gestação `ativa` (ou cria uma, deduzindo DUM/DPP da cronologia do laudo, e
recusa com aviso se não houver data de referência) → insere **um `exams` por
feto**.

| | `obstetrico.html` (2º/3º tri) | `obstetrico-1trimestre.html` | `morfologico-1trimestre.html` | `morfologico-2trimestre.html` |
|---|---|---|---|---|
| Colunas de `exams` | `dbp`, `cc`, `ca`, `femur`, `au_ip`, `au_fluxo`, `acm_ip`, `aut_e`, `aut_d`, `cpr`, `ila`, `bolsao`, `colo`, `ig_dias_manual` | `ccn` | `ccn`, `dbp`, `cc`, `ca`, `femur`, `aut_e`, `aut_d`, `colo`, `ig_dias_manual` | `dbp`, `cc`, `ca`, `femur`, `dof`, `umero`, `radio`, `ulna`, `tibia`, `fibula`, `aut_e`, `aut_d`, `ila`, `bolsao`, `colo`, `ig_dias_manual` |
| Múltiplos | um exame por feto, coluna `feto` | um exame por **embrião**, coluna `feto` | um exame por feto, coluna `feto` | um exame por feto, coluna `feto` |

As artérias uterinas e o colo são **maternos**, não fetais: numa gemelar o mesmo
valor vai repetido nos exames dos dois fetos, de propósito.

### O GPA e os quatro laudos: o campo que existia na tela e não chegava no banco

O G/P/A (`gpaG`/`gpaP`/`gpaA`) é digitado nos quatro laudos, sai impresso no
cartão de identificação dos quatro — e até 2026-09-21 só dois deles gravavam
`gestas`/`partos`/`abortos` na tabela `gestacoes`: `obstetrico.html` e
`morfologico-1trimestre.html`. Nos outros dois o campo ficava na tela e na
folha e nunca chegava na Curva de Crescimento. É o caso exato da quarta regra
acima ("campo do formulário que não é enviado sai no laudo impresso e some na
integração"), com o agravante de que a gestação criada a partir do morfológico
de 2º trimestre nascia com GPA nulo — e ninguém percebe olhando o laudo, que
imprime o GPA certinho. Foi assim que a Dra. Morgana achou uma paciente sem
GPA no prontuário em 2026-09-21.

Os quatro gravam igual hoje:

- **Gestação nova**: `gestas`/`partos`/`abortos` entram direto no `insert`.
- **Gestação que já existia**: campo vazio no laudo **não apaga** o que já está
  salvo (`gpaGVal!=null ? gpaGVal : gestacao.gestas`) — mesma lógica das flags
  booleanas logo abaixo, e pelo mesmo motivo: um laudo é uma visita, não a
  verdade inteira da gestação.
- **Divergência**: quando os dois lados têm valor e eles não batem, abre o
  modal `#cgGpaOverlay` (`askGpaDivergencia()`) com os dois GPAs lado a lado e
  a médica escolhe qual vale. Diferente das flags, GPA **não** é ratchet: um
  G4 pode virar G5 numa visita seguinte, e corrigir um dígito errado é caso
  comum demais para o laudo nunca poder sobrescrever. Por isso a escolha é
  dela, não uma regra fixa.
- Sem divergência (o que está salvo é nulo — a primeira sincronização de uma
  gestação criada antes desta correção) só preenche, sem popup.

O modal são três peças por arquivo, e nenhuma está no `laudo-core.js`: o CSS
`.cg-gpa-*` no `<style>`, o `<div class="cg-overlay hide" id="cgGpaOverlay">`
logo depois do `#cgToast`, e `fmtGPA()`/`askGpaDivergencia()` no bloco da
integração. **Quatro cópias, o mesmo cenário da extração de 2026-09-01** — se
esse modal precisar de outro conserto, extraia-o de uma vez.

### Um saco pode ter mais de um embrião (`obstetrico-1trimestre.html`)

Até 2026-09-19 esse laudo tratava saco e embrião como a mesma coisa: escolher
"Gemelar (2)" criava **dois sacos**, um embrião em cada. Isso descreve uma
dicoriônica — numa **monocoriônica** há um saco só, com os dois embriões
dentro, e não havia como dizer isso.

Hoje o saco carrega uma lista de embriões (`saco{uid}Embrioes`, seletor
"Embriões neste saco", até `MAX_EMBRIOES = 3`), e quem decide o formato é a
**corionicidade**: `aplicarLayoutGestacao()` monta um saco só com N embriões
quando ela começa com `monocorionica`, e N sacos de um embrião caso contrário.
Trocar o número de embriões ou a corionicidade remonta a lista nesse molde;
como `setSacoCount()`/`setEmbriaoCount()` só acrescentam ou tiram pelo fim,
alternar entre monocoriônica diamniótica e monoamniótica não apaga nada.

Duas armadilhas ao mexer nisso:

- **Os ids dos campos são assimétricos de propósito.** O 1º embrião guarda os
  ids planos de sempre (`saco{uid}CCN`, `saco{uid}VV`...) e só o 2º e o 3º
  levam o infixo `e{idx}` — é o que `embPre(uid, idx)` monta, e todo código que
  lê campo de embrião passa por ela. Assim um rascunho gravado antes desta
  mudança volta inteiro (só tinha os ids planos) e o laudo de embrião único
  continua saindo byte a byte como saía. Uniformizar para `e1` quebra os dois.
- **O rascunho precisa recriar os blocos antes de repor os valores.** Os ids
  do 2º/3º embrião só existem depois de `setEmbriaoCount()` rodar, então
  `draftRestore()` lê `saco{uid}NumEmbrioes` de `d.fields` e monta os blocos
  **antes** do laço que escreve os campos. Rascunho antigo não tem essa chave e
  fica com um embrião, que era tudo o que existia.

Com **dois embriões** o laudo sai em duas colunas, para caber numa folha só
(`table.biometria-par`): num saco só, são as duas tabelas de biometria (Embrião
A / Embrião B) dentro do mesmo bloco `saco_{uid}`; em dois sacos, são os dois
blocos de saco inteiros, num único bloco `sacos_par`. Com três sacos as colunas
ficariam estreitas demais, e esses seguem empilhados. É `<table>` e não
flex/grid porque o Word não entende nenhum dos dois — as larguras vão inline em
`%` pelo mesmo motivo (o computed style devolve pixels da tela, e a folha do
Word tem outra largura).

No `morfologico-1trimestre.html` não existem cards de saco: lá o ajuste foi só
na frase do útero (`uteroTextoMultiplo`, com `{SACOS}` montado a partir da
corionicidade), que antes dizia "saco gestacional" no singular mesmo na
dicoriônica. Frase **nova** em vez de mudar a `uteroTexto`: o botão "Salvar
frases" grava todas as frases de uma vez, então uma chave já existente no
`localStorage` da médica sobrescreveria o padrão novo e o conserto não
apareceria para ela.

### Monocoriônica: um cálculo de risco só, rotulado para os dois (ou três) fetos

`morfologico-1trimestre.html` montava um quadro "Risco Fetal para Trissomias"
por feto, rotulado "— Feto 1" e "— Feto 2", e uma linha de cromossomopatias por
feto na impressão. Numa **monocoriônica** isso descreve errado o que foi feito:
os fetos vêm do mesmo óvulo fecundado e dividem a mesma placenta, então o
rastreamento combinado dá um risco só para a gestação inteira. Dois quadros com
o mesmo número sugerem dois cálculos independentes. Confirmado com a médica em
2026-09-20.

Hoje, quando a corionicidade começa com `monocorionica`, sai **um quadro só** e
**uma linha só** na impressão, rotulados `Ambos os fetos` (com dois) ou
`Os três fetos` (com três) no lugar de `Feto 1`. Os valores usados são os do 1º
feto — e é por isso que os campos de risco do 2º/3º **somem do formulário**
nesse caso (`feto{uid}RiscoWrap`): sem isso haveria dois lugares para digitar o
mesmo número e um deles seria ignorado em silêncio.

Três coisas a respeitar ao mexer aqui:

- **A visibilidade é decidida dentro do `render()`**, não num listener do
  select de corionicidade — mesmo padrão do `feto{uid}CiurEstagio` no
  `obstetrico.html` (ver "PIG vs CIUR", mais abaixo). `render()` já roda a cada
  mudança de corionicidade e de número de fetos, então não há um segundo
  gatilho para esquecer. O wrapper nasce com `class="conditional show"`, de
  modo que o caso comum (feto único, dicoriônica) aparece sem depender do
  primeiro `render()`.
- **O quadro e a linha da impressão andam juntos.** São dois lugares
  diferentes no código (`render()` e `buildImpressao()`), e `state` carrega
  `isMonocorionica`/`rotuloRiscoMono` justamente para os dois usarem a mesma
  decisão. Consertar um e esquecer o outro dá um laudo com um quadro e duas
  linhas dizendo a mesma coisa.
- **Dicoriônica e triamniótica continua com três quadros, de propósito.** Aí
  dois dos três fetos dividem um cório e o terceiro tem o seu — mas o
  formulário não tem como dizer *quais* dois são o par, então agrupar seria
  chutar. Três quadros é o comportamento honesto enquanto não existir esse
  campo. O mesmo vale para o `obstetrico-1trimestre.html`, que não tem quadro
  de risco nenhum, e para o `obstetrico-tn-doppler-colo.html`, que também não —
  este conserto é só do morfológico de 1º trimestre.

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

## RCP: mesma fórmula do relatório evolutivo (curva-fetal)

2026-09-21. `obstetrico.html` calculava o percentil do RCP com uma tabela
própria (`CPR_REF`, média/DP por semana, via z-score/`normalCDF`) sem
citação de origem no código. O app de curvas (`curva-fetal`) calcula o
mesmo RCP com outra fórmula (`calcDopplerCpr`, Figueras/Barcelona, linear:
P50 = 1,08 + 0,006×IG, interpolação linear entre P10/P50/P90, não Gaussiana)
— usada no relatório evolutivo que ela entrega junto com este laudo. O
mesmo valor medido dava percentis incompatíveis nos dois papéis: RCP 1,2 em
34-35 semanas saía ~P40 lá e <P5 aqui. Confirmado com a médica: a fórmula do
app é a referência. `cprPercentil` aqui foi trocado para portar
`dopplerCprRef`/`calcDopplerCpr` de `curva-fetal/index.html` linha a linha —
**mudar a fórmula lá sem mudar aqui volta a abrir a divergência**, e
vice-versa.

## PIG vs CIUR: critérios menores, não só o percentil do dia

Mesma conversa. O laudo decidia PIG vs CIUR só pelo percentil de peso do
exame do dia (`feto{uid}Percentil`, digitado à mão): ≤P3 vira CIUR, 5-10 vira
PIG, sem olhar Doppler nenhum. O relatório evolutivo do `curva-fetal`
(`calcDiagnosticoFGR`) é mais completo: em gestação única, dois critérios
menores (um deles sempre de crescimento) fecham CIUR mesmo sem chegar a P3.
Resultado: um feto em P8 com IP-uterinas>P95 saía "PIG" aqui e "CIUR" no
relatório — mesma paciente, dois papéis discordando no mesmo dia.

O bloco de `pesoKey` (dentro de `render()`, no `.map` por feto) foi movido
pra depois do cálculo de Doppler fetal (`piUmbilicalNum`/`piACMNum`/
`cprPercentilNum`) — antes vinha primeiro, sem esses valores disponíveis — e
ganhou a mesma regra de `calcDiagnosticoFGR`, na parte que um exame único
consegue calcular (sem histórico, sem cruzamento de quartis):

- **Só gestação única** (`!isMultiple`). Numa gemelar/trigemelar o mecanismo
  é o CIUR seletivo, que este laudo ainda não calcula — mexer nisso é tarefa
  à parte. O corte fixo em percentil continua valendo pra elas.
- **Antes de 32 semanas**: IP-umbilical>P95 ou IP-uterinas>P95 já fecha CIUR
  sozinho, junto com o percentil 5-10 (que já é o critério de crescimento).
- **A partir de 32 semanas**: precisa de 2 dos 3 critérios menores — RCP<P5
  ou IP-umbilical>P95 ou IP-uterinas>P95 contam como **um** critério só
  (não três); ACM<P5 (centralização) conta como um **segundo**, independente.
  O percentil ≤10 já é sempre o critério de crescimento que falta — mesmo
  invariante do app (pelo menos um critério tem que ser de crescimento).
- **IP-umbilical e IP-ACM em percentil são novos aqui** (`calcAuPercentil`/
  `dopplerAuRef`, Acharya 2005; `calcAcmPercentil`/`dopplerAcmRef`, Ebbing
  2007) — mesmas fórmulas do `curva-fetal`, portadas função por função. Sem
  campo novo na tela: o laudo continua imprimindo o IP bruto medido e a
  classificação normal/alterada que a médica escolhe manualmente; o
  percentil é cálculo interno, só para decidir CIUR vs PIG.
- **O campo de estágio (`feto{uid}CiurEstagio`, I-IV) precisou de um segundo
  gatilho.** Ele só aparecia quando `updateFetoWraps` rodava (campo de
  percentil, mudança de evento `input`), olhando só `percentilNum<=3`. Um
  feto que fecha CIUR pelos critérios menores (percentil 5-10 com Doppler
  alterado) nunca dispara esse evento com o valor certo. Como `render()` já
  roda a cada tecla digitada em qualquer campo do card — inclusive os de
  Doppler, todos wireados com `field.addEventListener('input', render)` — a
  visibilidade correta agora é decidida dentro do próprio `render()`, com o
  resultado final do `pesoKey`: `toggle('wrap_'+pre+'CiurEstagio', pesoKey
  === 'impPesoCIUR')`. `updateFetoWraps` continua com a checagem simples
  (só percentil ≤3) como estado inicial do card, antes de qualquer Doppler
  ser digitado; `render()` é quem tem a palavra final.

## Fluxo diastólico da umbilical (AEDF/REDF/iAREDF): fecha CIUR sozinho, antes de 32 semanas

2026-09-21, resolvendo a pendência que ficou aberta na seção anterior. A
médica lembrava de ter feito este campo — só tinha feito no app de curvas
(`e-au-fluxo`, na tela de exame manual), não no editor de laudos: são
ferramentas separadas, sem código compartilhado, e o campo nunca existiu
aqui.

- **Campo novo**: `feto{uid}AuFluxo`, select ao lado de "Art. Umbilical
  (IP)", mesmas opções e mesmos valores do app (`''`/`normal`/`ausente`/
  `reversa`/`intermitente`) — para a coluna `au_fluxo` do Supabase chegar
  com o mesmo vocabulário dos dois lados. Sem select próprio pra "REDF" vs
  "AEDF" vs "iAREDF" como conceitos distintos: são os mesmos três valores
  que o app já usa pra decidir estadiamento (Barcelona) e Tipo III de
  Gratacós — inventar um vocabulário próprio aqui reabriria a mesma
  divergência do RCP.
- **`auDiastoleZero`** (`ausente`/`reversa`/`intermitente`) é o terceiro
  critério isolado do app (junto com PFE/CA<P3): fecha CIUR sozinho, **antes
  de 32 semanas**, mesmo com percentil de peso normal — não passa pelo ramo
  "percentil 5-10" do bloco de `pesoKey`, é checado antes, na mesma ordem de
  precedência do `calcDiagnosticoFGR`. **A partir de 32 semanas o app não
  usa este achado pra diagnóstico** (só pra estadiamento) — não é assimetria
  introduzida aqui, é o comportamento do próprio relatório evolutivo, e o
  editor segue igual.
- **Gated por `!isMultiple`, diferente do app.** No `calcDiagnosticoFGR` esse
  critério isolado roda por feto mesmo em gemelar/trigemelar — só que lá o
  diagnóstico muda de nome pra "CIUR seletivo" nesses casos
  (`_DX_NOME_MULTIPLA`). Este editor não tem essa segunda nomenclatura, então
  restringir a gestação única é o que impede um "CIUR" indevido (o termo de
  gestação única) aparecer numa gemelar. Mesma escolha do bloco de
  critérios menores da seção anterior — não é descuido, é a mesma decisão.
- **Prioridade na frase de impressão.** `dopplerFetalLabelFor` agora checa
  `auFluxoAlterado` primeiro, antes do RCP<P5 e antes da classificação manual
  normal/alterado (`impAuFluxoAlterado`, nova frase) — é o achado mais grave
  e mais específico dos três, e ficaria escondido atrás de uma frase
  genérica de "redistribuição de fluxo" se entrasse depois. A tabela de
  Doppler Fetal também mostra o achado ao lado do IP bruto da umbilical
  (`AU_FLUXO_TXT`), não só na frase da impressão.
- **`au_fluxo` agora vai no insert do Supabase** (`au_fluxo: v(pre+'AuFluxo')
  || null`), fechando a lacuna que a seção anterior deixou documentada — o
  app de curvas passa a enxergar este achado quando a paciente vier por
  aqui, o que alimenta o estadiamento de Barcelona e o Tipo III de Gratacós
  lá também (ver `CLAUDE.md` do `curva-fetal`).
