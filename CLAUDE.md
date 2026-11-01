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

## O laudo perineal veio de outro repositório (2026-10-07)

`perineal.html` nasceu como o primeiro laudo da clínica, no repositório
`morgckummer-debug/laudoperineo` (`index.html` = perineal da Dra. Morgana,
`benito.html` = a mesma coisa assinada pelo Dr. Benito Ceccato). Era um arquivo
solto de uma geração anterior ao motor: motor embutido, sem rascunho, sem
`data-blk`, `render()` jogando `innerHTML` no `#paper`.

A migração foi uma **reescrita sobre o padrão atual**, não uma cópia: o casco, a
barra de formatação, o combobox do médico solicitante e o ciclo
rascunho/Word/impressão vêm do `transvaginal.html`; o conteúdo clínico (campos,
frases, valores de referência, `buildImpressao`, miomas) vem do original sem
mudar texto de frase. O que muda para quem mexer nele:

- **Um marcador = um bloco.** Cada item de lista é um `<ul class="secul" data-blk>`
  com um `<li>` só (`itemLista()`), não um `<ul>` por seção. A paginação da
  impressão só quebra entre blocos, e só sabe partir `ul.impressao` por item;
  assim a folha nunca quebra no meio de um marcador.
- **Impressão diagnóstica no padrão atual** (`* ` no texto, `ul.impressao`,
  edição à mão com `impressaoOverrides`). O original usava marcador de bolinha.
- **Alterações do ovário (2026-10-07): bloco copiado do `transvaginal.html`.** Aspecto
  com cisto simples (lista de cistos com uid, `CISTO_SLOTS`), policístico (com
  volume), corpo lúteo, folículo, dermoide, endometrioma, volume reduzido, não
  identificado e "outro", mais a "alteração adicional" por ovário; impressão
  diagnóstica com bilateral (policísticos / volume reduzido). São as mesmas funções
  e chaves de frase de lá (`cistosTexto`, `OVARIO_*_TEXT`, `hdSufixoChave`) — outra
  cópia a conservar em sincronia, nenhuma no motor. Diferenças deliberadas: a
  frase-base do ovário normal continua a do perineal ("dimensões e ecotextura
  preservadas"), e com achado ela vira só a medida; `ovarioNaoIdentificado` é a do
  perineal (com `{LADO}`), não a do transvaginal. O rascunho guarda `cistoUids`.
- **Sem CPF, sem GPA, sem Curva de Crescimento.** Não desestruture
  `aplicarMascaraCPF` aqui (ver a seção do `aplicarMascaraCPF is not defined`).
- **Passa em `ferramentas/testar-laudos.mjs`** (entrou na lista `LAUDOS`).
- Correções feitas na migração: `flag_espessura`/`flag_mobilidade` não batiam com
  os ids dos campos (o aviso "acima do valor de referência" nunca aparecia);
  "10h" digitado em "Localização (horas)" saía "às 10h horas"; o `<br>` do título
  era escondido pela regra `br:first-child` (precisa de `class="quebra-titulo"`);
  a frase `linhaEquipamento` existia no painel de frases mas nunca foi impressa —
  foi removida.
- **`benito.html` não foi migrado.** É o mesmo laudo com outra assinatura. O Dr.
  Benito não está na lista `EXECUTANTES` do motor; enquanto isso não mudar, dá
  para assinar como ele com "Outro (digitar manualmente)" no seletor de médico.

## Mamas: um tipo só de cisto simples, com lista (2026-10-08)

"Cisto único", "2 cistos" e "3 ou mais cistos" viraram **um** tipo, `cisto` ("Cisto
simples"), com um card por cisto dentro do achado (ids `achado{uid}CistoS{cuid}Local/Hora/Dist/Tam`,
`cuid` próprio, `cistoUidsDe()`/`addCisto()`). Um ou dois cistos saem numa frase só; de três
em diante, a frase de abertura mais `- C1:`, `- C2:`... (o mesmo `corpoLista` de antes).
Sem septações o texto sai **byte a byte igual** ao dos três tipos antigos.

- **Septações são de cada cisto** (`achado{uid}CistoS{cuid}Sept`, "Não"/"Sim", campo curto). Todos
  os cistos do achado iguais: a característica entra na descrição geral ("de paredes finas e
  regulares, com finas septações internas"). Misturado: a descrição geral não cita septação e cada
  cisto que a tem diz "com finas septações internas" na sua parte (e no `- C2:` da lista). Com algum
  cisto septado o achado **não entra** no resumo de "cisto simples" da impressão (a frase genérica
  apagaria a septação): sai uma linha própria — `impCistoSeptado` (um cisto), `impCistosSeptados`
  (todos septados) ou `impCistosSeptadosAlguns` (misto).
- **O primeiro cisto nasce em `addAchado()` e no `change` do tipo** — não em
  `updateAchadoVisibility()`, senão `wireAchado()` do `draftRestore()` criaria um cisto a mais.
- **Rascunho:** guarda `cistoUids` por achado; `draftMigrarCistos()` converte rascunho com
  `cisto1`/`cisto2`/`cisto3` (campos fixos) para a lista. Sem isso o achado voltava sem tipo.
- **O tipo "Cisto septado" saiu (2026-10-08)**: o cisto simples com "Finas septações internas:
  presentes" cobre o caso. `draftMigrarCistos()` converte rascunho com `cistoSeptado` para
  cisto simples com septação no cisto **mesmo quando o achado já tem lista de cistos** — na versão
  anterior todo card nascia com um cisto escondido, então a lista não indica formato novo. A chave
  `impCistoSeptado` ficou (é a frase do cisto simples com septações, um só).
  A versão intermediária tinha o campo `achado{uid}CistoSeptacoes` (do achado inteiro); a migração
  o replica para cada cisto como `Sept = sim` quando estava em "presentes".
- "Vários cistos dispersos" e "Aglomerado cístico" não mudaram.
- **Layout do card do cisto (2026-10-08):** depois do seletor "Localização", numa única linha
  (`.cisto-linha`, grade de 4 colunas; 2 em tela estreita): Septações internas, Hora, Distância da
  borda areolar e Tamanho — nessa ordem. Hora e Distância têm ids de wrapper `wrap_{pref}_hora` /
  `wrap_{pref}_dist`, e o `data-wrap` do seletor de localização lista os dois separados por espaço
  (`wireLocalToggle()` aceita vários ids); fora do modo "horário" os dois somem e a linha fica só com
  Septações e Tamanho.

## Mamas: localização de cisto e nódulo com quatro modos (2026-10-08)

Todo achado de cisto ou nódulo tem o seletor "Localização" (`campoHoraDistTam()`, ids `...Local`,
`data-wrap` com o id da linha de hora/distância): **horário e distância da borda areolar** (o
padrão), **na borda areolar**, **retromamilar** e **retroareolar**. Só o primeiro usa
hora + distância (`lerLoc()` só pede os dois campos nesse modo; `wireLocalToggle()` esconde a
linha nos outros). `localizacaoTexto(modo, hora, dist)` monta o trecho da frase. Vale para cisto
simples (um seletor por cisto), vários cistos (maior cisto), aglomerado, nódulo
único, 2 nódulos (um seletor por nódulo; ids `...Local1`/`...Local2`, os mesmos sufixos de
`Hora1`/`Dist1`), 3+ nódulos (`Nodulo3N{n}Local`), fibroadenoma e abscesso. Linfonodo intramamário
e seroma ficaram de fora. No modo "horário" o texto sai idêntico ao de antes; rascunho antigo
volta sem migração (o campo novo não existia e assume "horário").

## Mamas: mamografia prévia com data completa e achado (2026-10-08)

No card "Indicação clínica e mamografia prévia", "Mês/ano" virou **"Data da realização"** (texto livre,
placeholder `dd.mm.aaaa`), seguida da categoria BI-RADS e do campo opcional `mamografiaAchado`
("O que foi encontrado"). Sai: `Mamografia de 02.08.2026: Cat 3 (nódulo irregular em mama esquerda).`;
sem achado, o parêntese não aparece. O id `mamografiaData` não mudou, então rascunho antigo (com "mm/aaaa")
volta igual.

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

## O bloco de miomas: cinco cópias, e o TN anexa em vez de trocar a frase-base

2026-09-21. A Dra. Morgana notou que o `obstetrico-tn-doppler-colo.html` não
tinha onde descrever miomatose do útero. Não era regressão: conferido com
`git log -S"mioma"` na história inteira, esse bloco **nunca existiu** nesse
laudo — a lembrança vinha do obstétrico de 1º trimestre, que a médica preenche
na mesma consulta.

O bloco foi portado do `obstetrico-1trimestre.html` mantendo de propósito os
mesmos nomes de função (`miomaSubgroupHTML`, `wireMiomaNodule`,
`renumberMiomaNodules`, `setMiomaCount`, `FIGO_TEXT`), os mesmos ids
(`mioma{uid}Figo`, `mioma{uid}Medida`...) e as mesmas chaves de frase — as 18
chaves portadas são byte a byte iguais às de lá. Agora são **cinco cópias**
(`obstetrico-1trimestre`, `obstetrico-tn-doppler-colo`, `transvaginal`,
`rastreamento-ovulacao`, `monitorizacao-folicular-fiv`), nenhuma no
`laudo-core.js`: o mesmo cenário da extração de 2026-09-01. Se esse bloco
precisar de conserto, conserte nos cinco — ou extraia de uma vez.

**A única diferença deliberada é como a frase entra no laudo.** No 1º trimestre
há três frases-base do útero (`utero`, `uteroComNodulos`,
`uteroCalcificacao`), e `render()` **troca** de chave conforme o achado — ele
precisa disso porque a frase-base de lá afirma "contornos regulares" e "sem
nódulos". No TN a frase-base (`uteroTexto`) não afirma nada disso, então as
frases de mioma/adenomiose/calcificação são **anexadas** a ela, e
`uteroTexto` fica intocada. Isso não é preguiça: trocar uma chave de frase já
existente esconderia o conserto da médica para sempre, porque o "Salvar
frases" dela sobrescreve o padrão novo (ver a nota do `uteroTextoMultiplo`, e
a seção do `laudo-core.js` sobre `PHRASES`). `calcificacaoArqueadas` é a
única chave nova, sem par no 1º trimestre, pelo mesmo motivo.

Com o miómetrio em "Textura homogênea" o laudo do TN sai **byte a byte igual**
ao de antes do port — conferido com Chromium, comparando o HTML do `#paper`
contra a `main` limpa.

### O rascunho do TN nunca voltava: `aplicarMascaraCPF is not defined`

Descoberto ao testar o port, e **anterior a ele**. O `draftRestore()` do
`obstetrico-tn-doppler-colo.html` chamava `aplicarMascaraCPF()` depois de
repor os campos — linha copiada de um laudo que tem CPF. Este laudo **não tem
campo de CPF** e tampouco desestrutura essa função do motor, então a chamada
lançava `ReferenceError` e levava **todo** o `draftRestore()` para o `catch`
— que, por projeto, abre o laudo em branco e **apaga o rascunho**
(`localStorage.removeItem`). Resultado: o rascunho automático deste laudo era
descartado em silêncio a cada abertura, e nada na tela dizia isso. O nome da
paciente e os selects pareciam voltar (o `catch` não limpa os `<input>`), o
que fazia o estrago passar por "o rascunho voltou pela metade".

Era o único dos catorze laudos nessa situação — os outros que chamam a função
têm campo de CPF e a desestruturam. A conferência é de uma linha:

```
for f in *.html; do echo "$f $(grep -c aplicarMascaraCPF $f) $(grep -c 'id="cpf' $f)"; done
```

**A lição que vale além deste caso:** o `catch` do `draftRestore()` trata
qualquer exceção como "rascunho corrompido" e descarta o rascunho. Um erro de
programação em qualquer linha dele — uma função que não existe, um id
digitado errado — vira perda silenciosa de trabalho da médica, sem erro no
console (a exceção é capturada) e sem aviso na tela. Ao mexer no
`draftRestore()` de qualquer laudo, teste o ciclo completo: preencher,
`pagehide`, recarregar, e conferir que os campos voltaram — não só que a
página abriu sem erro.

## Marcador `{ASSIM}` na frase: casava letra por letra, e o que não casava era impresso

2026-09-21. A Dra. Morgana entregou um obstétrico de 2º/3º trimestre cuja
conclusão saiu assim, no papel:

> Gestação eutópica, compatível com 35 semanas e 2 dias de acordo com {MÉTODO}.

Ela havia personalizado a frase `impGestacao` copiando o texto de outro laudo
e escrito o marcador **acentuado**. Duas falhas se somaram:

1. **`{MÉTODO}` nunca casou, em nenhum laudo.** A substituição era
   `t.split('{'+k+'}').join(repl[k])`, uma passada por chave conhecida: o
   texto entre chaves tinha de bater letra por letra com o nome da chave.
2. **E neste laudo não funcionaria nem sem acento.** O `obstetrico.html` só
   passa `{CORIONICIDADE}`, `{IG}`, `{SEMANAS}` e `{DIAS}`; `{METODO}` existe
   no morfológico de 1º trimestre, no TN e no obstétrico de 1º trimestre, que
   montam um `METODO_TXT` ('a DUM', 'a primeira ecografia'...). Confirmado com
   a médica em 2026-09-21: **no laudo de 2º/3º trimestre a conclusão não
   nomeia a referência** — sai só "compatível com X semanas e Y dias", que é
   o padrão do arquivo. `{METODO}` **não** foi adicionado a esse laudo de
   propósito; se algum dia for, lembre que a cronologia dele tem uma opção que
   os outros não têm (`fiv`) e que ela não quer referência nomeada nesse caso.

O conserto tem duas partes, as duas no `laudo-core.js`:

- **`aplicarPlaceholders(texto, repl)`** substitui de uma passada, comparando o
  que está entre chaves com as chaves disponíveis **sem acento, sem caixa e
  sem espaço em volta** — `{MÉTODO}`, `{metodo}` e `{ METODO }` valem
  `{METODO}`. As 21 cópias da linha antiga, espalhadas pelos `phrase()` e
  `phraseRaw()` de 13 laudos, passaram a chamar essa função.
- **Um marcador que não casa com nada é deixado exatamente como está**, de
  propósito, para `verificarPlaceholders(paperEl)` poder encontrá-lo. Ela roda
  no fim de `renderBlocks()` — logo, a cada desenho, nos catorze laudos — e
  mostra um aviso em âmbar acima do preview nomeando o marcador. Apagar o
  marcador silenciosamente seria pior: esconderia o erro de digitação e a
  frase sairia truncada sem ninguém notar.

**O aviso entra FORA do `#paper`** (antes da `.paper-table`) e com
`display:none` no `@media print`. Dentro do `#paper` ele seria um filho direto
sem `data-blk`, exatamente o tipo de vizinho que já causou estrago em
`wireBlockBoundaryGuard()` (ver a seção do marcador "Fim da página N"), e
`dedupBlocos()` teria de aprender a ignorá-lo. Ao mexer nesse aviso, mantenha-o
fora.

**A lição geral:** até aqui, nada impedia um laudo de ser impresso com um
marcador cru no meio de uma frase. O erro não estava no código do laudo —
estava numa frase que a médica digitou, e por isso nenhum teste do
repositório o pegaria. Recurso novo que aceite texto dela com marcadores
precisa dessa rede, não só da substituição.

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

**Um registro em `laudos_ovulacao` é um ciclo, não uma visita** — a chave é
paciente + `data_exame` (data da 1ª visita, calculada, não digitada), e cada
"Salvar" dentro do mesmo ciclo faz upsert nesse mesmo registro conforme a
médica acrescenta visitas. Isso quebrava no ciclo seguinte: para reaproveitar
nome/CPF/DUM da paciente, "Buscar laudo anterior" carregava o snapshot
inteiro, visitas antigas inclusas — só apagando essas visitas manualmente é
que uma nova 1ª visita (e portanto um `data_exame` novo) entrava em vigor;
esquecer esse passo continuava salvando por cima do ciclo anterior. Relatado
pela Dra. Morgana em 2026-09-26.

O conserto (2026-09-26) tem três peças, todas só neste arquivo — não é
comportamento do `laudo-core.js`, já que os outros laudos com integração não
têm o conceito de "ciclo":

- **`ciclo_encerrado`/`encerrado_em`** (colunas novas em `laudos_ovulacao`,
  sem migração — ver o comentário no `<script>` com o `ALTER TABLE` a rodar
  uma vez no SQL Editor do Supabase). Um botão novo, "Salvar e encerrar
  ciclo" (`#btnEncerrarCiclo`, ao lado de "Salvar"), grava a flag junto do
  snapshot. "Salvar" normal sempre grava `ciclo_encerrado: false` — editar e
  salvar de novo um ciclo encerrado por engano já o reabre sozinho, sem
  precisar de um botão "reabrir" à parte.
- **Selo nos resultados de "Buscar laudo anterior".** Cada resultado passou a
  mostrar o período do rastreio (1ª à última visita salva no snapshot, via
  `cgPeriodoVisitas()`) em vez de só a data da 1ª visita, mais um selo "Ciclo
  encerrado" ou "Em andamento" — para saber, antes de clicar, se aquele ciclo
  já tinha sido dado como concluído.
- **"Novo ciclo"** (`cgIniciarNovoCiclo()`), botão novo em cada resultado,
  ao lado de "Excluir" — diferente de clicar no resultado (que continua
  chamando `cgCarregarLaudo()`, carregando as visitas antigas de propósito,
  para continuar o MESMO ciclo). "Novo ciclo" reaproveita a limpeza do
  "Limpar" (extraída para `resetFormParaNovaPaciente()`, sem o `confirm()` e
  sem apagar nome/CPF/médico solicitante/GPA, que são repostos depois a
  partir do snapshot escolhido) e deixa DUM, visitas e achados em branco —
  sem tocar no registro do ciclo anterior.

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

### Nome da paciente: sincronizado a cada salvamento, não só na criação

2026-09-27. O "busca ou cria a paciente por CPF" (item 1 de cada handler)
achava a paciente existente pelo CPF e, se encontrada, nunca atualizava o
`nome` dela — só gravava o nome digitado quando criava a paciente pela
primeira vez. A Dra. Morgana salvou um gemelar, o toast disse que salvou, e
ao procurar a paciente pelo CPF na Curva de Crescimento o nome lá era outro:
o exame tinha ido, calado, para uma paciente já cadastrada com esse CPF (nome
digitado errado numa visita anterior, nome de casada não atualizado, ou — o
caso a temer — um CPF digitado errado batendo com a paciente errada), sem
nenhum aviso de que o nome não batia.

Os cinco arquivos que buscam paciente por CPF (os quatro da tabela abaixo,
mais o `rastreamento-ovulacao.html`) agora comparam `paciente.nome` com o
`nome` deste laudo depois de achar/criar a paciente; se divergem, atualiza
`patients.nome` e acrescenta ao toast final "— nome da Curva atualizado (era
"X")". Não é uma escolha entre os dois nomes como a divergência de GPA
(`askGpaDivergencia`) — aqui o nome do laudo sempre prevalece — mas o aviso
no toast é o que importa: se o CPF bateu com a paciente errada, é ali que
isso aparece, não mais em silêncio.

### O que cada laudo grava

Os quatro seguem a mesma sequência: acha ou cria a paciente pelo CPF → acha a
gestação `ativa` (ou cria uma, deduzindo DUM/DPP da cronologia do laudo, e
recusa com aviso se não houver data de referência) → insere **um `exams` por
feto**.

| | `obstetrico.html` (2º/3º tri) | `obstetrico-1trimestre.html` | `morfologico-1trimestre.html` | `morfologico-2trimestre.html` |
|---|---|---|---|---|
| Colunas de `exams` | `dbp`, `cc`, `ca`, `femur`, `au_ip`, `au_fluxo`, `acm_ip`, `aut_e`, `aut_d`, `cpr`, `ila`, `bolsao`, `colo`, `ig_dias_manual` | `ccn`, `colo` | `ccn`, `dbp`, `cc`, `ca`, `femur`, `aut_e`, `aut_d`, `colo`, `ig_dias_manual`, `nt`, `fc`, `dv_ip`, `dv_onda`, `risco_t21`, `risco_t18`, `risco_t13`, `risco_pre_eclampsia`, `risco_parto_prematuro`, `risco_diabetes_gestacional` | `dbp`, `cc`, `ca`, `femur`, `dof`, `umero`, `radio`, `ulna`, `tibia`, `fibula`, `aut_e`, `aut_d`, `ila`, `bolsao`, `colo`, `ig_dias_manual` |
| Múltiplos | um exame por feto, coluna `feto` | um exame por **embrião**, coluna `feto` | um exame por feto, coluna `feto` | um exame por feto, coluna `feto` |

As artérias uterinas e o colo são **maternos**, não fetais: numa gemelar o mesmo
valor vai repetido nos exames dos dois fetos, de propósito. Os oito campos
novos do morfológico de 1º trimestre (TN/FC/riscos FMF) seguem essa mesma
regra e têm uma seção própria logo abaixo ("TN, FC e riscos da FMF: o
morfológico de 1º trimestre fecha o loop com o Curva de Crescimento").

### TN, FC e riscos da FMF: o morfológico de 1º trimestre fecha o loop com o Curva de Crescimento

2026-09-27. O `curva-fetal` já tinha, desde a Fase 1 documentada no
`CLAUDE.md` de lá ("Riscos T21/T18/T13/pré-eclâmpsia — Fase 1"), colunas para
translucência nucal, frequência cardíaca fetal e os seis riscos do
rastreamento combinado da FMF (T21/T18/T13/pré-eclâmpsia/parto
prematuro/diabetes gestacional) — mas só alimentadas por um formulário
próprio dele, digitado à parte. Este editor já tem os mesmos campos, no
mesmo formulário que gera o laudo (é de lá que aquela página foi portada),
e simplesmente não os mandava para o Supabase. A médica pediu para fechar
esse loop.

- **`nt`/`fc`: por feto, sempre** — vêm de `feto{uid}TN` (mm) e
  `feto{uid}FC` (bpm), a mesma medida física que já ia para o CCN/DBP/CC/CA.
  Sem tratamento especial de corionicidade: cada feto tem a própria TN e a
  própria FC, mono ou dicoriônica.
- **`risco_t21`/`risco_t18`/`risco_t13`: por feto, sem replicar em
  monocoriônica.** O formulário só mostra (e só deixa preencher) o cartão de
  risco do 1º feto quando a gestação é monocoriônica
  (`feto{uid}RiscoWrap` escondido para os demais — ver "Monocoriônica: um
  cálculo de risco só", abaixo). O 2º/3º feto chegam ao Supabase com esses
  três campos vazios por isso, e está certo: o `curva-fetal` já sabe ler só
  o feto A nesse caso (`_riscoFmfCardsHtml`/`_ehMonocorionica`, ver
  `CLAUDE.md` de lá), então não há nada para replicar.
- **`risco_pre_eclampsia`/`risco_parto_prematuro`/`risco_diabetes_gestacional`:
  achado materno, replicado em todos os fetos** — mesmo padrão de `aut_e`/
  `aut_d`/`colo`. Pré-eclâmpsia só entra se `chkPreEclampsia` (o cartão
  "Rastreamento de pré-eclâmpsia (FMF)") estiver marcado; os outros dois
  entram sempre que o denominador ("1 para X") da última página estiver
  preenchido — não têm checkbox próprio.
- **Formato: o editor só guarda o denominador** (a médica digita "1200", a
  impressão já mostra "1: 1200"). O `curva-fetal` espera texto livre no
  formato "1 em X" (mesmo placeholder do formulário dele). Uma função local
  no handler do `#btnSalvarCG`, `riscoTxt`, prefixa `'1 em '` na hora de
  montar o `insert` — não muda nada na tela nem na impressão deste laudo,
  só o que sai pelo Supabase.
- **Sem reconciliação de divergência**, ao contrário do GPA
  (`askGpaDivergencia`): estes oito campos não têm "valor anterior que pode
  estar errado" — cada exame é uma visita nova, o valor vem do software da
  FMF na hora, não há o que perguntar à médica se já existir um valor
  diferente salvo de uma visita anterior.

**2026-09-27, mesmo dia: IP do ducto venoso e onda A entraram no mesmo
loop** — a médica pediu depois de testar os campos acima com sucesso.
`dv_ip`/`dv_onda` já existiam no schema do `curva-fetal` (usados pelo
`obstetrico.html` de 2º/3º trimestre — ISUOG 2020, ver `CLAUDE.md` de lá),
então não precisou de migração nova, só de mandar os dois campos que este
laudo já tinha (`feto{uid}DuctoVenoso`, o IP; `feto{uid}DVOndaA`) no mesmo
`insert`.

- **`dv_ip`: por feto, direto** — `num(pre+'DuctoVenoso')`, mesmo padrão de
  `nt`/`fc` (medida física do feto, não acompanha regra de monocoriônica).
- **`dv_onda`: mesmo vocabulário do `curva-fetal` desde o início.**
  `feto{uid}DVOndaA` saiu como Positiva/Negativa (2 opções) na primeira
  versão deste conserto — a médica corrigiu no mesmo dia: são três opções
  reais (Positiva/Ausente/Reversa), a mesma coluna `dv_onda` do 2º/3º
  trimestre já usa esse vocabulário (ver `CLAUDE.md` do `curva-fetal`, ISUOG
  2020 — lá "ausente" e "reversa" pesam o mesmo na leitura de gravidade, mas
  continuam **valores** diferentes na coluna). `dvOndaTxt()` virou um mapa
  1:1 sem perda nenhuma.

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

**`render()` roda com zero fetos, de verdade — não é só hipótese de TDZ.** O
rótulo/dica do cartão único (a peça acrescentada em 2026-09-28, junto do texto
"Ambos os fetos... a partir da média das TNs") leu `fetos[0].uid` sem checar
se `fetos` tinha algum elemento, e isso derrubou o laudo inteiro: antes do
`addFeto()` do fim do script criar o 1º cartão, `loadExecutanteSelecionado()`/
`applyDigitadora()` já chamam `render()` uma vez, com `fetoUids()` ainda vazio.
Essa chamada é síncrona e sem guarda nenhuma — quebra na hora, mesmo numa
página nova, sem rascunho nenhum envolvido. O estrago ficou pior porque esse
mesmo `render()` também roda dentro do laço de `dispatchEvent('change')` do
`draftRestore()` (ver a seção do `aplicarMascaraCPF is not defined` logo
acima — mesmo mecanismo, gatilho diferente): a exceção caiu no `catch` de
"rascunho corrompido" e apagou o rascunho da Dra. Morgana num F5 comum, sem
ela ter mexido em gemelar nenhum daquela vez. Qualquer código novo dentro do
`render()` que leia `fetos[0]` (ou qualquer índice fixo do array) precisa
checar `fetos.length` antes — o array pode legitimamente estar vazio.

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

## Busca de laudo anterior e morfológico de 3º trimestre (2026-10-02)

- **"Buscar laudo anterior" (nome ou CPF)** passou a existir em
  `obstetrico.html` (tabela `laudos_obstetrico`) e `morfologico-2trimestre.html`
  (tabela `laudos_morfologico_2tri`), copiada do `morfologico-1trimestre.html`:
  mesma barra `#cgBar`, mesmo snapshot (`draftSnapshot()`) gravado junto do
  "Salvar na Curva de Crescimento", mesmo `unique (paciente_id, data_exame)`.
  **As duas tabelas não existem até alguém rodar o SQL** que está no comentário
  do `<script>` de cada arquivo, no SQL Editor do Supabase; sem elas o "Salvar"
  continua gravando os exames e só avisa no toast que a cópia para busca não foi
  salva. Não há "só medidas da Curva" nesses dois (isso é só do 1º trimestre).
  São três cópias do mesmo bloco (1º tri, 2º tri, obstétrico), mais o do
  `rastreamento-ovulacao`, que é outro — se precisar de conserto, considere extrair.
- **Morfológico de 3º trimestre** é o checkbox `#chkTerceiroTrimestre` no topo de
  "Dados do exame" do `morfologico-2trimestre.html` — não é arquivo novo. O
  `render()` lê o checkbox a cada desenho (e não um listener de `change`), porque
  "Limpar" e a restauração do rascunho mexem nele sem disparar evento. Com ele
  marcado: título "DO 3º TRIMESTRE", sem rádio/ulna/tíbia/fíbula/prega pré-nasal
  (campos escondidos por `body.tri3 .t2only`, linhas fora das tabelas, `null` no
  insert de `exams`) e frase de membros própria (`morfoMembros3tri`, chave nova de
  propósito: o "Salvar frases" sobrescreveria uma troca em `morfoMembros`).
  Os valores digitados nesses campos não são apagados ao marcar — só ignorados.

## Doppler fetal (umbilical, ACM, RCP): uma tabela só, igual à do curva-fetal

2026-10-01. A Dra. Morgana notou que vários laudos mostravam o RCP sempre no
P95 e estava calculando à mão. A causa estava aqui: em 2026-09-21 o percentil
do RCP foi trocado para a fórmula do app de curvas (`P50 = 1,08 + 0,006 × IG`,
P10/P90 a ±0,40). Esse P50 (~1,3) está muito abaixo de uma RCP normal (~1,9
em 34 semanas), então praticamente todo exame normal passava do P90 e saía
"P95". A fórmula nunca foi conferida contra uma fonte — a anterior, uma tabela
própria sem citação, não tinha o problema.

Hoje as três referências são as escolhidas pela médica, em `DOPPLER_FMF` e
`dopplerFmfRef()` no `laudo-core.js` (`dopplerFmfPercentil()` é a que os
laudos chamam):

- IP da umbilical: Acharya G et al., Am J Obstet Gynecol 2005;192(3):937-944
  — **tabela** P5/P50/P95 (19–40 semanas, de 2 em 2);
- IP da ACM: Ciobanu A et al. (FMF), Ultrasound Obstet Gynecol
  2019;53(4):465-472 — **tabela** (20–41 semanas);
- **RCP: Baschat AA, Gembruch U., Ultrasound Obstet Gynecol 2003;21:124-127
  — equações**, 20–42 semanas. Média = −0,0059×IG² + 0,383×IG − 4,0636 e
  DP = −0,00113×IG² + 0,07156×IG − 0,67418 (IG em semanas; a do DP é a
  versão corrigida, publicada depois, de um erro de casas decimais no artigo
  original). P5/P95 = média ∓ 1,645×DP.

A RCP saiu do Ciobanu para o Baschat no mesmo dia: o Fetalmed e a Cetrus —
a rotina da médica — usam o Baschat, e o mesmo exame (33s1d, ACM 1,96,
umbilical 0,92, RCP 2,13) dava **P61 aqui e P48 lá**. Com o Baschat dá P48 nos
três. As equações batem com a tabela do Fetalmed em todas as semanas (diferença
máxima 0,005, o arredondamento da tabela). Só o resumo do artigo foi lido (a
Tabela 1 é paga): confira os números contra a fonte, não contra o app.

O percentil é convertido por uma normal "dividida" (DP inferior =
(P50−P5)/1,645, superior = (P95−P50)/1,645): dá exatamente 5/50/95 nos
pontos da tabela e deixa valores abaixo de P5 e acima de P95; nas tabelas
interpola linearmente entre linhas pela IG. Fora da faixa devolve `null` e o
campo fica para a médica digitar.

**O `curva-fetal` tem de usar exatamente estes mesmos números** (suas
`dopplerAuRef`/`dopplerAcmRef`/`dopplerCprRef` e os `calcDoppler*` que as
usam, mais o z-score de `_z.au/acm/cpr`). Mudar a tabela num lado sem mudar no
outro reabre a divergência de percentis entre os papéis que ela entrega.

Cada laudo só chama `dopplerPctInteiro()` (obstetrico e morfologico-2trimestre;
percentil inteiro entre 1 e 99). Os critérios de CIUR que usam o RCP e a ACM
agora são `<= 5` (e `>= 95` para a umbilical): antes o RCP nunca passava de
"<5" porque a fórmula antiga devolvia no mínimo 5, e o critério "RCP<P5" era
código morto.

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
- **IP-umbilical e IP-ACM em percentil são novos aqui** (`calcAuPercentil`,
  `calcAcmPercentil`) — mesmas tabelas do `curva-fetal` (ver "Doppler fetal:
  uma tabela só", acima). Sem
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

## Ducto venoso do anexo de gráficos: eixo X era CCN, virou idade gestacional

2026-09-27. O cartão "IP ducto venoso" de `renderGraficosReferencia()`
(`morfologico-1trimestre.html`) saiu com `xLabel:'CCN (MM)'` desde que os 8
gráficos de referência foram criados — diferente dos outros quatro
("estreitos", ver `x[Label]:'SEMANAS'` nos cartões de FC/CCN/DBP), que já
usam idade gestacional. A médica corrigiu ao revisar o mesmo gráfico portado
para o `curva-fetal` (ver `CLAUDE.md` de lá, "Ducto venoso do 1º trimestre:
eixo X é idade gestacional, não CCN") — o mesmo engano existia aqui, fonte
original de onde `DV_TABLE` foi portada.

`DV_TABLE` é uma leitura visual do gráfico de Pruksanasuk et al. (2014), cujo
eixo original já é CCN (mm) — a tabela não mudou, só a conversão: em vez de
varrer `x` direto em CCN, o cartão agora varre semanas (`range(11,14,0.1)`,
mesma janela do cartão de CCN×IG logo acima) e usa `crlFromGAdays_hadlock(x*7)`
— já usada ali mesmo — para achar o CCN equivalente antes de consultar
`DV_TABLE`. O marcador de cada feto trocou de `x:f.ccn` para
`x:igSemanas` (mesmo padrão de FC/CCN/DBP, que já usam `igSemanas` do
`gaDays` da cronologia, não uma medida do feto).

## Botões de Imprimir/Baixar Word ficavam presos na tela, só neste laudo

2026-09-27. `morfologico-1trimestre.html` tinha uma regra própria,
`.preview-actions:not(.anexo-actions){position:fixed;right:28px;bottom:18px;
...}`, que os outros treze laudos não têm — lá `.preview-actions` é só
`display:flex` normal, em fluxo depois do preview. A regra tinha uma
justificativa registrada no comentário (não depender de rolar até o fim de
um laudo de 3+ folhas, com o `.preview-wrap` preso no topo por
`position:sticky`), mas a médica pediu pra tirar: ela quer o mesmo
comportamento dos outros laudos aqui também.

Removida a regra inteira (a `position:fixed` e o `@media (max-width:980px)`
que a ajustava em tela estreita) — sobrou só a `.preview-actions{display:
flex;gap:8px;margin-top:12px;flex-wrap:wrap;}` de sempre, idêntica à dos
outros treze arquivos. `.anexo-actions` ("Remover imagem(ns) da FMF") não
precisou de nenhum ajuste: ela já reaproveitava essa mesma classe base, só
ficava de fora do `:not()` que virou o grupo principal fixo — sem esse
seletor, os dois grupos (`#previewActions` e `#anexoActions`) voltam a se
comportar igual, em fluxo.

## Risco Fetal para Trissomias saiu do corpo do laudo — repetia a folha de anexo

2026-09-27, mesmo dia. Desde que a folha de anexo ganhou o "Relatório da FMF
em texto" (`renderAnexoFmfReport()`, ver acima), o risco de T21/T18/T13
passou a imprimir **duas vezes** no mesmo laudo: no quadro "Risco Fetal para
Trissomias" no corpo principal (`render()`, perto da biometria/morfologia de
cada feto) e de novo na folha de anexo ("Risks from History, FHR, NT, DV PI,
Nasal bone, Tricuspid"), que lê os **mesmos** campos
`feto{uid}RiscoT21/T18/T13` — o comentário que criou aquela seção já dizia
"não duplica a digitação, só reapresenta", mas isso descreve a entrada de
dados, não a impressão: o número sai duplicado no papel de qualquer jeito. A
médica pediu para manter só a versão na folha de anexo.

Removido: os dois `blocks.push({id:'riscos'...})` do corpo do laudo (feto
único/monocoriônica e gemelar/trigemelar não-monocoriônica), o CSS
`table.biometria.risco-multi` que só servia aquele quadro, e o trecho
correspondente do `WORD_COPY`. **Os campos de entrada continuam intactos**,
no cartão de cada feto (`feto{uid}RiscoWrap`) — são a fonte tanto da folha de
anexo quanto do envio pro Curva de Crescimento (`risco_t21`/`risco_t18`/
`risco_t13`, ver "TN, FC e riscos da FMF" acima); só o quadro impresso no
corpo é que saiu. Confirmado com Playwright: preencher os três campos e
`render()` não deixa nenhum `[data-blk^="riscos"]` no `#paper`, mas o texto
ainda sai na folha de anexo — e o ciclo completo de impressão
(`beforeprint`/`afterprint`, paginação) continua sem erro.

Se algum dia a folha de anexo for removida ou ficar opcional (hoje ela só
aparece quando há dado — `anexoTemDadosFmf()`, que checa os mesmos três
campos), o risco de trissomias passaria a não aparecer em lugar nenhum do
laudo nesse caso — vale revisitar esta decisão se isso mudar.

## "Riscos por história" também repetia — virou espelho automático, não mais digitado

Mesmo dia, revisão seguinte. Tirar o quadro do corpo do laudo (seção acima)
resolveu a duplicação **impressa**, mas a médica ainda via os mesmos números
pedidos duas vezes no **formulário**: os últimos campos do cartão de cada
feto (Síndrome de Down/Edwards/Patau — risco ajustado pelos marcadores
ultrassonográficos) e os primeiros do card "Última página — cálculo de risco
(FMF)" (Trissomia 21 / Trisomia 13/18 — risco por história, antes da
ecografia). Tecnicamente são dois números diferentes do relatório da FMF
(pré-teste vs. pós-teste) — expliquei a diferença, e a médica decidiu que não
liga para a distinção: quer digitar o risco de cada trissomia **uma vez só**,
e que o mesmo valor apareça sozinho no card da FMF.

`anexoRiscoHistT21`/`anexoRiscoHistT1318` viraram **readonly**, mesmo padrão
de `utMedioCalc`/`utP95Calc` (campo calculado dentro do `render()`, não mais
digitado): espelham o risco do **1º feto** sempre — mesma convenção já usada
pro risco ajustado em monocoriônica (o risco por história depende só da
idade materna, não varia por feto, então usar o 1º feto vale também em
dicoriônica/trigemelar). `anexoIdadeMaterna` continua manual — não tem
equivalente no cartão do feto.

**A folha de anexo pede um campo só para Trissomia 13/18** (é assim que o
relatório da FMF imprime o risco por história), mas o cartão do feto guarda
T18 e T13 separados. Sem uma forma de somar dois riscos em texto livre
("1 para X") numa única fração de verdade, o campo combinado usa o **maior**
risco dos dois (o "1 para" **menor**) — o número mais conservador, não uma
combinação estatística real. Se um dia isso incomodar, a alternativa mais
honesta é desmembrar esse campo em dois (T18/T13 separados, como o cartão do
feto já tem) em vez de inventar uma fórmula de combinação.

Efeito colateral aceito: como as duas seções ("Riscos por História" e o
risco ajustado, mais abaixo na mesma folha) agora sempre mostram o mesmo
número — só rotuladas diferente —, a folha de anexo em si passou a repetir
visualmente o mesmo risco duas vezes, só que agora sempre em sincronia (não
duas digitações que podem divergir). Foi decisão explícita da médica, não
descuido: ela só pediu para não digitar duas vezes, não para colapsar as
duas seções da folha de anexo em uma só.

Testado com Playwright: preencher `feto1RiscoT21/T18/T13` atualiza os dois
campos readonly ao vivo (sem precisar de outro `render()` manual), o texto
da folha de anexo mostra os valores certos nas duas seções, e o ciclo de
impressão continua sem erro.

**A idade materna do mesmo card também virou espelho automático**, no
mesmo pedido: `anexoIdadeMaterna` (readonly agora) usa `idadeTxt` — a idade
já calculada em `computeIdadeAnos(dataNascimento, dataExame)` para o campo
"Idade (calculada)" (`idadeCalc`) que o formulário principal já tinha. Não
precisou de campo novo nem de conta nova: as duas atribuições ficam lado a
lado no `render()`, a mesma idade em dois lugares da tela. Testado: mudar
data de nascimento/exame atualiza `anexoIdadeMaterna` junto com `idadeCalc`,
e a frase "O risco baseado nos antecedentes tem por base uma idade materna
de X anos..." da folha de anexo sai com o valor certo.

## Laudo de 1º trimestre: sem gráfico de DBP, e Feto 3 em marrom

2026-09-29, a pedido da médica (mesma mudança no `curva-fetal`, para os dois
laudos ficarem iguais).

- **O gráfico de DBP saiu do anexo.** Ficam 7 cartões: BCF, CCN, Transl. Nucal,
  Ducto Venoso, e as três uterinas (E/D/média) — na grade de 4 colunas, 4 + 3.
  O DBP nessa idade acrescentava pouco ao CCN, e era a referência mais fraca: a
  tabela daqui (Chitty & Altman) e a do Curvas (Hadlock ± DP) já divergiam entre
  si. Removidos o cartão, `DBP_TABLE_WEEKS` e o campo `DBP` da lista de dados que
  ativam o anexo (`anexoTemDadosGraficos`). **O campo DBP do formulário e a linha
  "Diâmetro biparietal" da tabela do laudo continuam** — é medida, não gráfico.
- **Feto 3 (trigemelar) é marrom (`#6F3F22`)**, não mais o dourado escuro
  `#8A651F`, que mal se distinguia do dourado do Feto 2 (`#B08D3F`). A forma do
  marcador (círculo/losango/triângulo) continua sendo o que separa os fetos na
  impressão em preto e branco. Mesma cor do `--marrom` do Curvas.

## Medida acima do VR em itálico, "e 0 dias" e placenta única (2026-10-02)

- **Itálico acima do VR** — `italicizarAcimaVR()` no `laudo-core.js`, chamada em
  `renderBlocks()` sobre o HTML de cada bloco, nos catorze laudos. Lê o próprio
  texto impresso: `<medida> <unidade> (VR até X)` / `(VR: A – B)` / `(VR < X)` e
  põe `<i>` se a medida passa do limite superior. VR de limite inferior
  (`VR > x`, `VR ≥ x`) fica de fora, e **medida sem "(VR ...)" impresso ao lado
  não é coberta** (biometria fetal e Doppler usam percentil, não VR). Ao criar
  uma frase nova com VR, mantenha a medida colada ao "(VR ...)".
- **"X semanas e 0 dias"** — `aplicarPlaceholders()` agora corta o "e 0 dias",
  inclusive em frase que a médica salvou com `{SEMANAS} semanas e {DIAS} dias`
  soltos (o `{IG}` já saía certo).
- **Monocoriônica** (`obstetrico.html`, `morfologico-2trimestre.html`): uma
  só placenta, a do último feto, com o título "Placenta única".

## PIG = PFE < P10; a CA não entra neste laudo (2026-10-03)

Decisão da Dra. Morgana, espelhada do `curva-fetal`: o nome PIG só sai com PFE
< P10. O bloco de `pesoKey` já se comporta assim — decide só pelo percentil do
peso (`percentilNum`) e o laudo não tem percentil de CA em lugar nenhum —, então
**nenhum código mudou aqui**. Consequência a conhecer: no app, CA < P10 com PFE
≥ P10 não vira PIG mas ainda conta como critério de crescimento do CIUR (CA <
P10 + uterinas > P95, ou 2 de 3 depois de 32 semanas); aqui esse feto sai
"adequado", porque o editor não calcula CA. Se um dia ele ganhar percentil de CA,
o critério entra no mesmo `if` do `pesoKey` e a nota "CA abaixo do P10 com PFE
adequada" deve ser espelhada. Gemelar: o laudo continua sem CIUR seletivo.

## "Buscar laudo anterior" (morfológico 1º tri): rótulo pela IG da visita (2026-10-03)

Os resultados "só medidas da Curva" deixaram de dizer "Só medidas (da Curva)":
mostram `Morfológico do 1º trimestre · data · IG X semanas e Y dias · N fetos`.
"Morfológico" só quando algum feto da visita tem `nt` (TN); sem TN (obstétrico de
1º trimestre, só CCN) sai "Exame do 1º trimestre". O trimestre vem da IG (< 14
semanas = 1º, < 28 = 2º, senão 3º); a IG segue a ordem do `calcIgDays` do Curva:
`ig_dias_manual` da visita, depois `ig_base_data`/`ig_base_valor` da gestação, depois a
DUM. Laudos completos salvos continuam "Morfológico do 1º trimestre · data", sem IG
(o snapshot não a guarda de forma consultável).

## Frase apagada à mão não deixa mais um buraco (2026-10-03)

Apagar todo o texto de um bloco gerado (ex.: a frase do "sliding") deixava um
`<p>` vazio com a margem inteira, e não havia como fechá-lo: o Backspace/Delete na
borda de um bloco é bloqueado de propósito por `wireBlockBoundaryGuard()` (mesclar
blocos duplica o laudo). Agora `colapsarBlocosVazios()` (laudo-core.js) põe
`data-vazio="1"` no bloco que **nasceu com texto** e ficou sem nenhum; o CSS
injetado pelo motor o esconde (tela, impressão), `wordDocHtml()` o tira do Word, e o
atributo viaja no rascunho. Não se remove o elemento — `restoreMissingBlocks()` o
devolveria. Nunca esconde o bloco onde o cursor está (quem apaga para redigitar
não pode perder a linha); esconde quando o cursor sai. A marca cai sozinha quando
volta a haver texto ou quando `render()` regenera o bloco (mudou um campo do
formulário: a frase gerada volta). Vale para os catorze laudos, sem tocar em `.html`.
Conferido com `ferramentas/testar-laudos.mjs` antes/depois: nenhuma diferença.

## Transvaginal: cistos simples em lista e policístico com volume (2026-10-03)

- **"Cisto simples" é uma opção só** no aspecto do ovário (e na alteração adicional), com
  um card por cisto (`+ Adicionar cisto`, ids `{ov}_cisto{suf}_{uid}Medida/Volume`, uid
  próprio como nos miomas) e uma caixa "Mostrar volume" por posição. Um e dois cistos
  mantêm as frases de sempre (`ovarioCisto1/2`); de três em diante vale
  `ovarioCistoMultiplos`/`...Tambem`, com `{N}` e `{LISTA}`.
- **O rascunho guarda `cistoUids`**, e `draftMigrarCistos()` converte rascunho antigo
  (`cisto1`/`cisto2`, campos fixos) para a lista — sem isso o ovário voltava sem o achado.
- **Policístico** ganhou `{ov}_policisticoVolume` (aumentado/normal). Bilateral só quando os
  dois têm o mesmo volume; as chaves da impressão mudam com o volume e com "um x vários
  cistos" (`hdSufixoChave`) para uma linha reescrita à mão não ficar presa à frase do outro caso.

## Temas de cor da interface (2026-10-03)

`tema.js` (carregado no `<head>` dos quinze `.html`, antes do `<body>`) troca só as variáveis de cor da **interface** — `--rose*`, `--sage*`, `--bg`, `--line*`, `--ink-soft`, `--shadow` — por `:root[data-tema="..."]`, e cria o botão da paleta em `.topbar-actions` (no `index.html`, direto na `.topbar`). Escolha guardada em `localStorage` (`laudo-tema`), valendo para todos os laudos. Seis paletas: Orquídea (padrão, sem atributo), Oceano, Marinho, Turquesa, Sálvia e Laranja. A folha do laudo (`.paper`) refixa `--ink-soft` no valor original, para impressão e Word não mudarem com o tema. Cor nova no CSS de um laudo: use `var(--rose-dark)` etc., nunca o hex — hex fixo não troca com o tema. Paleta nova = uma linha em `TEMAS`.

## Abdome: colecistectomia e VR do hepatocolédoco (2026-10-07)

`abdome-total.html` ganhou a opção "Colecistectomia (vesícula ausente)" em `vesiculaAspecto`: texto "Vesícula biliar não visualizada, compatível com status pós-colecistectomia" e impressão diagnóstica "Status pós-colecistectomia." (frase `impVesiculaColecistectomia`, chave nova de propósito). Com essa opção o VR do hepatocolédoco passa de "até 6 mm" para "até 10,0 mm", no campo, no aviso de valor acima do VR e na frase impressa — decidido dentro do `render()`, a cada desenho.

## Mamas: um tipo só de nódulo sólido, com lista (2026-10-08)

"Nódulo sólido único", "2 nódulos", "3 ou mais" e "Fibroadenoma (FAD)" viraram **um** tipo, `nodulo` ("Nódulo sólido"), com um card por nódulo (ids `achado{uid}NodS{nuid}Forma/Orientacao/Margens/Ecogenicidade/Fenomeno/Local/Hora/Dist/Tam`, `nuid` próprio, `noduloUidsDe()`/`addNodulo()` — mesmo molde dos cistos). Ecogenicidade: hipoecóica, isoecóica ou ecogênica. Um nódulo sai numa frase só; de dois em diante, frase de abertura mais `- N1:`, `- N2:`... (cada um com as próprias características). A impressão usa `impNoduloSingular`/`impNoduloPlural`; a frase `impFibroadenoma` saiu. O primeiro nódulo nasce em `addAchado()` e no `change` do tipo (não em `updateAchadoVisibility()`). O rascunho guarda `noduloUids`; `draftMigrarNodulos()` converte rascunho com `nodulo1/2/3/fibroadenoma` (2 e 3+ viram margens "circunscritas" — "lobulados" não existe mais; FAD vira nódulo oval hipoecóico paralelo à pele).

## Preview: a linha "Fim da página N" agora vem da paginação da impressão (2026-10-08)

`updatePagePreview()` contava as folhas só com `packAt()`/`autoFitPages()`, enquanto o PDF passa por `paginateForPrint()` — que, quando uma folha estoura mesmo sem espaçador, refaz tudo com orçamento menor. Resultado: a linha tracejada caía num bloco e o PDF quebrava em outro (visto em `mamas.html` com vários nódulos). Hoje o preview roda **a mesma `paginateForPrint(alvo, true)`** sobre uma cópia solta do `#paper` (modo `simular`: não liga `st.printPaginated`, não devolve `restore`). Os candidatos a início de folha (filhos diretos, `<li>` da impressão, `<tr>`/partes da morfologia) levam um `data-pv` temporário só durante a cópia; lê-se qual abre cada folha a partir da 2ª e o marcador entra antes do nó vivo correspondente. Ao mexer na paginação, ela vale para os dois caminhos — não reintroduza uma segunda conta para o preview. A pílula "N páginas" usa a mesma contagem.

## Mamas: nódulos em resumo, e o suspeito sempre sozinho (2026-10-08)

No achado "Nódulo sólido" (`lerAchado()`, tipo `nodulo`), com mais de um nódulo: os **não suspeitos com as mesmas características** (forma, orientação, margens, ecogenicidade, fenômeno) viram um grupo — frase de abertura com a característica no plural e a lista `- N1: às 2 horas, distando ... cm da borda areolar, medindo ... mm.` (só localização e tamanho). Características diferentes = grupos diferentes. Nódulo **suspeito** — margens diferentes de "circunscritas", forma irregular **ou** orientação não paralela à pele — sai sempre num parágrafo próprio, com a descrição completa e "(N#)" (a numeração é a do card). O corpo vira `partes` (lista de {corpo, corpoLista}); `blocoMama()` emite um bloco por parte (ids `...-p1`, `...-p2`; a parte 0 mantém o id de antes). Impressão: achado com suspeito sai numa linha própria (`impNoduloSuspeito`/`impNoduloSuspeitos`) e não entra no resumo "Nódulo sólido em mama X" — os benignos do mesmo achado continuam nele. O critério de suspeição está em `n.suspeito`; sombra acústica não conta (acrescentar ali se a médica pedir).

## Transvaginal: corpo lúteo na conclusão olha o volume do ovário (2026-10-08)

A conclusão do corpo lúteo dizia sempre "Ovário X de volume aumentado, ...". Agora `volumeCorpoLuteo(state, prefix)` compara o volume do ovário com o VR (`VR.ovarioMax`, 9 cm³; `VR.ovarioMenopausa` se o tipo de VR for menopausa): acima do limite → `impOvarioCorpoLuteo` (volume aumentado, texto de sempre); até o limite (9,0 incluso) → `impOvarioCorpoLuteoNormal`; volume em branco → `impOvarioCorpoLuteoSemVolume` (não afirma volume nenhum). A chave da linha ganha sufixo (`-normal`, `-semvol`) para uma redação feita à mão não ficar presa à frase do outro caso. Vale também para o corpo lúteo como 2ª alteração do ovário. **Não mudou** (mesma suposição de "volume aumentado" fixa): cisto simples, folículo, dermoide e endometrioma — se ela notar o mesmo, usar `volumeCorpoLuteo` como molde. O `perineal.html` tem cópia do bloco do ovário e **não** recebeu este ajuste.

**Ampliado no mesmo dia:** `transvaginal.html` e `perineal.html` aplicam a mesma regra ao cisto simples (`impOvarioCisto1/2` + `Normal`/`SemVolume`) e ao folículo (`impOvarioFoliculo` + `Normal`/`SemVolume`), além do corpo lúteo. `volumeOvario()`, `ASPECTOS_COM_VOLUME` e `volFrase()` são o molde; o sufixo da chave da linha é `-vn`/`-sv`. Dermoide e endometrioma não afirmam volume e ficaram como estavam. **`rastreamento-ovulacao.html` e `monitorizacao-folicular-fiv.html` ainda têm as frases fixas "de volume aumentado"** (estrutura diferente: `cisto1`/`cisto2`, sem `hdSufixoChave`).

## Laudo cabia numa folha e saía em duas: a medição ignorava o espaçamento escolhido (2026-10-09)

`--linha-margin` e `--idcard-gap` (barra de formatação) ficam no `style` do `#paper`. As caixas de medição de `packAt()`, `ajustarEspacadores()` e da simulação do preview são **outros elementos** e não herdavam essas variáveis: mediam com a margem padrão (20px) enquanto a folha usava a escolhida (1–6mm). O laudo parecia não caber em 1 página, o ajuste automático desistia e saía em 2, com vão em branco no fim da 1ª (visto em `mamas.html`). `copiarVarsCss(de, para)` copia todo `--*` do `style` do `#paper` para cada caixa de medição — **qualquer variável CSS nova no `#paper` passa a valer na medição sozinha; caixa de medição nova deve chamá-la**. Também: um `MutationObserver` no `style` do `#paper` reagenda `updatePagePreview()`, porque trocar espaçamento não passa por `render()` e a contagem de páginas ficava velha. Conferido com PDF real (Chromium): 5 nódulos + cisto, espaçamento escolhido → 1 folha (antes 2), preview e PDF iguais.

## Ultrassom extra do acompanhamento: checkbox no editor (2026-10-10)

`obstetrico.html` e `obstetrico-1trimestre.html` ganharam, ao lado de "Salvar na Curva de Crescimento", o checkbox `#chkExtraAcomp` ("Ultrassom extra do acompanhamento"). Marcado, o insert em `exams` leva `extra: true` (coluna da migração 015 do `curva-fetal`): a visita conta como extra do plano, não ocupa janela do calendário. Desmarca sozinho depois de salvar, para não vazar para o laudo seguinte, e não vai no rascunho. Os morfológicos não têm: são exames do calendário do plano.

## Conclusão enviada ao Curva de Crescimento (2026-10-12)

Os quatro laudos obstétricos mandam `impressao_laudo` no insert de `exams`: o texto final da impressão
diagnóstica lido do `#paper` (`impressaoLaudoTexto()`, no `laudo-core.js`), com as edições à mão. Exige a migração
028 do `curva-fetal`; sem a coluna o insert falha.

## Nome da adesão nunca é trocado por um laudo (2026-10-14)

A sincronização do nome (acima) agora pula a paciente que tem gestação com `acompanhamento` (plano contratado): o nome dela veio do contrato, completo, e o do editor pode estar abreviado ("só os dois primeiros nomes"). Só paciente sem plano continua tendo o nome atualizado e o aviso no toast. Mesmo bloco nos cinco arquivos com busca por CPF.

## Obstétrico de 1º trimestre: colo uterino opcional (2026-10-20)

Card "Colo uterino" depois de "Regiões anexiais", com a caixa `chkColo` ("Incluir medida do colo uterino no laudo"), desmarcada por padrão: só com ela marcada o campo `coloComprimento` aparece, a frase `coloTexto` entra depois dos anexos e a impressão ganha `impColoNormal`/`impColoAlterado` (abaixo de 30 mm). Frases e corte copiados do `obstetrico-tn-doppler-colo.html` (mesmas chaves). Com a caixa desmarcada o laudo sai byte a byte igual ao de antes. O "Salvar no Acompanhamento" manda `colo` em `exams` só com a caixa marcada (materno: repetido em todos os fetos).

## Endométrio na menopausa: VR até 5,0 mm (2026-10-22)

`transvaginal.html` e `reserva-ovariana.html` (VR do útero em "Menopausa") e `perineal.html` (VR "Pós-menopausa", `op4`) imprimem a espessura endometrial com "(VR até 5,0 mm)" logo depois do "mm", e o campo fica marcado acima de 5,0 (a medida sai em itálico por `italicizarAcimaVR()`). Fora da menopausa nada muda. As frases não mudaram: a medida leva um marcador invisível (`ENDO_MK`) que vira o VR depois de montada a frase, então vale também para frase salva pela médica, desde que ela mantenha `{ESPESSURA} mm`.

## RCP no percentil 5 é normal (2026-10-22)

Regra da médica: a RCP só é anormal (redistribuição) com percentil **menor que 5**; P5 é normal. A frase `impRcpBaixoP5` (obstetrico e morfologico-2trimestre) e o critério RCP<P5 do CIUR (obstetrico) passaram de `<= 5` para `< 5`. O percentil vem inteiro de `dopplerPctInteiro()`, então P4 é anormal, P5 e P6 normais. A ACM continua `<= 5` (ninguém pediu para mudar).

## Linhas livres na impressão diagnóstica (2026-10-23)

Pedido da médica: uma frase da checklist editada à mão pode voltar ao texto gerado (o override cai quando os campos mudam, ver "Override da impressão diagnóstica"). Abaixo do `#impressaoChecklist` o motor cria sozinho o bloco **"Linhas livres"**: até 10 linhas (3 visíveis, "+ Adicionar linha livre"), cada uma com checkbox (`livre{n}On`) e campo de texto (`livre{n}Txt`). O texto mora no campo, não em `impressaoOverrides`: desmarcar só tira a linha do laudo, e o rascunho a guarda como qualquer campo do `#formCol`. Escrever numa linha vazia já a marca. Saem no fim da lista como `<li data-key="livre-{n}">* texto</li>` e tiram o aviso "Selecione os achados...". Editar a linha no preview atualiza o campo. Cada laudo só chama `linhasLivresNaLista(impressaoListHtml)` antes do `</ul>` (tudo o mais está no `laudo-core.js`). Código que conte os `<li data-key>` da lista contra a checklist precisa ignorar `livre-*` (como o `monitorizacao-folicular-fiv.html` já faz). `ferramentas/testar-laudos.mjs` preenche esses campos, então a comparação antes/depois desta mudança acusa as linhas livres a mais.

**Posição das linhas livres na conclusão (2026-10-28, pedido da médica):** cada linha livre tem setas ▲▼ que a movem pela conclusão inteira, passando pelas frases da checklist. A posição fica em `#livre{n}Pos` (campo oculto, vai no rascunho): a chave (`data-key`) da frase gerada logo antes dela, `^` para antes de todas, vazio para o fim (o padrão, e o que vale se a frase de referência sair da conclusão). Linhas na mesma posição seguem a numeração; depois de mover, `livreMover()` renumera as linhas na ordem do laudo. Só linhas marcadas e com texto andam (as outras ficam com as setas desligadas). `linhasLivresNaLista()` lê as chaves das frases geradas da própria lista, então código que monte a lista não precisa mudar. **A linha também aparece na checklist (2026-10-28):** `livresEspelhar()` põe um espelho de cada linha livre marcada (`.livre-espelho`, borda tracejada, com as mesmas setas) entre as frases da checklist, no lugar em que ela sai na conclusão. Roda numa microtask agendada por `linhasLivresNaLista()`, depois de o `renderChecklist()` do laudo redesenhar a lista. Ali o texto só aparece: ele é editado no quadro "Linhas livres".

## Pólipo endometrial virou checkbox (2026-10-24)

Pedido da médica: em `transvaginal.html` e `reserva-ovariana.html` o pólipo saiu do select "Endométrio → Aspecto" e virou o checkbox `chkPolipoEndometrial`, logo abaixo de "Falhas no eco endometrial...". Pode ser marcado junto das sinéquias; com "Espessado e heterogêneo" ele some (a frase do espessado já fala em pólipo). Frases e chave da impressão (`polipo-endometrial`) não mudaram. `draftRestore()` converte rascunho antigo (`endometrioAspecto = 'polipo'`) para Aspecto "Normal" + checkbox marcado. O `perineal.html` já tinha checkbox próprio e não mudou. Em `monitorizacao-folicular-fiv.html` o pólipo não existia: entrou o mesmo checkbox (mesmos ids e campos), com a frase `polipoEndometrial` do `perineal.html` anexada à linha do endométrio, antes das sinéquias, e `impPolipoEndometrial` na impressão. A linha `impLiberacao` ("sem contraindicação para a punção") deixa de sair quando pólipo ou sinéquias estão marcados (pedido da médica, 2026-10-25).

## Barra de formatação: mais botões (2026-10-26, enxugada em 2026-10-27)

`wireMaisFormatacao()` (laudo-core.js) acrescenta sozinha, na barra dos laudos que têm `#fmtBold`, sem tocar em nenhum `.html`: Desfazer/Refazer (antes do negrito) e Cor do texto (depois do sublinhado, paleta de 5 cores). Tudo é `execCommand` no `#paper`, como o negrito: só envolve o trecho selecionado, não divide nem junta blocos. A cor sai como `style` inline, por isso vai para o Word. **Tachado, sobrescrito, subscrito, marca-texto e limpar formatação foram tirados a pedido da médica (2026-10-27)**: não reintroduzir sem perguntar. Listas ficaram de fora pelo motivo de sempre: `insertUnorderedList` troca o `<p data-blk>` por `<ul><li>` e o bloco perde o `data-blk`.

## Morfológico 2º/3º: biometria em quadros por região (2026-10-27)

Pedido da médica, a partir de um esquema dela. Os campos de "Parâmetros biométricos" do cartão do feto saíram dos pares de `.field-row`, que juntavam medidas sem relação entre si, e foram para quadros montados por `bioGrupo()`. Na coluna da esquerda ficam Biometria fetal (DBP, DOF, CC, CA, CF, peso, percentil) e Membros superiores. Na da direita ficam Crânio e SNC, Face (osso nasal, depois as duas órbitas juntas, depois a prega pré-nasal) e Membros inferiores. Cada linha tem o nome, uma caixa curta e a unidade. Abaixo de 720px vira uma coluna só, com os membros no fim. A médica dispensou a caixinha de marcar do esquema. **Ids e laudo impresso não mudaram** (conferido no Chromium contra a `main`, preenchendo por id, no 2º tri, no 3º tri e em gemelar: laudo e rascunho iguais). `ferramentas/testar-laudos.mjs` acusa diferença nesse laudo porque preenche pelos campos na ordem da tela (`'AA' + i`), e a ordem mudou. Não é regressão.

**Morfológico de 1º trimestre, no mesmo dia, a pedido da médica:** mesmo layout, com cópia própria de `bioGrupo()`, que também aceita linha com select (`opcoes`) e linha só de leitura. Em "Parâmetros biométricos" ficam Biometria fetal (CCN, DBP, CC, CA, CF), Fossa posterior (TIC, ponte, ponte-occipital e relação calculada, trazidos da "Avaliação morfológica") e Vitalidade (FC). Em "Marcadores" ficam Translucência nucal, Ducto venoso e Outros marcadores (osso nasal, tricúspide, pelves, bexiga). Os riscos FMF não mudaram. Ids, laudo e rascunho estão iguais aos da `main`, conferido do mesmo jeito: feto único, selects variados e gemelar. São duas cópias de `bioGrupo()`; se surgir uma terceira, vale passá-la para o `laudo-core.js`.

**Mesmo layout nos cards Doppler, pré-eclâmpsia e "Última página — FMF" (2026-10-27, pedido da médica):** como esses cards são HTML fixo, sem `bioGrupo()`, os quadros estão escritos direto no HTML com as mesmas classes. O Doppler tem dois quadros, "Artérias uterinas" e "Resultado"; neste, o percentil de Gómez é uma linha `bio-larga`, com a caixa embaixo do nome, porque o texto é longo. A pré-eclâmpsia ficou num quadro só. A última página tem quatro quadros: riscos por história, trissomias pela FMF, diabetes gestacional e parto prematuro. Onde a medida é "1 para X", o "1 para" aparece no subtítulo da linha. Ids, laudo e rascunho estão iguais aos da `main`, conferido no Chromium preenchendo todos os campos do formulário por id.

## Percentil da TN calculado pelo CCN (2026-10-27)

Pedido da médica, com a tabela P5/P50/P95 por CCN (45–84 mm), que é a mesma `TN_TABLE` que já existia no `morfologico-1trimestre.html`. O select manual "Percentil" (&lt;P95/&gt;P95, `feto{uid}TNClasse`) virou o campo só de leitura `feto{uid}TNPercentil`, preenchido no `render()` por `tnPercentil(ccn, tn)`: lê a linha da tabela com o CCN arredondado para baixo (a leitura com o P95 menor, a mais conservadora), devolve "&lt; P5"/"&gt; P95" fora da faixa e, entre as duas, o percentil pela normal "dividida" dos marcadores do anexo. O laudo imprime "1,8 mm (P50)"; com CCN fora de 45–84 mm o campo diz "sem referência" e o laudo sai só com a medida. O marcador de TN no gráfico do anexo usa a mesma função (`cfg.pctTabela`), não a reta, para os dois não discordarem. Rascunho antigo com `TNClasse` é ignorado: o valor é recalculado. O `obstetrico-tn-doppler-colo.html` não imprime percentil de TN e não mudou.

## Morfológico de 1º trimestre: percentil do IPV do ducto venoso calculado (2026-10-27)

O "Percentil" do ducto venoso (`feto{uid}DVClasse`) deixou de ser o select manual `<P95`/`>P95` e virou campo calculado (`dvPercentil()`), pela referência que a médica enviou: P5 = 0,69, mediana = 0,92, P95 = 1,13, válida de 11 a 14 semanas, **sem divisão por IG nem por CCN**. Entre P5 e P95 o número é aproximado pela normal "dividida" (mesma conta do selo dos gráficos de referência), exato só nos três pontos da tabela; fora sai "< P5" / "> P95" (este marca o campo). Fora de 11s0d–14s0d, ou sem IG, o laudo imprime só o IPV e a onda A, sem percentil. O id não mudou: rascunho antigo volta e o `render()` reescreve o valor. **O gráfico de DV do anexo continua no Pruksanusak 2014 (por CCN, P95 ~1,2–1,28)**: as duas referências discordam perto do P95; unificar é decisão da médica.

**Dados da paciente em quadros, e o card da FMF renomeado (2026-10-27, pedido da médica):** no card "Dados do exame" há dois quadros lado a lado. "Paciente e exame" tem nome (caixa larga, embaixo do rótulo), CPF, data do exame e médico solicitante. "Dados maternos" tem nascimento, idade, peso, altura, IMC e PAM em mmHg. Abaixo, "Antecedentes obstétricos" traz G, P e A numa linha só (`bio-gpa`). A médica não listou o GPA na ordem pedida, então ele ficou nesse quadro. Depois vêm os checkboxes e "Motivo do exame". O card "Última página — cálculo de risco (FMF)" passou a se chamar "Cálculo de Risco pela FMF (Fetal Medicine Foundation)" e perdeu o parágrafo explicativo. O rótulo da folha de anexo no preview (`anexo-label`) não mudou. Ids, laudo e rascunho estão iguais aos da `main`.

**Card "Idade gestacional" em quadro (2026-10-27, pedido da médica):** um quadro só, "Datação", que começa por "Idade baseada em:" (`cronologiaMetodo`, select mais largo, `bio-sel-larga`) e segue com DUM, IG atual e os blocos condicionais de 1º ultrassom (data; semanas e dias numa linha só, `bio-ig`), FIV (data e estágio) e DUM estimada. Os `wrap_usgDatacao`/`wrap_fivTransferencia`/`wrap_dumEstimada` continuam com o mesmo id, agora como `<div class="conditional">` simples dentro do quadro (o `toggle()` só põe e tira `show`). Ids, laudo e rascunho estão iguais aos da `main`.

## Morfológico 2º/3º: cards fixos em quadros, como no 1º trimestre (2026-10-27)

Pedido da médica: levar ao `morfologico-2trimestre.html` o layout em quadros do 1º trimestre, com as mesmas classes `bio-*` (cópia do CSS de lá). "Dados do exame" tem "Paciente e exame" (nome, CPF, data, médico solicitante) e "Antecedentes obstétricos" (G, P, A numa linha); o 2º trimestre **não tem** nascimento, peso, altura nem PAM, então não há quadro de dados maternos. "Idade gestacional" é um quadro "Datação" começando por "Idade baseada em:". O Doppler materno tem "Artérias uterinas" e "Resultado"; o Doppler fetal de cada feto tem "Artérias fetais" (IP da umbilical, IP da ACM, fluxo diastólico) e "Resultado" (RCP, percentil com o botão "Recalcular percentil" dentro do rótulo, classificação). Gestação, placenta, líquido, morfologia, miométrio e colo continuam no formato antigo, como no 1º trimestre. Ids, laudo e rascunho iguais aos da `main`, conferido no Chromium preenchendo por id (feto único com DUM, FIV no 3º trimestre e gemelar, com recarga do rascunho).

## Transvaginal, Contagem de Folículos e Perineal em quadros (2026-10-27)

Pedido da médica, primeira etapa de levar o layout dos morfológicos aos outros laudos. Mesmas classes `bio-*` (cópia
do CSS no `<style>` de cada arquivo; no celular as colunas viram uma só, com `.bio-col{flex:0 0 auto}` para a
`flex-basis` não virar altura). `transvaginal.html` e `reserva-ovariana.html`: "Paciente e exame" + "Antecedentes
obstétricos" (G, P, A numa linha), "Medidas do útero", "Endométrio" (espessura única ou D/E do 3D, aspecto, padrão)
e os dois ovários lado a lado (L, AP, T, volume; na Contagem, também os folículos antrais), logo abaixo do VR; o
aspecto e as alterações de cada ovário continuam embaixo, como antes. `perineal.html`: "Paciente e exame", "Uretra e
colo vesical" + "Bexiga" (os VR continuam nos `span.vr-*` que `applyVRToInputs()` reescreve), "Hiato genital",
"Medidas do útero" + "Colo uterino", "Endométrio" e os ovários. O aviso de valor fora do VR (`flag_*`) foi para
dentro do rótulo. Ids, laudo, Word e rascunho iguais aos da `main`.

**`ferramentas/conferir-por-id.mjs`** é a conferência destas mudanças só de layout: preenche cada campo pelo id (o
`testar-laudos.mjs` preenche pela ordem da tela e acusa diferença sempre que um campo muda de lugar), em 5
cenários (cada select numa opção, caixas variando), e compara laudo, todos os campos depois do `render()`
(calculados inclusive), lista de ids, Word, rascunho e o formulário depois de recarregar. A ordem das chaves no
rascunho muda com a ordem da tela e fica fora da comparação.

## Quadro da paciente: nome em cima, o resto em duas colunas (2026-10-27)

A médica não gostou do G/P/A num quadro sozinho ao lado de "Paciente e exame" e escolheu, entre duas
opções, um quadro só (`.bio-grupo.bio-paciente`): o nome na linha de cima e, embaixo, `.bio-grade2`
(grade de 2 colunas, 1 no celular) com CPF e data do exame, médico solicitante e G/P/A. Vale para
`transvaginal`, `reserva-ovariana`, `perineal` (só data e médico: não tem CPF nem GPA) e os dois
morfológicos. No morfológico de 1º trimestre, "Dados maternos" virou um segundo quadro largo, com a mesma
grade (nascimento/idade, peso/altura, IMC/PAM). O quadro "Antecedentes obstétricos" deixou de existir.
CSS copiado nos cinco `<style>`. Ids, laudo, Word e rascunho iguais aos da `main`
(`ferramentas/conferir-por-id.mjs`, 5 cenários por laudo).

## Pélvico infantil, Rastreamento de ovulação e FIV em quadros (2026-10-27)

Segunda etapa do layout dos morfológicos, a pedido da médica. Mesmas classes `bio-*` (bloco de CSS copiado do
`transvaginal.html`, com `.bio-grade2`). Nos três, o quadro da paciente é o da opção B: nome em cima e, em duas
colunas, CPF, data, médico, G/P/A (pélvico: idade no lugar do GPA; rastreamento e FIV: também DUM, e na FIV o dia
do ciclo). `pelvico-infantil.html`: "Medidas do útero" + "Corpo e colo" lado a lado (o VR do volume, `#vrUteroTexto`,
e o da proporção ficam no `<small>` do rótulo; `applyVRToInputs` continua achando os spans), "Endométrio" num quadro
e os ovários lado a lado com aspecto, dimensões, volume e maior folículo dentro do quadro (`wrap_ov*_normalCampos`
virou `<div class="conditional show">`). `rastreamento-ovulacao.html` e `monitorizacao-folicular-fiv.html`: "Medidas
do útero" (na FIV, ao lado de "Endométrio": padrão e espessura) e os ovários lado a lado com L/AP/T/volume (no
rastreamento, também os folículos dominantes do 1º exame); aspecto, cistos e a lista de folículos da FIV continuam
embaixo, com o título `.ov-titulo`. Ids, laudo, Word e rascunho iguais aos da `main` (`conferir-por-id.mjs`).

## Rastreamento de ovulação: visitas, mobilidade e corpo lúteo em quadros (2026-10-27)

Pedido da médica: os cards "Acompanhamento (visitas)", "Mobilidade", "Hiperestimulação" e "Corpo lúteo e
impressão" ainda estavam no formato antigo. Cada visita agora é um quadro `.bio-grupo` com a grade de 2
colunas (ids iguais; o `renumberVisitas()` continua achando `.visita-index` e `.visita-remove` dentro do
quadro). Mobilidade e corpo lúteo/endométrio são dois quadros lado a lado. Sem mudança de cálculo, frase ou
rascunho: conferido por id contra a `main` e laudo + checklist iguais preenchendo os mesmos valores.

## Morfológicos: a conclusão leva só o "Resumo" do segmento alterado (2026-10-27)

Pedido da médica. Nos dois morfológicos, um segmento em "Alterado (descrever)" tem a descrição (vai inteira para o corpo do laudo) e o "Resumo para a conclusão diagnóstica". Só o Resumo entra na impressão diagnóstica. Antes, com o Resumo vazio, a conclusão repetia a descrição inteira. Agora, sem Resumo, o achado fica fora da conclusão e aparece embaixo do campo o aviso `feto{uid}{Seg}ResumoAviso` ("Sem resumo, este achado não entra na conclusão diagnóstica."), que fica no formulário e não sai na impressão. A frase de ausência de anomalias continua não saindo (`f.morfoAlterado`, separado de `f.alteracoes`, que só tem os segmentos com resumo). Os outros laudos com "Alterado (descrever)" não têm campo de Resumo e não mudaram.

## Morfológicos: achados fetais numa linha com " + ", e "risco aumentado" sublinhado (2026-10-27)

Pedido da médica. Na conclusão, cada feto junta numa linha só os achados alterados (`linhaAchados()` em `buildImpressao()`), separados por " + ", na ordem: marcadores e depois os segmentos morfológicos (só o Resumo, sem o nome do segmento). Exemplo: "Artéria umbilical única + IP DV >P95 + Holoprosencefalia.". No 1º trimestre os marcadores são: artéria umbilical única, osso nasal ausente/hipoplásico, TN > P95 (`tnPercentil().alerta`), IP DV > P95 (`dvPercentil().alterado`) e regurgitação tricúspide. No 2º/3º trimestre só a artéria umbilical única. Os textos curtos são frases editáveis (`impAchado*`). Um achado sozinho sai com a frase de sempre (`impMorfoAlterado`, `impTricuspideAlterada`). Com a tricúspide no meio de outros achados, a conduta (`impTricuspideConduta`) vai no fim da linha. A chave da linha é `achados-` mais as chaves dos achados, então uma redação feita à mão cai quando o conjunto muda. No corpo do laudo, a medida ou o achado alterado sai em itálico (`emSe()`). `sublinharRiscoAumentado()` sublinha "risco aumentado para cromossomopatias" e "risco aumentado (1:X) para pré-eclâmpsia" na impressão, depois do `escapeHtml`, e por isso vale também para a linha editada.

## CIUR na conclusão: só peso ≤ P3 ou diástole zero (2026-10-28)

Regra da Dra. Morgana, que **substitui** as seções "PIG vs CIUR: critérios menores" e "Fluxo diastólico da umbilical" acima: no `obstetrico.html` e no `morfologico-2trimestre.html`, a linha de peso da impressão só diz CIUR (`impPesoCIUR`) com percentil de peso ≤ 3 **ou** com diástole zero/reversa/intermitente na umbilical (`feto{uid}AuFluxo`, Doppler fetal marcado), com qualquer percentil, em qualquer IG e também em gemelar. Entre P3 e P10 é sempre PIG, mesmo com uterinas, IP umbilical, ACM ou RCP alterados: os critérios menores do Delphi saíram (com eles `calcAuPercentil`/`calcAcmPercentil`). O campo de estágio aparece pelo resultado do `render()` nos dois laudos. **O `curva-fetal` continua com os critérios menores** (`calcDiagnosticoFGR`): o relatório evolutivo pode dizer CIUR onde o laudo diz PIG, até ela decidir alinhar lá.

## Tireoide: LD, LE e istmo em três quadros (2026-10-28)

Pedido da médica. No card "Tireóide — Dimensões" de `tireoide-doppler.html`, lobo direito, lobo esquerdo e istmo são três `.bio-grupo` lado a lado (`.tir-lobos`, grade de 3 colunas, uma só abaixo de 720px), cada um com longitudinal, AP, transversal e volume; o volume total fica num quadro largo embaixo (`.tir-total`). Ids, laudo, Word, rascunho e o volume total iguais aos da `main` (`conferir-por-id.mjs`, 5 cenários, mais um teste em branco, preenchido e recarregado).

## TN: Doppler em três quadros lado a lado (2026-10-28)

Pedido da médica. No card Doppler do `obstetrico-tn-doppler-colo.html`, "Artérias uterinas", "Válvula tricúspide" e "Ducto venoso" ficam em três colunas (`.bio-grupos.bio-tres`, CSS compacto só ali). A tricúspide saiu de dentro do quadro do ducto venoso: virou um quadro por feto (`fetoTricuspideHTML()`, mesmo id `feto{uid}TricuspideWrap`) na coluna `#tricuspideFields`, que só aparece com `chkTricuspide`; remover feto, "Limpar" e o rascunho limpam as duas colunas. O checkbox da tricúspide subiu para antes dos quadros. Laudo, Word e rascunho iguais aos da `main` (`conferir-por-id.mjs`: só a lista de ids mudou, pelo `#tricuspideFields` novo).

## Abdome: fígado com cistos e hemangiomas em lista, doença policística e volume na cirrose (2026-10-28)

Pedido da médica: ao escolher cisto ou hemangioma no "Aspecto" do fígado, a frase-base (dimensões, parênquima, veias) sumia inteira. Cisto e hemangioma saíram do `figadoAspecto` e viraram as caixas `chkFigadoCisto`/`chkFigadoHemangioma`, cada uma com lista (`figado{Cisto|Hemangioma}{uid}Segmento/Tamanho`, uid próprio, `figadoLesaoUids()`/`addFigadoLesao()`; o primeiro item nasce no `change` da caixa). As lesões **somam-se** à descrição do aspecto escolhido: no normal e na cirrose o "sem identificação de lesões intraparenquimatosas" dá lugar às frases das lesões; na esteatose entram depois do "dificultando a avaliação...". Um item: frase única; dois: plural com "respectivamente"; três ou mais: abertura "descritas abaixo" e a lista `- Cisto 1:` / `- Nódulo 1:` em bloco próprio (`figadoCistosLista`, `figadoHemangiomasLista`). Conclusão: `impFigadoCisto`/`impFigadoCistos`, `impFigadoHemangiomaUm`/`impFigadoHemangiomas` (a antiga `impFigadoHemangioma`, com "(s)", saiu).

- **Doença policística** é opção do Aspecto (`policistica`), com volume e o maior cisto (segmento/tamanho, opcionais); a caixa de cisto some nesse caso. Conclusão `impFigadoPolicistica`, ou `impFigadoPolicisticaHepatomegalia` com volume aumentado ou lobo acima do VR.
- **Cirrose** ganhou `figadoCirroseVolume` (normais/aumentadas); aumentado (ou lobo acima do VR) sai `impFigadoCirroseHepatomegalia` numa linha só, sem o "Hepatomegalia." à parte. A frase foi revisada: "forma anatômica, contornos serrilhados e bordas arredondadas. Parênquima com ecotextura fina e difusamente heterogênea".
- **Rascunho:** guarda `figadoUids`; rascunho antigo com Aspecto "cisto"/"hemangioma" volta como Aspecto normal + caixa marcada + item 1 com os valores de antes.
- Normal, esteatose (todas as variações) e "Outro" sem lesão saem byte a byte iguais aos da `main` (conferido no Chromium); só a cirrose mudou de texto.

## Rins: achados numa janela, como o Aspecto do fígado (2026-10-28)

Pedido da médica: os checkboxes de cada rim (normal, cálculo, cisto, leite de cálcio, nódulo, hidronefrose...) ocupavam o cartão. Agora cada rim tem um botão "Achados do rim direito: N marcados ▸" que abre uma janela (`#modal_rinsD` / `#modal_rinsE`, montada em `atualizaBotaoRins()` e no bloco "Rins: achados numa janela" do script). A janela é só mover o DOM: ids, listeners, rascunho e conclusão são os mesmos. Fecha por "Concluir", clique fora ou Esc. O botão conta os achados marcados (sem o "Normal") e atualiza no `render()`.

## Obstétrico de 1º trimestre: saco, VV e embrião lado a lado (2026-10-28)

Pedido da médica. No card de cada saco (`sacoCardHTML()`), "Saco gestacional", "Vesícula vitelínica" e "Embrião" são três quadros numa grade de 3 colunas (`.saco-linha`, id `saco{uid}Linha`, CSS compacto como o dos lobos da tireoide; uma coluna abaixo de 720px). O quadro "Vesícula vitelínica e embrião" virou dois. Com um embrião, `.saco-embrioes` e `.emb-bloco` ficam `display:contents` e os dois quadros dele são a 2ª e a 3ª coluna; com mais de um, `renumberEmbrioes()` põe `.saco-multi`: o saco fica em cima e cada embrião é uma coluna com VV e embrião empilhados. Ids, laudo, Word e rascunho iguais aos da `main` (`conferir-por-id.mjs`: só a lista de ids mudou, pelo `saco{uid}Linha`).

## Obstétrico de 1º trimestre: um card "Gestação" (2026-10-28)

O Presente/Ausente do saco saiu do próprio card e entrou no card "Gestação", depois do tipo de gestação e antes do quadro de mola (`wrap_sacoPresenteBloco`, que some em mola). Os cards dos sacos ganharam título na tela só como "Saco 1", "Saco 2"... — o rótulo impresso ("Saco gestacional / embrião") não mudou, porque `sacoLabel()` alimenta o laudo.

"Tipo de gestação" e "Saco gestacional" (Presente/Ausente) ficam lado a lado no card Gestação, em duas colunas de `.bio-grupos`, como a Impressão diagnóstica. Em telas estreitas empilham sozinhos.

## Obstétrico de 1º trimestre: anexos e colo uterino no mesmo card (2026-10-28)

"Regiões anexiais" e "Colo uterino" são um card só, com dois quadros lado a lado (`.bio-grupos` > `.bio-col`), como a Impressão diagnóstica. O checkbox `chkColo` e `coloFields` ficaram dentro do quadro do colo, com os mesmos ids. Laudo, Word e rascunho iguais aos da `main` (`conferir-por-id.mjs`). Em tela estreita o layout empilha, mas a página já tinha rolagem horizontal ali antes desta mudança (conteúdo de 456px em 390px), que não foi tratada aqui.

"Morfológico do 1º trimestre" (período recomendado) saiu do quadro próprio e ficou como checkbox simples dentro do card de Impressões diagnósticas, com os dois campos de período logo abaixo (ids iguais). Laudo, Word e rascunho iguais aos da `main`.

## Abdome: fígado, vesícula e rins em quadros lado a lado (2026-10-28)

Pedido da médica. Fígado: "Aspecto" (aspecto, campos condicionais, cistos/hemangiomas) à esquerda; "Medidas" (lobos) e "Esteatose (QUS)" à direita. Vesícula: "Vesícula biliar" e "Hepatocolédoco" lado a lado. Rins: um quadro por rim, com a medida em cima e o botão dos achados logo abaixo (a janela de achados não mudou; o botão continua entrando antes da `.achado-grid`). Também entrou `.field.bio-linha.conditional{display:none}`: sem ela, "Descreva o achado" (fígado e vesícula) aparecia mesmo com Aspecto normal, porque `.field.bio-linha{display:grid}` vencia o `.conditional`. Outros laudos têm o mesmo CSS sem essa regra; não foram mexidos. Ids, laudo, Word e rascunho iguais aos da `main` (`conferir-por-id.mjs`, 5 cenários).

## Transvaginal: card Útero em quadros, medidas num campo só (2026-10-28)

Pedido da médica (opção A de duas). O card Útero tem duas colunas: à esquerda "Útero" (posição, VR, morfologia 3D, medidas e volume) e "Miométrio" (aspecto, miomas, adenomiose); à direita "Endométrio" (com sinéquias e pólipo endometrial) e "Outros achados" (istmocele, pólipo endocervical, DIU, hematométrio). No celular vira uma coluna só. As três medidas do útero viraram **um campo**, `uteroMedidas` ("6,8 x 2,6 x 5,2"; aceita ×, *, ponto e só espaços), lido por `uteroMedidasPartes()` no `render()`: `uteroL`/`uteroAP`/`uteroT` deixaram de existir. Campo com menos de três medidas conta como pendente. `draftRestore()` junta as três medidas de rascunho antigo. Todos os outros ids ficaram iguais; laudo idêntico ao da `main` com os mesmos valores (conferido no Chromium, inclusive com rascunho antigo recarregado). `testar-laudos.mjs`/`conferir-por-id.mjs` vão acusar a troca de ids nesse laudo. `reserva-ovariana.html` continua com os três campos.

## Útero e ovários: medidas num campo só, ovários lado a lado com o Aspecto embaixo (2026-10-28)

Continuação do card Útero do transvaginal (seção anterior), a pedido da médica. Em `transvaginal`, `reserva-ovariana`, `rastreamento-ovulacao`, `monitorizacao-folicular-fiv` e `perineal` os ovários ficam lado a lado e o Aspecto (com a "alteração adicional", cistos, folículos dominantes da FIV) fica dentro do quadro de cada ovário (`.ov-aspecto`); `pelvico-infantil` só ganhou o campo único do útero (seus ovários já eram quadros com "Dimensões" num campo). `reserva-ovariana` recebeu o card Útero em duas colunas igual ao do transvaginal. As medidas L x AP x T de útero e ovários são **um campo** (`uteroMedidas`, `ovD_medidas`, `ovE_medidas`; os ids `uteroL/AP/T` e `ov{D,E}_L/AP/T` deixaram de existir; `wrap_ovD_medidas`/`wrap_ovE_medidas` continuam como wrappers). `medidasPartes()` e `juntarMedidasRascunho()` moram no `laudo-core.js` (a cópia local do transvaginal saiu); `draftRestore()` de cada laudo converte rascunho antigo. Limite conhecido: não há como deixar uma medida do meio em branco ("2 x  x 1,5" vira L=2, AP=1,5). Laudo e rascunho antigo conferidos iguais aos da `main` em Chromium; `testar-laudos.mjs`/`conferir-por-id.mjs` acusam a troca de ids.

## Perineal: Endométrio dentro do Útero, Hiato genital ao lado do gap uretral (2026-10-28)

Pedido da médica. O card "Endométrio" do `perineal.html` deixou de existir: o quadro (espessura, textura, padrão) é um terceiro quadro do card Útero (quebra para a linha de baixo em tela de largura normal) e o "Pólipo endometrial" entrou nas "Alterações adicionais" do Útero. O quadro "Hiato genital" saiu do card "Compartimento médio" e ficou lado a lado, no card "Períneo", com o novo quadro "Gap uretral" (direito e esquerdo, com VR e aviso de valor acima). Todos os ids, o laudo impresso e o rascunho são iguais aos da `main` (conferido no Chromium, 2 cenários, com recarga do rascunho).

## Rastreamento de ovulação: Aspecto do útero ao lado das medidas (2026-10-28)

Pedido da médica: no `rastreamento-ovulacao.html` o quadro "Aspecto" (select, nódulos de mioma, adenomiose e a descrição do achado) fica ao lado de "Medidas do útero", no mesmo `.bio-grupos`. Ids, laudo e rascunho iguais aos da `main` (Chromium, 2 cenários).

## Pélvico infantil: Endométrio dentro do Útero (2026-10-28)

Pedido da médica, como já feito no perineal. O card "Endométrio" do `pelvico-infantil.html` deixou de existir: o quadro (espessura máxima, aspecto) é um terceiro `.bio-col` do card Útero, e a descrição do achado e o checkbox "Cavidade uterina virtual" vêm logo depois de "Textura e contornos". Ids, laudo e rascunho iguais aos da `main` (Chromium: `#paper` idêntico preenchendo útero e endométrio; lista de ids igual).

## Perineal: Alterações adicionais em quadro ao lado do Endométrio (2026-10-28)

Pedido da médica. No card Útero do `perineal.html`, as "Alterações adicionais" (adenomiose, istmocele, pólipo endocervical, pólipo endometrial) saíram do fim do card e viraram o quarto quadro do `.bio-grupos`, depois do Endométrio (na linha de baixo, ao lado dele, quando a largura permite; em tela estreita empilha). "Textura miometrial" e os miomas continuam abaixo. Ids, laudo e rascunho iguais aos da `main` (Chromium: `#paper` idêntico com os quatro achados marcados; lista de ids igual).

## Morfológico do 1º trimestre: Idade gestacional ao lado de Gestação (2026-10-28)

Pedido da médica. Os cards "Idade gestacional" e "Gestação" ficaram lado a lado, dentro de um `div.cards-par` (flex com quebra; abaixo de cerca de 720px empilham). São dois cards independentes, não um só: cada um mantém o próprio cabeçalho. Ids, laudo, Word e rascunho iguais aos da `main` (`conferir-por-id.mjs`, 5 cenários).

## Cervical em quadros (2026-10-28)

Pedido da médica. No `cervical-doppler.html`, "Dados do exame" usa o quadro da paciente (nome em cima; data e médico em duas colunas), "Ao exame" e "Estudo Doppler" viraram um quadro cada, e os linfonodos ficam em duas colunas (direita/esquerda), um quadro por linfonodo, com o menor eixo na primeira linha. CSS `bio-*` copiado no `<style>` (mais `.linfo-*`). Ids, laudo, Word e rascunho iguais aos da `main` (`conferir-por-id.mjs`, 5 cenários).

**Remover linfonodo (2026-10-28, pedido da médica):** cada quadro de linfonodo tem "✕ Remover" no título, sempre visível (antes o botão sumia quando o lado tinha um linfonodo só, e não havia como apagá-lo). Removido o último dos dois lados, `temLinfonodo` desmarca e o laudo volta a "Ausência de sinais de linfonodomegalia.".

## Nome e data do exame na mesma linha (2026-10-28)

Pedido da médica, nos dezesseis laudos com formulário. `nomePaciente` e `dataExame` ficam lado a lado dentro de `.bio-nome-data` (grade `1fr 150px`, rótulo em cima da caixa nos dois; empilham só abaixo de 360px). Nos laudos com o quadro "Paciente e exame" a data saiu de `.bio-grade2`, que fica com o resto (CPF, médico, G/P/A, idade); quando sobra um campo só (cervical, perineal), ele ocupa a linha inteira (`.bio-grade2 > .field:only-child`). Nos de medicina interna (abdome, mamas, rins, tireoide) o `<div>` que já juntava os dois ganhou a classe. CSS copiado no `<style>` de cada arquivo. Ids, laudo, Word e rascunho iguais aos da `main` (`conferir-por-id.mjs`).

## Transvaginal com Doppler: uma caixa, não um laudo à parte (2026-10-28)

Pedido da médica. Em "Dados do exame" do `transvaginal.html`, a caixa `chkDoppler` ("Exame com Doppler") muda o título para "ULTRASSOM TRANSVAGINAL COM DOPPLER" (também "PÉLVICO"/"3D COM DOPPLER"; o nome do arquivo ganha "com Doppler") e mostra os campos: no quadro Endométrio, a vascularização pelo escore de cor do IETA (`endoDopplerVasc`, 1 a 4) e o padrão vascular (`endoDopplerPadrao`, só com escore 2 a 4); em cada ovário, o fluxo do parênquima (`ov{D,E}_dopplerFluxo`) e IR/IP opcionais. As frases (`endoDopplerAusente`/`Presente`, `ovarioDoppler`/`ovarioDopplerAusente`) entram no fim do parágrafo do endométrio e de cada ovário. A visibilidade é decidida no `render()`. Sem a caixa marcada o laudo sai byte a byte igual ao de antes. A impressão diagnóstica não ganhou linha de Doppler. Os termos clínicos foram propostos por Claude e ainda esperam confirmação da médica.

## Morfológico de 1º trimestre: achados prontos por segmento e higroma (2026-10-28)

Em cada segmento marcado "Alterado", a caixa de descrição traz o seletor "Inserir achado pronto…" (`MORFO_PRONTOS`, `feto{uid}{Seg}Pronto`): preenche a descrição (corpo) e o resumo (conclusão) e **volta ao título**, então o rascunho não guarda a escolha e a restauração não reescreve texto editado. Pergunta antes de substituir descrição já escrita à mão. Trechos `[entre colchetes]` são para completar; não há rede que os detecte. Sem conduta nos achados maiores, a pedido da médica; cisterna magna/fossa posterior aumentada fica para o 2º trimestre; megabexiga sem faixas. O higroma cístico é um select no quadro da TN (`feto{uid}Higroma`): linha na tabela de marcadores e achado "Higroma cístico" na conclusão (`impAchadoHigroma`).

## Morfológico 2º/3º: achados prontos por segmento (2026-10-28)

Pedido da médica: o mesmo seletor "Inserir achado pronto…" do 1º trimestre, com lista própria do 2º trimestre (`MORFO_PRONTOS` do `morfologico-2trimestre.html`, `feto{uid}{Seg}Pronto`): ventriculomegalia, cisterna magna aumentada (a regra dela: fica para o 2º trimestre), Dandy-Walker/hipoplasia do vermis, agenesia do corpo caloso, sinais de Arnold-Chiari II, holoprosencefalia, encefalocele, cisto de plexo coroide; fendas, retromicrognatia, hipo/hipertelorismo, osso nasal; espinha bífida, hemivértebra; hérnia diafragmática, MPVAC/sequestro, derrame pleural, cinco achados cardíacos (com "Sugere-se ecocardiografia fetal" na conclusão); onfalocele, gastrosquise, pelve renal, rim multicístico, agenesia renal, dupla bolha, intestino hiperecogênico, megabexiga, estômago não visualizado; pé torto, redução de membro, polidactilia, mãos cerradas, displasia esquelética. Mesmo comportamento do 1º: preenche descrição e resumo, volta ao título (não vai no rascunho) e pergunta antes de substituir descrição escrita à mão; a frase padrão dos membros do 3º trimestre conta como não escrita. São duas listas (1º e 2º), sem código comum; o texto clínico foi escrito por Claude e espera revisão da médica.

## Morfológico 2º/3º: Idade gestacional ao lado de Gestação (2026-10-28)

Pedido da médica: o mesmo `div.cards-par` do 1º trimestre (#347), com o CSS copiado no `<style>`. Os cards "Idade gestacional" (Datação) e "Gestação" (Tipo de gestação) ficam lado a lado e empilham em tela estreita. O 2º trimestre nunca tinha recebido esse wrapper: o #347 mexeu só no 1º. Ids, laudo e rascunho não mudaram (só HTML de layout).

**TN e obstétrico de 2º/3º trimestre, no mesmo dia (pedido da médica):** `obstetrico-tn-doppler-colo.html` e `obstetrico.html` ganharam o mesmo `div.cards-par` em volta de "Idade gestacional" e "Gestação", com o CSS copiado no `<style>`. Ids, laudo e rascunho inalterados.

## Obstétrico: Doppler materno e fetal lado a lado (2026-10-28)

Pedido da médica. No card "Doppler" do `obstetrico.html`, as duas caixas (`chkDopplerMaterno`, `chkDopplerFetal`) e seus campos ficam em duas `.bio-col` de um `.bio-grupos.doppler-lado`: materno (Artérias uterinas) à esquerda, fetal (um quadro por feto em `#dopplerFetalFields`) à direita; empilham abaixo de 720px. Saiu o `<hr>` entre eles. Ids, laudo, Word e rascunho iguais aos da `main` (`conferir-por-id.mjs`, 5 cenários).

## Cervical: Doppler dentro de cada linfonodo (2026-10-28)

Pedido da médica: no `cervical-doppler.html` o Doppler é característica de cada linfonodo, não um card à parte. Cada quadro de linfonodo tem o select `linfo{uid}Doppler` ("Normal (vasos partindo do hilo)" / "Caótica"), e a frase do linfonodo termina com "com vascularização normal ao Doppler, com vasos partindo do hilo" ou "com vascularização caótica ao Doppler". Caótica torna o linfonodo suspeito (entra em `impLinfonodoSuspeito`) e tira "Estudo Doppler dentro da normalidade" da conclusão. O card "Estudo Doppler" (`vascularizacaoAspecto`/`vascularizacaoDescricao`) e o bloco "ESTUDO DOPPLER:" do laudo saíram. Rascunho antigo volta com Doppler normal em cada linfonodo.

## Nome, CPF e data do exame na mesma linha; pélvico infantil sem CPF (2026-10-29)

Pedido da médica. Nos laudos que têm CPF (`transvaginal`, `reserva-ovariana`, `rastreamento-ovulacao`, `monitorizacao-folicular-fiv`, `obstetrico`, `obstetrico-1trimestre` e os dois morfológicos), `cpfPaciente` saiu de `.bio-grade2` e entrou em `.bio-nome-data.com-cpf`, entre o nome e a data (grade `1fr 150px 150px`; abaixo de 560px o nome ocupa a linha de cima e CPF e data dividem a de baixo). Ids iguais. `perineal` e `obstetrico-tn-doppler-colo` não têm campo de CPF e continuam com nome e data. No `pelvico-infantil.html` o campo de CPF foi retirado (não ia para o laudo nem para o Supabase; saiu também o listener da máscara).

## Abdome: bexiga, grandes vasos e baço lado a lado (2026-10-29)

Pedido da médica. Os três cards (`cardBexiga`, `cardVasos`, `cardBaco`) ficam numa linha, dentro de `div.cards-tres` (flex, cada card com base de 200px, CSS compacto só ali; uma coluna abaixo de 720px). Continuam três cards separados, de propósito: `setCardVisible()` esconde bexiga e vasos fora do abdome total e o baço no modo `hd`, e com um card só visível ele ocupa a linha inteira. Os selects ficam com o rótulo em cima e a opção longa aparece cortada quando fechada (inteira ao abrir). Ids, laudo, Word e rascunho iguais aos da `main` (`conferir-por-id.mjs`, 5 cenários).

## Istmocele: referência "VR > 50%" (2026-10-29)

A frase da istmocele dizia "(VR < 50%)", ao contrário: a razão EMR ÷ EMA × 100 (arredondada) é normal acima de 50% e indica afilamento importante quando fica em 50% ou menos. Hoje sai "(VR > 50%)", e o percentual ≤ 50% vai em itálico no próprio `render()`. `italicizarAcimaVR()` ignora VR de limite inferior, e antes punha em itálico justamente o caso normal. A chave da frase mudou de `istmocele` para `istmoceleRelacao` (`ph_istmoceleRelacao`), porque o "Salvar frases" guarda a antiga no navegador e esconderia o conserto. Mudou em `transvaginal`, `reserva-ovariana`, `rastreamento-ovulacao` e `perineal`. A conclusão (`impIstmocele`, frase fixa) não mudou e não olha o percentual.

## Gestação ectópica (2026-10-30)

Pedido da médica. Caixa `chkEctopica` com lado (`ectopicaLado`), medida (`ectopicaMedida`, obrigatória), volume (`ectopicaVolume`, opcional: sem ele a frase sai `ectopicaSemVolume`), embrião (`ectopicaEmbriao`: não identificado, com ou sem batimentos) e líquido livre (`ectopicaLiquido`). Mesmas chaves de frase nos dois laudos; a conclusão abre com `impEctopica`/`impEctopicaEmbriaoBcf`/`impEctopicaEmbriaoSemBcf` e, com líquido, `impEctopicaLiquidoLivre`.
- **`transvaginal.html`**: no topo do card Região Anexial; o parágrafo entra depois dos ovários e tira "Regiões anexiais sem evidência de lesões...". O `ectopicaLiquido` é espelho do `liquidoLivre` de sempre (os dois selects andam juntos), e a frase e as medidas do líquido continuam saindo do bloco `liquidoLivre`.
- **`obstetrico-1trimestre.html`**: no quadro "Tipo de gestação", como a mola: alternativa exclusiva (`gestacaoFlags()`; marcar uma desmarca a outra, e a ectópica manda sobre o saco "ausente"). Esconde sacos, sem IG/DPP/evolução na conclusão, sem a recomendação do morfológico, e não salva na Curva. O laudo diz "Cavidade uterina sem imagem de saco gestacional", o parágrafo da ectópica e o líquido livre (`ectopicaLiquido*`, volume opcional em `ectopicaLiquidoVolume`); "Regiões anexiais sem alterações" só sai se ela descreveu outro achado anexial.
- Desmarcada, os dois laudos saem byte a byte iguais aos da `main` (conferido no Chromium). Texto clínico das frases escrito por Claude, aguardando revisão da médica.

## Obstétrico de 1º trimestre: IG da conclusão pela cronologia; IG pela USG só com DUM discordante (2026-10-30)

Pedido da médica: com a DUM concordante a conclusão saía "____ semanas", porque `{IG}` vinha sempre do campo digitado "Idade gestacional pela USG" (`impSemanas`/`impDias`). Esse campo saiu do quadro Datação e foi para o card Impressões diagnósticas, logo abaixo do seletor da DUM (`wrap_impIg`), e só aparece com DUM discordante (seletor visível, ou seja, embrião identificado) ou DUM incerta/ignorada (`usaIgInformada` no `render()`, que também decide DPP e período do morfológico). Nos outros casos (DUM concordante, 1º ultrassom, FIV) a IG da conclusão, de óbito/anembrionada e o corte precoce/tardia saem da própria cronologia na data do exame. A caixa "Incluir medida do colo uterino no laudo" (`chkColo`/`coloFields`) foi para dentro do quadro Útero; o card de anexos virou "Regiões anexiais". Ids iguais, rascunho volta igual.

**Datação em card próprio, ao lado de Gestação (2026-10-30, pedido da médica):** o quadro Datação saiu do card "Dados do exame" e virou o card "Idade gestacional", dentro de um `div.cards-par` com o card "Gestação" (mesmo CSS do `obstetrico.html`), como nos outros laudos obstétricos. A caixa "Incluir recomendação de Morfológico do 1º Trimestre" e o período (`chkRecomendacao`, `wrap_recomendacao`) foram para o card Impressões diagnósticas, abaixo da IG pela USG. Ids iguais.

**DPP e período do morfológico fora da tela (2026-10-30, pedido da médica):** `dpp`, `dataInicioMorfo` e `dataFimMorfo` viraram `<input type="hidden">`. O `render()` continua calculando e preenchendo os três; a DPP só aparece na conclusão (DUM discordante/incerta) e o período só no laudo. A caixa `chkRecomendacao` continua em Impressões diagnósticas.

## Obstétrico de 1º trimestre: Datação e Tipo de gestação num card "Gestação" (2026-10-31)

Pedido da médica. Os cards "Idade gestacional" e "Gestação" (que ficavam lado a lado num `div.cards-par`) viraram um card só, "Gestação", com dois `.bio-col`: Datação à esquerda; Tipo de gestação, mola, ectópica e o quadro "Saco gestacional" (presente/ausente) à direita. O título do card de cada saco na tela passou a "Saco gestacional, embrião e VV" (com " — Saco N" quando há mais de um); o rótulo impresso (`sacoLabel()`) não mudou. Ids, laudo e rascunho iguais aos da `main` (`conferir-por-id.mjs`, 5 cenários). Nos cinco laudos obstétricos, as colunas fixas de `bio-sel`/`bio-sel-larga`/`bio-data` são `minmax(0,Npx)` e input/select de `.bio-linha` têm `min-width:0`, para nenhum campo passar da borda do quadro em card estreito (PR #368).

## Obstétrico de 2º/3º trimestre: Datação e Tipo de gestação num card "Gestação" (2026-10-31)

Pedido da médica, igual ao do 1º trimestre (#369). Os cards "Idade gestacional" e "Gestação" do `obstetrico.html`, que ficavam lado a lado num `div.cards-par`, viraram um card só, "Gestação", com dois `.bio-col`: à esquerda Datação e o quadro "Morfológico — recomendação"; à direita Tipo de gestação (número de fetos, corionicidade). O CSS `.cards-par` saiu deste arquivo (não era usado em mais nada). Rótulos dos campos, ids, laudo e rascunho iguais aos da `main`.

## Óbito fetal na conclusão: "Decesso fetal compatível com {IG}" (2026-10-31)

Pedido da médica, com a frase dela. No `obstetrico.html`, o feto com batimentos ausentes (PR #372) sai na conclusão como "Decesso fetal compatível com 20 semanas e 3 dias." (`impDecessoFetal`) e, na múltipla, "Decesso fetal (Feto 1) compatível com ..." (`impDecessoFetalFeto`). A IG é a da cronologia do laudo (`state.ig`). Chaves novas em vez de mudar `impObitoFetal`/`impObitoFetalFeto` (saíram), pelo motivo de sempre: "Salvar frases" guardaria a antiga. Só o `obstetrico.html` tem batimentos ausentes por feto; o óbito embrionário do 1º trimestre ("Perda gestacional...") não mudou. Com algum feto em óbito, "Gestação com boa evolução." não sai da conclusão (pedido da médica, mesmo dia), inclusive na gemelar com um feto vivo.

## Rins: saiu o select "Indicação clínica" (2026-11-01)

Pedido da médica. O select `lateralidadeDor` (Sem dor / Dor à direita / à esquerda / bilateral) do card "Dados do exame" do `rins-vias-urinarias.html` saiu, com o bloco `indicacao` que imprimia "Dor à esquerda." antes de "Ao exame:". O motivo vai no campo `motivoExame`. Rascunho antigo com a chave volta normal (o campo é ignorado). Os outros laudos não mudaram.

## Morfológico 2º/3º: cerclagem na conclusão do colo (2026-11-01)

Pedido da médica. No `morfologico-2trimestre.html`, com "Cerclagem realizada" (`cerclagemRealizada`) marcada e o colo não curto (≥ 25 mm), a linha do colo na impressão diagnóstica sai `impColoCerclagem` ("Cerclagem tópica sem sinal do afunilamento.") no lugar de `impColoNormal`, com chave de linha própria (`colo-cerclagem`). Colo curto continua `impColoAlterado`, com ou sem cerclagem; sem cerclagem nada muda. O corpo do laudo não mudou (a frase `coloTexto` já afirma a ausência do afunilamento). O 1º trimestre, o TN e o obstétrico não foram mexidos.
