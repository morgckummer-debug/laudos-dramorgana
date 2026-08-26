# laudos-dramorgana

Laudos personalizados de ultrassonografia obstétrica/ginecológica — Dra. Morgana Kummer.

Cada laudo é um arquivo HTML autônomo (sem build, abre direto no navegador). `index.html` lista os laudos disponíveis; cada laudo também tem um dropdown no cabeçalho ("Trocar de laudo") para navegar entre eles.

## Laudos disponíveis
- `transvaginal.html` — Ultrassonografia Transvaginal
- `obstetrico-1trimestre.html` — Ultrassonografia Obstétrica de 1º Trimestre (translucência nucal)
- `obstetrico.html` — Ultrassonografia Obstétrica de 2º/3º Trimestre (feto único, gemelar ou trigemelar)

## Gestação múltipla (`obstetrico.html`)
O laudo de 2º/3º trimestre atende de um a três fetos. O número de fetos é escolhido no card "Gestação"; cada feto ganha um card próprio, e o que é medido feto a feto se repete dentro dele: apresentação e vitalidade, biometria, placenta, líquido amniótico, Doppler fetal e perfil biofísico. O que é da mãe ou do útero aparece uma vez só — Doppler das artérias uterinas e medida do colo.

Três detalhes valem ser preservados em qualquer mexida futura aqui:
- **Cada card de feto guarda um `uid` estável** (mesmo padrão dos sacos gestacionais do 1º trimestre e dos nódulos de mioma do transvaginal). Os ids dos campos (`feto3DBP`) e dos blocos do preview (`biometria-f3`) derivam desse uid, e não da posição na lista — assim, remover o feto do meio não recria os blocos dos outros, e o texto que a médica digitou à mão neles sobrevive.
- **As chaves das impressões diagnósticas são sufixadas por feto** (`peso-f2`) quando há mais de um. Sem isso, marcar/desmarcar ou reescrever um item afetaria o item homônimo do outro feto. Ao remover um feto, `renderChecklist` descarta as chaves órfãs dele em `checkedState` e `impressaoOverrides`.
- **A ordem do laudo é a mesma de sempre**: biometria antes de Doppler e PBF. Com feto único, as duas tabelas de Doppler (materna e fetal) continuam saindo lado a lado logo depois do líquido amniótico, exatamente como antes; com mais de um feto, a fetal entra dentro de cada feto e a materna — que é da mãe — sai uma vez só, depois de todos.
- **Doppler fetal e PBF continuam sendo escolhas únicas do laudo** (marcadas uma vez, nos cards "Doppler" e "Perfil biofísico fetal", porque definem o título do laudo), mas seus campos são preenchidos dentro de cada feto.

O peso estimado em gramas aparece na biometria, **nunca na impressão diagnóstica**. Antes de 21 semanas a impressão traz só "Peso fetal dentro da normalidade" (o percentil de Hadlock não é confiável nessa faixa); a partir de 21 semanas ela traz "Peso fetal no percentil X (Hadlock)". Um percentil abaixo de 10 ou acima de 90 digitado pela médica continua virando o alerta de PIG/GIG em qualquer idade gestacional.

A discordância de peso — `(maior − menor) / maior × 100` — é calculada automaticamente a partir dos pesos estimados e entra como impressão diagnóstica; a partir de 20% ela vira o alerta de acompanhamento especializado. O rastreio de síndrome de transfusão feto-fetal em monocoriônicas ainda **não** está no laudo.

Ao salvar na Curva de Crescimento, uma gestação múltipla grava `tipo_gestacao: 'gemelar'` com a corionicidade escolhida e insere **um `exams` por feto**, numerados na coluna `feto` — igual ao laudo de 1º trimestre.

### Percentil no texto do laudo: sempre `(P34)`, nunca `(percentil 34)`
Qualquer percentil escrito dentro de uma frase do laudo (ILA, peso fetal etc.) usa a forma abreviada `(P` + número + `)` — ex.: `ILA: 23,0 cm (P34)`. Ao adicionar um novo percentil a um laudo (novo ou existente), siga esse mesmo formato em vez de escrever "percentil X" por extenso.

### Alinhamento vertical de uma linha de valores calculados com a tabela de medidas
O líquido amniótico (`table.grade-la`, dentro de cada bloco `la-f{uid}`) é uma linha de 2 células — "Maior bolsão: X cm" | "ILA: Y cm (PZ)" — que precisa cair na mesma coluna vertical da tabela `table.biometria` do mesmo feto (a 2ª célula, do ILA, deve começar onde começa a 3ª coluna da biometria, ou seja, onde começa "Comprimento femoral (CF):"). Como o rótulo "Maior bolsão:" é mais longo que "Diâmetro biparietal (DBP):" + valor somados, não dá para chutar essa largura em CSS fixo (`em` fixo) sem estourar a página ou desalinhar — por isso `alignIlaColumns()` mede ao vivo, no DOM, a largura das duas primeiras colunas da `table.biometria` daquele feto (`getBoundingClientRect()`) e aplica essa largura na 1ª célula da `table.grade-la`, sempre em **`em`** (nunca `px`): a impressão/PDF pode encolher a fonte do laudo inteiro para caber nas páginas (`autoFitPages`), e uma largura fixa em `px` ficaria descalibrada depois desse encolhimento, enquanto `em` acompanha a mudança de fonte porque as duas tabelas compartilham a mesma fonte. `alignIlaColumns()` roda no fim de todo `render()`, depois que os blocos já estão no DOM. Ao adicionar uma linha de valor calculado que precise alinhar com uma tabela de medidas em qualquer laudo (novo ou existente), reuse esse mesmo padrão — medir a largura real das colunas via DOM e aplicar em `em` — em vez de estimar a largura em CSS.

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
2. Esse modelo é analisado (campos, frases-padrão, valores de referência, formatação) e usado como base para montar o app — **copiando `transvaginal.html`** como ponto de partida (ele é a referência/template dos demais — ver "Layout de referência" abaixo), para manter cabeçalho, fontes, espaçamento, regras de impressão e o comportamento do preview consistentes.
3. Adiciona-se um card em `index.html`.
4. Adiciona-se uma `<option>` no `<select id="laudoSwitch">` de **todos** os laudos (inclusive o novo), apontando para o novo arquivo.

Obs: o `obstetrico-1trimestre.html` foi montado sem um modelo real da clínica como referência — vale revisar/ajustar campos e frases assim que o modelo correspondente for enviado.

## Layout de referência: `transvaginal.html`
Cada laudo é um arquivo HTML independente — **não há CSS/JS compartilhado entre eles**. Isso significa que uma correção de layout ou de comportamento do preview feita em um arquivo **não se propaga automaticamente para os outros**; precisa ser replicada manualmente em cada um.

`transvaginal.html` é o laudo mais maduro e deve ser tratado como a referência de layout/comportamento para todos os outros — inclusive os que já existem. Ao corrigir um bug de layout, formatação ou preview em qualquer laudo, aplique a mesma correção nos demais arquivos `.html` de laudo nesta mesma tarefa, em vez de deixar para depois.

Quatro pontos do `transvaginal.html` valem a pena preservar ao criar ou revisar qualquer laudo:
- **Preview do laudo (`#paper`) livre para edição, sem perder texto digitado à mão.** O `render()` não faz mais `paperEl.innerHTML = html` de uma vez só — ele monta uma lista de "blocos" (`blocks.push({id, html})`, um por parágrafo/seção) e chama `renderBlocks(blocks)`. Essa função só toca no elemento de um bloco quando o HTML calculado para ele muda desde a última vez; caso contrário, o nó (e qualquer texto ou formatação que a médica tenha digitado ali) fica intocado. Todo laudo novo deve seguir esse mesmo padrão em vez de reatribuir `innerHTML` inteiro a cada campo alterado.
- **Seleção de texto para espaçamento entre linhas / tamanho de fonte rastreada continuamente.** Em vez de capturar `window.getSelection()` só no `mousedown` do `<select>` (frágil — o timing do colapso da seleção ao mudar o foco varia entre navegadores), a última seleção real dentro de `#paper` é guardada via um listener de `selectionchange` e consumida quando o `<select>` dispara `change`.
- **Nome do arquivo salvo (Word e PDF) = nome da paciente + título do exame.** Todo laudo define `tituloExame()` (retorna o título do exame, incluindo variações como "com DIU", "Gemelar", "Trigemelar" — o que fizer sentido para aquele laudo) e `nomeArquivoLaudo()` (`sanitizeFilenamePart(nomePaciente) + ' - ' + tituloExame()`, com fallback `'Laudo - ' + tituloExame()` se o nome estiver vazio). O botão "Baixar Word" usa isso tanto no nome do arquivo (`saveBlobAs(blob, nomeArquivoLaudo()+'.doc')`) quanto no `<title>` embutido no `.doc` (`escapeHtml(nomeArquivoLaudo())`). Para o "Imprimir/PDF", como o navegador sugere o nome do arquivo a partir de `document.title`, os listeners `beforeprint`/`afterprint` trocam o título da página para `nomeArquivoLaudo()` e devolvem o título original (guardado em `tituloPagina` antes de registrar os listeners) depois de imprimir. Um laudo novo repete esse mesmo par de funções e os mesmos dois listeners, adaptando só o que entra em `tituloExame()`.
- **Campos relacionados no cabeçalho (`.id-card-row`) ficam próximos, não nas pontas opostas da linha.** Ex.: DUM e IG atual/Cronologia dividem a mesma `<span>`, separados por `&nbsp;&nbsp;&nbsp;` (três espaços), em vez de um em cada `<span>` da `id-card-row` (que os empurraria para as bordas esquerda/direita). Reserve `<span>`s separados numa `id-card-row` só para pares que não têm relação direta entre si (como Nome e Data).
