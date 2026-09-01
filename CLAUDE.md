# laudos-dramorgana

Três laudos de ultrassonografia, cada um um arquivo HTML autônomo, sem build e
sem CSS/JS compartilhado entre eles. O `README.md` descreve laudo a laudo (o que
cada um tem, o rascunho automático, o layout de referência); este arquivo trata
do que não se vê olhando um laudo isolado: a integração com o app de Curva de
Crescimento e as armadilhas de manutenção que já morderam antes.

## Publicação

O GitHub Pages publica a partir da **`main`** (workflow "pages build and
deployment", ~1 minuto após o push). Confirmado em 2026-08-23 pelo `head_branch`
dos runs. Merge na `main` = está no ar — mas o navegador da médica pode segurar
a versão antiga em cache: quando ela disser que a mudança "não apareceu", peça um
hard refresh antes de sair investigando o código.

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

- **`printPaginated`** marca o intervalo. `render()` adia (`renderPendingAfterPrint`,
  rodado pelo `restore()`) e `updatePagePreview()` sai na hora.
- **`unwrapPrintPages(root)`** desfaz a paginação: tira os blocos das
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
