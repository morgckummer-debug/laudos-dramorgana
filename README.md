# laudos-dramorgana

Laudos personalizados de ultrassonografia obstétrica/ginecológica — Dra. Morgana Kummer.

Cada laudo é um arquivo HTML autônomo (sem build, abre direto no navegador). `index.html` lista os laudos disponíveis; cada laudo também tem um dropdown no cabeçalho ("Trocar de laudo") para navegar entre eles.

## Laudos disponíveis
- `transvaginal.html` — Ultrassonografia Transvaginal
- `obstetrico-1trimestre.html` — Ultrassonografia Obstétrica de 1º Trimestre (translucência nucal)

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
