# laudos-dramorgana

Laudos personalizados de ultrassonografia obstétrica/ginecológica — Dra. Morgana Kummer.

Cada laudo é um arquivo HTML autônomo (sem build, abre direto no navegador). `index.html` lista os laudos disponíveis; cada laudo também tem um dropdown no cabeçalho ("Trocar de laudo") para navegar entre eles.

## Laudos disponíveis
- `transvaginal.html` — Ultrassonografia Transvaginal

## Adicionando um novo laudo
1. Copie um laudo existente (ex: `transvaginal.html`) como ponto de partida, para manter cabeçalho, fontes, espaçamento e regras de impressão consistentes.
2. Adicione um card em `index.html`.
3. Adicione uma `<option>` no `<select id="laudoSwitch">` de **todos** os laudos (inclusive o novo), apontando para o novo arquivo.
