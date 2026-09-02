# laudos-dramorgana

Laudos personalizados de ultrassonografia — Dra. Morgana Kummer. Cobrem três áreas: medicina interna, ginecologia e obstetrícia.

Cada laudo é um arquivo HTML (sem build) que carrega, ao lado, o `laudo-core.js` — o motor comum a todos: paginação da impressão, ajuste automático de fonte e entrelinha, barra de formatação, rascunho automático, máscara de CPF e validação de decimais. Consertar qualquer uma dessas coisas é **uma edição só, no `laudo-core.js`, valendo para todos os laudos**; o que é de um laudo só (as medidas, as impressões diagnósticas, o texto) continua dentro do `.html` dele. O `CLAUDE.md` explica a divisão.

Como o motor é um arquivo à parte, o `.html` não abre mais sozinho fora da pasta do projeto: aberto solto, ele mostra um aviso dizendo que falta o `laudo-core.js`. Pelo endereço da clínica no navegador os dois estão sempre juntos.

`index.html` lista os laudos disponíveis, agrupados por categoria (Medicina Interna, Ginecológico, Obstétrico); cada laudo também tem um dropdown no cabeçalho ("Trocar de laudo"), agrupado da mesma forma, para navegar entre eles.

## Arquivos
- `laudo-core.js` — o motor compartilhado por todos os laudos (ver `CLAUDE.md`)

## Laudos disponíveis

### Medicina Interna
- `abdome-total.html` — Ultrassonografia de Abdome Total (fígado, vesícula e vias biliares, pâncreas, rins, bexiga, grandes vasos abdominais e baço; inclui quantificação de esteatose hepática pelo método QUS, com grau calculado automaticamente a partir do % de gordura informado). Sem CPF e sem integração com a Curva de Crescimento — não tem feto, nada a gravar em `patients`/`gestacoes`/`exams`.
- `rins-vias-urinarias.html` — Ultrassonografia dos Rins e Vias Urinárias (rim direito e esquerdo, bexiga e volume urinário pré e pós-miccional). Mesma observação: sem CPF, sem integração com a Curva de Crescimento.
- `tireoide-doppler.html` — Ultrassonografia da Tireóide com Estudo Doppler (lobo direito, lobo esquerdo e istmo, com volume de cada porção calculado automaticamente pela fórmula do elipsoide — comprimento × AP × transversal × 0,523 — e volume total somando os dois lobos; padrão de vascularização e velocidade da artéria tireoidea inferior ao Doppler). Mesma observação: sem CPF, sem integração com a Curva de Crescimento.

### Ginecológico
- `transvaginal.html` — Ultrassonografia Transvaginal
- `rastreamento-ovulacao.html` — Ultrassonografia Transvaginal para Rastreamento de Ovulação (útero, ovários e acompanhamento folicular visita a visita, até a identificação do corpo lúteo)
- `pelvico-infantil.html` — Ultrassonografia Pélvica Infantil (propedêutica de puberdade precoce)

### Obstétrico
- `obstetrico-1trimestre.html` — Ultrassonografia Obstétrica de 1º Trimestre (translucência nucal)
- `morfologico-1trimestre.html` — Ultrassonografia Morfológica de 1º Trimestre (marcadores de trissomias, Doppler das uterinas e rastreamento de pré-eclâmpsia)
- `obstetrico.html` — Ultrassonografia Obstétrica de 2º/3º Trimestre (feto único, gemelar ou trigemelar)
- `morfologico-2trimestre.html` — Ultrassonografia Obstétrica Morfológica de 2º Trimestre (avaliação morfológica fetal órgão a órgão, biometria estendida e cordão umbilical; feto único, gemelar ou trigemelar)
- `obstetrico-tn-doppler-colo.html` — Ultrassonografia Obstétrica com Translucência Nucal (biometria simples, TN e risco para Síndrome de Down sempre presentes; Doppler das artérias uterinas + ducto venoso e medida do colo uterino são cards opcionais, ativados conforme o pedido médico). Sem integração com a Curva de Crescimento — laudo isolado, como `transvaginal.html`.

## Gestação múltipla (`obstetrico.html`)
O laudo de 2º/3º trimestre atende de um a três fetos. O número de fetos é escolhido no card "Gestação"; cada feto ganha um card próprio, e o que é medido feto a feto se repete dentro dele: apresentação e vitalidade, biometria, placenta, líquido amniótico, Doppler fetal e perfil biofísico. O que é da mãe ou do útero aparece uma vez só — Doppler das artérias uterinas e medida do colo.

Três detalhes valem ser preservados em qualquer mexida futura aqui:
- **Cada card de feto guarda um `uid` estável** (mesmo padrão dos sacos gestacionais do 1º trimestre e dos nódulos de mioma do transvaginal). Os ids dos campos (`feto3DBP`) e dos blocos do preview (`biometria-f3`) derivam desse uid, e não da posição na lista — assim, remover o feto do meio não recria os blocos dos outros, e o texto que a médica digitou à mão neles sobrevive.
- **As chaves das impressões diagnósticas são sufixadas por feto** (`peso-f2`) quando há mais de um. Sem isso, marcar/desmarcar ou reescrever um item afetaria o item homônimo do outro feto. Ao remover um feto, `renderChecklist` descarta as chaves órfãs dele em `checkedState` e `impressaoOverrides`.
- **A ordem do laudo é a mesma de sempre**: biometria antes de Doppler e PBF. Com feto único, as duas tabelas de Doppler (materna e fetal) continuam saindo lado a lado logo depois do líquido amniótico, exatamente como antes; com mais de um feto, a fetal entra dentro de cada feto e a materna — que é da mãe — sai uma vez só, depois de todos.
- **Doppler fetal e PBF continuam sendo escolhas únicas do laudo** (marcadas uma vez, nos cards "Doppler" e "Perfil biofísico fetal", porque definem o título do laudo), mas seus campos são preenchidos dentro de cada feto.
- **Doppler fetal e PBF normais em TODOS os fetos viram uma única frase na conclusão** ("Não há sinais de centralização de fluxo em ambos/todos os fetos.", "PBF de ambos/todos os fetos: 8/8.") em vez de uma linha repetida por feto — "ambos" com 2 fetos, "todos" com 3. Basta um feto com Doppler alterado, RCP abaixo do P5 ou PBF diferente de 8/8 para o item mesclado sumir e cada feto voltar a ter sua própria linha (`buildImpressao()`, chaves `doppler-fetal-todos`/`pbf-todos`).

O peso estimado em gramas aparece na biometria, **nunca na impressão diagnóstica**. Antes de 21 semanas a impressão traz só "Peso fetal dentro da normalidade" (o percentil de Hadlock não é confiável nessa faixa); a partir de 21 semanas ela traz "Peso fetal no percentil X (Hadlock)". Um percentil abaixo de 10 ou acima de 90 digitado pela médica continua virando o alerta de PIG/GIG em qualquer idade gestacional.

A discordância de peso — `(maior − menor) / maior × 100` — é calculada automaticamente a partir dos pesos estimados e entra como impressão diagnóstica; a partir de 20% ela vira o alerta de acompanhamento especializado. O rastreio de síndrome de transfusão feto-fetal em monocoriônicas ainda **não** está no laudo.

Ao salvar na Curva de Crescimento, uma gestação múltipla grava `tipo_gestacao: 'gemelar'` com a corionicidade escolhida e insere **um `exams` por feto**, numerados na coluna `feto` — igual ao laudo de 1º trimestre.

## Gestação múltipla (`morfologico-2trimestre.html`)
Mesmo mecanismo do `obstetrico.html` acima (`uid` estável por card de feto, chaves de impressão sufixadas por feto, um `exams` por feto na Curva de Crescimento) — a diferença é o que se repete dentro de cada feto: apresentação e vitalidade, biometria estendida (inclui `dof`, `umero`, `radio`, `ulna`, `tibia`, `fibula`, colunas que existem no `schema.sql` do `curva-fetal` mas que `obstetrico.html` não grava), placenta, cordão umbilical, líquido amniótico e a **avaliação morfológica fetal** — seis segmentos (Crânio/Cérebro, Face, Coluna vertebral, Tórax/Coração, Abdome, Membros fetais) descritos em `MORFO_SEGMENTOS`, cada um com texto padrão customizável e opção de marcar "Alterado" com descrição livre. Não há Doppler, PBF ou colo uterino neste laudo — o modelo da clínica não os inclui.

Sem nenhum segmento alterado em nenhum feto, a impressão traz a frase única "Ao exame morfológico não evidenciamos nenhuma anomalia estrutural...". Cada segmento marcado como alterado (com descrição preenchida) sobe como item próprio da impressão, prefixado por feto numa gestação múltipla — mesma lógica de `impMorfoAlterado` já usada em `morfologico-1trimestre.html`.

### Percentil no texto do laudo: sempre `(P34)`, nunca `(percentil 34)`
Qualquer percentil escrito dentro de uma frase do laudo (ILA, peso fetal etc.) usa a forma abreviada `(P` + número + `)` — ex.: `ILA: 23,0 cm (P34)`. Ao adicionar um novo percentil a um laudo (novo ou existente), siga esse mesmo formato em vez de escrever "percentil X" por extenso.

### Alinhamento vertical de uma linha de valores calculados com a tabela de medidas
O líquido amniótico (`table.grade-la`, dentro de cada bloco `la-f{uid}`) é uma linha de 2 células — "Maior bolsão: X cm" | "ILA: Y cm (PZ)" — que precisa cair na mesma coluna vertical da tabela `table.biometria` do mesmo feto (a 2ª célula, do ILA, deve começar onde começa a 3ª coluna da biometria, ou seja, onde começa "Comprimento femoral (CF):"). Como o rótulo "Maior bolsão:" é mais longo que "Diâmetro biparietal (DBP):" + valor somados, não dá para chutar essa largura em CSS fixo (`em` fixo) sem estourar a página ou desalinhar — por isso `alignIlaColumns()` mede ao vivo, no DOM, a largura das duas primeiras colunas da `table.biometria` daquele feto (`getBoundingClientRect()`) e aplica essa largura na 1ª célula da `table.grade-la`, sempre em **`em`** (nunca `px`): a impressão/PDF pode encolher a fonte do laudo inteiro para caber nas páginas (`autoFitPages`), e uma largura fixa em `px` ficaria descalibrada depois desse encolhimento, enquanto `em` acompanha a mudança de fonte porque as duas tabelas compartilham a mesma fonte. `alignIlaColumns()` roda no fim de todo `render()`, depois que os blocos já estão no DOM. Ao adicionar uma linha de valor calculado que precise alinhar com uma tabela de medidas em qualquer laudo (novo ou existente), reuse esse mesmo padrão — medir a largura real das colunas via DOM e aplicar em `em` — em vez de estimar a largura em CSS.

### Impressão/conclusão: alinhamento justificado com recuo suspenso
A lista de achados (`ul.impressao li` — "IMPRESSÃO", "CONCLUSÃO" ou "IMPRESSÕES DIAGNÓSTICAS", conforme o laudo) usa `text-align:justify` com um recuo suspenso: `padding-left:1em; text-indent:-1em`. O "* " que abre cada item fica fora do parágrafo (`text-indent` negativo), então quando a frase quebra de linha a continuação alinha com o começo do texto da linha de cima, não com o asterisco — que assim fica isolado numa coluna própria, mais visível. Vale nos seis laudos (`transvaginal.html`, `obstetrico-1trimestre.html`, `obstetrico.html`, `rastreamento-ovulacao.html`, `morfologico-1trimestre.html`, `morfologico-2trimestre.html`). O mesmo trio de propriedades precisa ser repetido no HTML gerado para o "Baixar Word" (`buildReportHtml()`): ali cada `<li>` vira um `<p>` (o importador de HTML do Word aplica marcador próprio em qualquer `<ul><li>`, ignorando `list-style:none`), então o `<style>` da página não chega a valer para esse trecho — os estilos saem inline no próprio `<p>` criado. Ao criar um laudo novo ou mexer nesse trecho, aplique os três estilos nos dois lugares.

### "Baixar Word": o Word ignora `line-height` herdado, copie elemento a elemento
O `.doc` baixado é HTML sem folha de estilo — só sobrevive o que está em `style=""` em cada elemento. Definir `line-height` só na `<div>` que envolve o laudo inteiro (como todo `buildReportHtml()` fazia originalmente) não basta: o Word não herda esse valor para dentro de `<p>`/`<table>`, e aplica no lugar a entrelinha do próprio estilo "Normal" dele — visualmente bem mais aberta que a da tela (relatado como "linhas com espaçamento de 1,5"). A correção, criada em `obstetrico-1trimestre.html` (commit "Faz o Word do 1º trimestre sair igual ao PDF") e hoje replicada nos sete laudos: `copyComputedToClone()` + a tabela `WORD_COPY` no topo de `buildReportHtml()` leem o `line-height` (e `font-size`/margens) já **calculado pelo navegador** em cada elemento vivo (`h3.doctitle`, `p.relato`, `h4.sec`, `p.linha`, `p.recomendacao`, `table.biometria` etc. — a lista varia conforme as classes que o laudo realmente usa) e gravam esse valor no `style=""` do elemento correspondente no clone, antes de montar o `.doc`. Os itens da impressão (`ul.impressao li`, convertidos em `<p>` à parte) também recebem o `line-height` calculado do `<li>` vivo. Ao criar um laudo novo ou adicionar uma classe de parágrafo/tabela nova ao corpo do laudo, inclua-a em `WORD_COPY` — senão aquele trecho especificamente volta a sair com a entrelinha do Word.

## Rascunho automático (não perder o laudo digitado)

Cada laudo se salva sozinho no navegador enquanto é digitado. Antes disso o
laudo só existia na tela até o "Imprimir / PDF" ou o "Baixar Word" — uma queda
de energia, um F5 sem querer ou a aba fechada por engano levavam junto tudo o
que já tinha sido preenchido.

Como funciona, em cada arquivo de laudo (o código é o mesmo nos três, adaptado
ao card que se repete de cada um — nódulos de mioma, fetos, sacos gestacionais):

- **Quando grava.** `draftSchedule()` é chamado no fim do `render()` (ou seja, a
  cada campo alterado) e no `input` do `#paper` (texto digitado direto no
  laudo), com um intervalo de 0,8 s desde a última tecla. `pagehide` e
  `visibilitychange` gravam na hora, sem esperar o intervalo — é a última
  gravação que ainda acontece com a aba fechando.
- **Onde grava.** `localStorage`, uma chave por laudo
  (`laudo-rascunho-transvaginal-v1` etc.), sempre no computador da médica —
  nada disso vai para servidor nenhum. Vai direto no `localStorage`, e não pelo
  `kvStore` das preferências, porque o `pagehide` precisa de gravação síncrona.
- **O que grava.** Todos os campos de `#formCol` (por id), os uids dos cards
  repetidos, `checkedState`, `impressaoOverrides`, `titleFontSize`, o
  `innerHTML` do `#paper` e o `lastBlockHtml`.
- **Como volta.** `draftInit()` fecha a cadeia `loadPhrases → loadVR →
  loadExecutanteSelecionado` (o laudo precisa das frases e dos valores de
  referência para ser remontado igual). Aparece um aviso "Rascunho recuperado"
  acima do laudo e um selo `#draftPill` com a hora da última gravação.
- **Quando some.** "Limpar" apaga o rascunho junto com o formulário
  (`draftDiscard()`), e um formulário em branco recém-aberto não chega a virar
  rascunho — `draftBaseline` guarda a assinatura do formulário vazio e o
  autosave apaga a chave em vez de gravar quando nada mudou.

Três pontos valem ser preservados em qualquer mexida aqui:

- **Os uids dos cards repetidos voltam iguais.** A restauração recria os cards
  com os mesmos uids gravados (e empurra `fetoNextUid`/`sacoNextUid`/
  `miomaNextUid` para depois deles) em vez de contar quantos eram: os ids dos
  campos, as chaves da checklist de impressões (`peso-f2`) e os ids dos blocos
  do preview derivam do uid, então recriar com uid novo desalinharia tudo.
- **`draftRestoring` desliga o `render()` durante a restauração.** Os valores
  são escritos direto nos campos e, em seguida, um `change` é disparado em cada
  select/checkbox só para reabrir os blocos `.conditional` — sem a trava, cada
  um desses eventos dispararia um `render()` inteiro. Os selects de quantidade
  (`miomaCount`, `numeroFetos`, `numeroEmbrioes`) ficam fora desse disparo,
  senão recriariam os cards que acabaram de voltar.
- **O `#paper` volta por cima do `render()`.** Primeiro o `render()` remonta o
  laudo a partir dos campos, depois o `innerHTML` salvo e o `lastBlockHtml`
  salvo são recolocados juntos — é isso que traz de volta o texto corrigido à
  mão dentro do laudo e mantém a reconciliação por bloco sabendo o que é texto
  gerado e o que é texto digitado.

## Adicionando um novo laudo
Os modelos de laudo já existem na clínica (a Dra. Morgana envia o modelo real usado — texto, foto ou arquivo). O fluxo é:
1. A Dra. Morgana envia o modelo do laudo que já usa na clínica.
2. Esse modelo é analisado (campos, frases-padrão, valores de referência, formatação) e usado como base para montar o app — **copiando o laudo de referência da mesma família** como ponto de partida (ver "Laudos de referência" abaixo): `obstetrico.html` para qualquer laudo obstétrico (tem feto), `transvaginal.html` para qualquer outro laudo pélvico (sem feto) — para manter cabeçalho, fontes, espaçamento, regras de impressão e o comportamento do preview consistentes.
3. Adiciona-se um card em `index.html`.
4. Adiciona-se uma `<option>` no `<select id="laudoSwitch">` de **todos** os laudos (inclusive o novo), apontando para o novo arquivo.

Obs: o `obstetrico-1trimestre.html` foi montado sem um modelo real da clínica como referência — vale revisar/ajustar campos e frases assim que o modelo correspondente for enviado.

## Laudos de referência: `obstetrico.html` e `transvaginal.html`
Cada laudo é um arquivo HTML independente — **não há CSS/JS compartilhado entre eles**. Isso significa que uma correção de layout ou de comportamento do preview feita em um arquivo **não se propaga automaticamente para os outros**; precisa ser replicada manualmente em cada um.

Dois laudos servem de referência de layout/comportamento para os demais, um por família: **`obstetrico.html`** para qualquer laudo obstétrico — tem feto (`obstetrico-1trimestre.html`, `morfologico-1trimestre.html`, `morfologico-2trimestre.html`) — e **`transvaginal.html`** para qualquer outro laudo pélvico — sem feto (`rastreamento-ovulacao.html`). `obstetrico.html` nasceu de uma cópia do `transvaginal.html` (ver "Adicionando um novo laudo" acima), então os dois já partem dos mesmos padrões de base; a divisão é sobre qual copiar ao criar um laudo novo, não uma diferença de comportamento entre eles. Ao corrigir um bug de layout, formatação ou preview em qualquer laudo, aplique a mesma correção nos demais arquivos `.html` de laudo — nas duas famílias, já que são convenções de UI genéricas, não específicas de conteúdo obstétrico ou pélvico — nesta mesma tarefa, em vez de deixar para depois.

Seis pontos presentes nos dois laudos de referência valem a pena preservar ao criar ou revisar qualquer laudo:
- **Preview do laudo (`#paper`) livre para edição, sem perder texto digitado à mão.** O `render()` não faz mais `paperEl.innerHTML = html` de uma vez só — ele monta uma lista de "blocos" (`blocks.push({id, html})`, um por parágrafo/seção) e chama `renderBlocks(blocks)`. Essa função só toca no elemento de um bloco quando o HTML calculado para ele muda desde a última vez; caso contrário, o nó (e qualquer texto ou formatação que a médica tenha digitado ali) fica intocado. Todo laudo novo deve seguir esse mesmo padrão em vez de reatribuir `innerHTML` inteiro a cada campo alterado.
- **Seleção de texto para espaçamento entre linhas / tamanho de fonte rastreada continuamente.** Em vez de capturar `window.getSelection()` só no `mousedown` do `<select>` (frágil — o timing do colapso da seleção ao mudar o foco varia entre navegadores), a última seleção real dentro de `#paper` é guardada via um listener de `selectionchange` e consumida quando o `<select>` dispara `change`.
- **Nome do arquivo salvo (Word e PDF) = nome da paciente + título do exame.** Todo laudo define `tituloExame()` (retorna o título do exame, incluindo variações como "com DIU", "Gemelar", "Trigemelar" — o que fizer sentido para aquele laudo) e `nomeArquivoLaudo()` (`sanitizeFilenamePart(nomePaciente) + ' - ' + tituloExame()`, com fallback `'Laudo - ' + tituloExame()` se o nome estiver vazio). O botão "Baixar Word" usa isso tanto no nome do arquivo (`saveBlobAs(blob, nomeArquivoLaudo()+'.doc')`) quanto no `<title>` embutido no `.doc` (`escapeHtml(nomeArquivoLaudo())`). Para o "Imprimir/PDF", como o navegador sugere o nome do arquivo a partir de `document.title`, os listeners `beforeprint`/`afterprint` trocam o título da página para `nomeArquivoLaudo()` e devolvem o título original (guardado em `tituloPagina` antes de registrar os listeners) depois de imprimir. Um laudo novo repete esse mesmo par de funções e os mesmos dois listeners, adaptando só o que entra em `tituloExame()`.
- **Campos relacionados no cabeçalho (`.id-card-row`) ficam próximos, não nas pontas opostas da linha.** Ex.: DUM e IG atual/Cronologia dividem a mesma `<span>`, separados por `&nbsp;&nbsp;&nbsp;` (três espaços), em vez de um em cada `<span>` da `id-card-row` (que os empurraria para as bordas esquerda/direita). Reserve `<span>`s separados numa `id-card-row` só para pares que não têm relação direta entre si (como Nome e Data).
- **O cartão do cabeçalho (`.id-card`) tem fundo cinza claro, borda grossa e cantos arredondados:** `background:#f2f0f1;border:2.5px solid #2b2b2e;border-radius:16px`. O mesmo valor é repetido no clone que o "Baixar Word" gera (`clone.querySelectorAll('.id-card').forEach(...)`), porque o `.doc` exportado não carrega o `<style>` da página — só os estilos inline aplicados ali valem. Ao mudar um, mude o outro.
- **A margem lateral do "Baixar Word" é 2cm, igual ao padding lateral da impressão.** Cada laudo injeta `<style>@page WordSection1{margin-left:2cm;margin-right:2cm;}</style>` no HTML exportado (no `obstetrico-1trimestre.html`, o mesmo valor entra pela string `WORD_PAGE_MARGIN`), porque o `.doc` sem `@page` cai na margem padrão do Word (~2,54cm nos quatro lados). Essa margem já foi fixada em 95px (~2,5cm) por engano — corrigida depois para 2cm nativo.
