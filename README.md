# laudos-dramorgana

Laudos personalizados de ultrassonografia obstétrica/ginecológica — Dra. Morgana Kummer.

Cada laudo é um arquivo HTML autônomo (sem build, abre direto no navegador). `index.html` lista os laudos disponíveis; cada laudo também tem um dropdown no cabeçalho ("Trocar de laudo") para navegar entre eles.

## Laudos disponíveis
- `transvaginal.html` — Ultrassonografia Transvaginal
- `obstetrico-1trimestre.html` — Ultrassonografia Obstétrica de 1º Trimestre (translucência nucal)

## Adicionando um novo laudo
Os modelos de laudo já existem na clínica (a Dra. Morgana envia o modelo real usado — texto, foto ou arquivo). O fluxo é:
1. A Dra. Morgana envia o modelo do laudo que já usa na clínica.
2. Esse modelo é analisado (campos, frases-padrão, valores de referência, formatação) e usado como base para montar o app — copiando um laudo existente (ex: `transvaginal.html`) como ponto de partida, para manter cabeçalho, fontes, espaçamento e regras de impressão consistentes.
3. Adiciona-se um card em `index.html`.
4. Adiciona-se uma `<option>` no `<select id="laudoSwitch">` de **todos** os laudos (inclusive o novo), apontando para o novo arquivo.

Obs: o `obstetrico-1trimestre.html` foi montado sem um modelo real da clínica como referência — vale revisar/ajustar campos e frases assim que o modelo correspondente for enviado.
