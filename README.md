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

A discordância de peso — `(maior − menor) / maior × 100` — é calculada automaticamente a partir dos pesos estimados e entra como impressão diagnóstica; a partir de 20% ela vira o alerta de acompanhamento especializado. O rastreio de síndrome de transfusão feto-fetal em monocoriônicas ainda **não** está no laudo.

Ao salvar na Curva de Crescimento, uma gestação múltipla grava `tipo_gestacao: 'gemelar'` com a corionicidade escolhida e insere **um `exams` por feto**, numerados na coluna `feto` — igual ao laudo de 1º trimestre.

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

Dois pontos do `transvaginal.html` valem a pena preservar ao criar ou revisar qualquer laudo:
- **Preview do laudo (`#paper`) livre para edição, sem perder texto digitado à mão.** O `render()` não faz mais `paperEl.innerHTML = html` de uma vez só — ele monta uma lista de "blocos" (`blocks.push({id, html})`, um por parágrafo/seção) e chama `renderBlocks(blocks)`. Essa função só toca no elemento de um bloco quando o HTML calculado para ele muda desde a última vez; caso contrário, o nó (e qualquer texto ou formatação que a médica tenha digitado ali) fica intocado. Todo laudo novo deve seguir esse mesmo padrão em vez de reatribuir `innerHTML` inteiro a cada campo alterado.
- **Seleção de texto para espaçamento entre linhas / tamanho de fonte rastreada continuamente.** Em vez de capturar `window.getSelection()` só no `mousedown` do `<select>` (frágil — o timing do colapso da seleção ao mudar o foco varia entre navegadores), a última seleção real dentro de `#paper` é guardada via um listener de `selectionchange` e consumida quando o `<select>` dispara `change`.
