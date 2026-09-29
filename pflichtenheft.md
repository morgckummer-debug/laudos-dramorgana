# Pflichtenheft — Editor de Laudos de Ultrassonografia (estado implementado)

**Versão:** 1.0 · **Data:** 2026-09-29
**Escopo:** funcionalidades JÁ implementadas em `laudos-dramorgana`, descritas para fins de integração num produto externo (código fechado, sem acesso ao repositório do produto hospedeiro).
**Origem das informações:** `CLAUDE.md`, `README.md` e estrutura do repositório. O schema do banco não está neste repositório (ver §7).

---

## 1. Visão geral

| Item | Descrição |
|---|---|
| Natureza | Conjunto de 14 aplicações web estáticas (HTML/CSS/JS puro, **sem build, sem framework, sem backend próprio**) + 1 motor compartilhado (`laudo-core.js`) |
| Usuário | Médica ultrassonografista (uso interno de clínica), preenchimento em tela e impressão/entrega do laudo |
| Hospedagem atual | GitHub Pages (branch `main`) |
| Persistência | (a) `localStorage` do navegador (rascunho, frases, preferências); (b) Supabase/Postgres, apenas nos laudos obstétricos e no rastreamento de ovulação |
| Idioma / domínio | pt-BR; medicina fetal, obstetrícia, ginecologia, medicina interna |
| Saídas | Impressão/PDF (via navegador), download `.doc` (HTML aceito pelo Word), gravação em banco (subconjunto) |

Princípio central: **cada laudo = formulário à esquerda + pré-visualização editável do documento (`#paper`) à direita**. O texto do laudo é gerado a partir dos campos; a médica pode ainda editá-lo à mão diretamente no preview.

---

## 2. Catálogo de laudos

### 2.1 Medicina interna (sem CPF, sem banco)
| Arquivo | Conteúdo |
|---|---|
| `abdome-total.html` | Fígado, vesícula/vias biliares, pâncreas, rins, bexiga, grandes vasos, baço; quantificação de esteatose (QUS) com grau calculado a partir do % de gordura |
| `rins-vias-urinarias.html` | Rins D/E, bexiga, volume urinário pré/pós-miccional |
| `tireoide-doppler.html` | Lobos D/E e istmo, volumes digitados (não recalculados), volume total automático, vascularização, velocidade da artéria tireoidea inferior |
| `cervical-doppler.html` | Planos musculares/subcutâneo, linfonodos por nível (I–VII) em listas dinâmicas D/E, limite de menor eixo por nível (10 mm nível II, 9 mm demais) com aviso, mapa dos níveis (popup), Doppler, nota fixa de rodapé (CBR) |

### 2.2 Ginecologia
| Arquivo | Conteúdo | Banco |
|---|---|---|
| `mamas.html` | Achados repetíveis em cards (cistos, nódulos, fibroadenoma, linfonodos, seroma), mama/lado por achado, prótese | não |
| `transvaginal.html` | Útero, ovários, miomas (blocos repetíveis), DIU etc. | não (histórico legado em `laudos_tv`, sem novas gravações) |
| `pelvico-infantil.html` | Propedêutica de puberdade precoce | não (idem `laudos_pelvico_infantil`) |
| `rastreamento-ovulacao.html` | Útero, ovários, acompanhamento folicular visita a visita até corpo lúteo; ciclos | **sim** (`laudos_ovulacao`, `patients`) |
| `monitorizacao-folicular-fiv.html` | Monitorização folicular para FIV, bloco de miomas | ver §7 (não documentado em detalhe) |

### 2.3 Obstetrícia
| Arquivo | Conteúdo | Banco |
|---|---|---|
| `obstetrico-1trimestre.html` | Sacos gestacionais com 1–3 embriões, CCN, cronologia, miomas, corionicidade | sim (`exams.ccn`) |
| `morfologico-1trimestre.html` | Biometria, TN, FC, ducto venoso, uterinas, colo, riscos FMF (T21/T18/T13, pré-eclâmpsia, parto prematuro, diabetes), folha de anexo FMF, 7 gráficos de referência | sim |
| `obstetrico.html` | 2º/3º tri: 1–3 fetos, biometria, Hadlock, líquido, Doppler fetal/materno, PBF, RCP, PIG vs CIUR, AEDF/REDF | sim |
| `morfologico-2trimestre.html` | Morfologia fetal por 6 segmentos, biometria estendida (ossos longos), cordão, líquido; 1–3 fetos | sim |
| `obstetrico-tn-doppler-colo.html` | Biometria simples, TN e risco T21; Doppler uterinas/DV e colo como cards opcionais; miomas | **não** |

`index.html` lista os laudos por categoria; cada laudo tem dropdown "Trocar de laudo".

---

## 3. Requisitos funcionais — motor comum (`laudo-core.js`, vale para todos os laudos)

Numeração **RF-Cxx**.

**Geração e edição do documento**
- **RF-C01 Preview vivo.** `render()` gera o laudo a partir dos campos como uma lista de blocos (`data-blk` estável, filhos diretos do `#paper`); só o bloco cujo HTML mudou é substituído, preservando texto digitado à mão nos demais.
- **RF-C02 Edição direta no preview** (`contenteditable`) com barra de formatação, seletor de tamanho de fonte e "Espaçamento entre linhas" (aplicável a seleção ou ao laudo todo).
- **RF-C03 Frases-padrão personalizáveis** (`PHRASES`) com marcadores `{CHAVE}`; substituição tolerante a acento/caixa/espaços (`aplicarPlaceholders`); marcador desconhecido não é apagado, gera **aviso âmbar fora do papel** (`verificarPlaceholders`) e não vai à impressão. "Salvar frases" persiste em `localStorage`.
- **RF-C04 Valores de referência (`VR`)** customizáveis e aplicados aos campos.
- **RF-C05 Impressão diagnóstica/conclusão** gerada por regras (`buildImpressao()`), com checklist lateral (marcar/desmarcar itens) e edição de cada linha à mão (override).
- **RF-C06 Override com validade** (`obstetrico-1trimestre`): a linha editada é descartada se os campos que a geraram mudarem depois. *Nos demais laudos essa aferição não existe (ver §8).*
- **RF-C07 Decimais:** validação/normalização de entrada decimal (vírgula), sem listeners duplicados a cada render.
- **RF-C08 Máscara de CPF** (`000.000.000-00`) nos laudos que têm o campo.

**Integridade do documento editável (redes de proteção)**
- **RF-C10** Enter no `#paper` vira quebra de linha, exceto dentro de `<li>` e célula de tabela (`wireEnterLineBreaks`).
- **RF-C11** Blocos duplicados removidos; blocos aninhados sobem para filho direto (`dedupBlocos`).
- **RF-C12** Blocos que sumiram são restaurados a cada `input` (`restoreMissingBlocks`).
- **RF-C13** Seleção não colapsada que cruza dois blocos, e Backspace/Delete na borda entre blocos (inclusive marcador "Fim da página N"), são bloqueados sem apagar o conteúdo vizinho (`wireBlockBoundaryGuard`).
- **RF-C14** Colagem sempre como texto puro (`wirePastePlainText`).

**Paginação e impressão**
- **RF-C20** Paginação real da impressão (`paginateForPrint`): assinatura presa ao pé da última folha, cabeçalho de identificação repetido nas demais, "Continua…" entre folhas.
- **RF-C21** Ajuste automático de fonte/entrelinha para caber em N folhas (`autoFitPages`).
- **RF-C22** Marcador ao vivo "Fim da página N" no preview (`updatePagePreview`).
- **RF-C23** Quebra linha a linha para tabelas de morfologia (`data-split="rows"`).
- **RF-C24** Margens de impressão reservadas para timbrado físico (3,5 cm topo; 2 cm pé e laterais).
- **RF-C25** Nome do arquivo/`document.title` = *nome da paciente – título do exame* (`nomeArquivoLaudo()`), em PDF e Word.

**Exportação Word**
- **RF-C30** "Baixar Word" gera `.doc` (HTML) com estilos inlinados elemento a elemento (`WORD_COPY`/`copyComputedToClone`), `mso-line-height-rule:exact`, reset do estilo Normal, `@page` com as margens do timbrado (`wordDocHtml`).
- **RF-C31** Cartão de identificação convertido em tabela de uma célula (`buildIdCardTable`) para o Word não repetir borda por parágrafo.
- **RF-C32** Itens da impressão exportados como `<p>` com recuo suspenso e justificado.

**Rascunho automático**
- **RF-C40** Grava em `localStorage` (uma chave por laudo, `laudo-rascunho-<laudo>-v1`) com debounce de 0,8 s e gravação síncrona em `pagehide`/`visibilitychange`. Conteúdo: campos de `#formCol`, uids dos cards repetidos, `checkedState`, overrides, tamanho de fonte, HTML do `#paper` (desempaginado), `lastBlockHtml`.
- **RF-C41** Restauração completa com aviso "Rascunho recuperado" e selo com hora da última gravação; "Limpar" apaga o rascunho; formulário em branco não gera rascunho.
- **RF-C42** Rascunho corrompido → abre em branco (e descarta).

**Cards repetíveis**
- **RF-C50** Cards com `uid` estável (fetos, sacos, embriões, nódulos de mioma, linfonodos, folículos, achados de mama): remover um do meio não recria os demais.

---

## 4. Requisitos funcionais — obstetrícia

- **RF-O01 Gestação múltipla** (até 3 fetos, `MAX_FETOS = 3`): card por feto (apresentação, vitalidade, biometria, placenta, líquido, Doppler fetal, PBF); dados maternos (uterinas, colo) uma vez só; chaves de impressão sufixadas por feto (`peso-f2`); frases mescladas "ambos/todos os fetos" quando tudo normal; discordância de peso calculada `(maior−menor)/maior×100` com alerta ≥ 20%.
- **RF-O02 Cronologia gestacional** (DUM, DPP, 1ª ecografia, IG pela USG, FIV) → IG e método usados nas frases.
- **RF-O03 Biometria e peso:** Hadlock; percentil de peso só impresso a partir de 21 sem.; percentis em texto sempre `(P34)`.
- **RF-O04 Percentis Doppler** (RCP Figueras/Barcelona, IP umbilical Acharya 2005, IP ACM Ebbing 2007) — cálculo interno, sem campo novo; fórmulas idênticas às do app de curvas.
- **RF-O05 PIG vs CIUR** (gestação única): percentil do dia + critérios menores (antes de 32 sem: IP umbilical/uterinas > P95; a partir de 32 sem: 2 de 3 critérios) + fluxo diastólico ausente/reverso/intermitente (isolado, < 32 sem.). Estágio I–IV mostrado quando CIUR.
- **RF-O06 Fluxo diastólico da umbilical** (`AuFluxo`: normal/ausente/reversa/intermitente) na tabela e na frase de impressão.
- **RF-O07 1º trimestre:** um saco com N embriões (monocoriônica) ou N sacos de 1 embrião; layout em duas colunas para 2 embriões; blocos de mioma.
- **RF-O08 Morfológico 1º tri (FMF):** TN, FC, ducto venoso (IP e onda A: positiva/ausente/reversa), riscos T21/T18/T13, pré-eclâmpsia (opcional), parto prematuro, diabetes gestacional; em monocoriônica **um só cálculo de risco** rotulado "Ambos os fetos / Os três fetos"; folha de anexo com relatório FMF em texto, imagens da FMF e riscos por história espelhados do 1º feto (readonly); idade materna espelhada da calculada.
- **RF-O09 Gráficos de referência do anexo** (7 no 1º tri: BCF, CCN, TN, DV, uterinas E/D/média; eixo X = idade gestacional); Feto 3 em marrom; forma do marcador distingue fetos em P&B.
- **RF-O10 Morfológico 2º tri:** 6 segmentos (`MORFO_SEGMENTOS`) com texto padrão e "Alterado + descrição livre"; sem segmento alterado → frase única "nenhuma anomalia estrutural".
- **RF-O11 Alinhamento vertical** da linha de líquido amniótico com a biometria (`alignIlaColumns`, em `em`).
- **RF-O12 Cálculos automáticos de idade materna, IG, volume, percentis, grau de esteatose etc.** conforme laudo.

## 5. Requisitos funcionais — ginecologia/medicina interna

- **RF-G01 Blocos de mioma** (FIGO, medida, localização) — 5 cópias: 1º tri, TN, transvaginal, rastreio de ovulação, monitorização FIV. No TN as frases são *anexadas* à frase-base do útero.
- **RF-G02 Rastreamento de ovulação:** múltiplas visitas por ciclo; ciclo = paciente + `data_exame` da 1ª visita; "Salvar", "Salvar e encerrar ciclo", "Buscar laudo anterior" (com período e selo *Ciclo encerrado/Em andamento*), "Novo ciclo" (reaproveita nome/CPF/médico/GPA).
- **RF-G03 Linfonodos cervicais** com limite por nível e aviso; **mamas** com achados repetíveis; **abdome** com QUS.

---

## 6. Requisitos funcionais — integração com a Curva de Crescimento (Supabase)

Aplica-se a `obstetrico`, `obstetrico-1trimestre`, `morfologico-1trimestre`, `morfologico-2trimestre` (gravam `patients`+`gestacoes`+`exams`) e `rastreamento-ovulacao` (`patients`+`laudos_ovulacao`).

- **RF-I01** Login Supabase; busca/criação da paciente por CPF (aceita CPF pontuado ou só dígitos na busca; grava **pontuado**).
- **RF-I02** Nome do laudo prevalece: se difere de `patients.nome`, atualiza e avisa no toast.
- **RF-I03** Acha a gestação `ativa` ou cria (deduz DUM/DPP da cronologia; recusa sem data de referência).
- **RF-I04** Insere **um `exams` por feto/embrião** (`feto` = A/B/C; `tipo_gestacao` única/gemelar/trigemelar; corionicidade). Dados maternos replicados em cada feto.
- **RF-I05** GPA: grava em gestação nova; em existente não apaga com campo vazio; se divergir, modal de escolha (`askGpaDivergencia`).
- **RF-I06** Flags `ppt_espontaneo_previo`, `progesterona_vaginal_em_uso`, `cerclagem_realizada` (+IG): só sobem para `true`, nunca revertem.
- **RF-I07** Riscos FMF gravados como texto `"1 em X"`; T21/T18/T13 por feto (só do 1º em monocoriônica); pré-eclâmpsia/parto prematuro/diabetes maternos replicados.
- **RF-I08** Nunca enviar `id` explícito no insert; toda leitura filtra `excluido_em IS NULL`; só colunas existentes em `exams`.

---

## 7. Modelo de dados e interfaces externas

**7.1 Backend:** Supabase (Postgres + PostgREST + Auth), projeto compartilhado com o app "Curva de Crescimento" (repositório separado `curva-fetal`). Não há API própria.

**7.2 Tabelas**
- `patients` (nome, cpf, `user_id`, `excluido_em`, …) — unique parcial `(user_id, cpf)`.
- `gestacoes` (patient, status, dum, dpp, tipo_gestacao, corionicidade, gestas/partos/abortos, flags de PPT/progesterona/cerclagem, `excluido_em`).
- `exams` (gestacao, `feto` A/B/C, biometria, Doppler, TN/FC/DV, riscos FMF, colo, uterinas…).
- `laudos_ovulacao` (snapshot JSON do formulário; `ciclo_encerrado`, `encerrado_em`) — criada direto no painel, **sem SQL versionado**; ver §8.
- Legadas sem novas gravações: `laudos_tv`, `laudos_pelvico_infantil`.
- **Fonte de verdade das colunas:** `supabase/schema.sql` + migrações (003, 004, 005, 009, 010…) do repositório `curva-fetal`.

**7.3 Armazenamento local (`localStorage`):** rascunho por laudo; frases personalizadas; valores de referência; médica executante/digitadora selecionada; preferências (`kvStore`).

**7.4 Pontos de acoplamento para o produto hospedeiro**
| Ponto | Situação atual | Observação para integração |
|---|---|---|
| Identidade da paciente | CPF (única chave de negócio) | Produto hospedeiro precisará mapear seu ID de paciente ↔ CPF, ou substituir `patients` |
| Autenticação | Login Supabase embutido no laudo | Substituir por sessão/token do hospedeiro |
| Persistência do laudo emitido | **Não existe** (o documento final só sai por impressão/`.doc`; apenas medidas vão para `exams`) | Se o hospedeiro exigir armazenar o laudo, é requisito novo |
| Injeção de dados de entrada (nome, CPF, DUM…) | Digitação manual | Não há API/`postMessage`/parâmetros de URL |
| Saída | `window.print()` e download `.doc` | Sem PDF gerado no servidor, sem assinatura digital |
| Carregamento | Requer `laudo-core.js` ao lado do `.html` | Incorporar por iframe ou copiar os dois arquivos juntos |

---

## 8. Requisitos não funcionais e restrições conhecidas

**Implementados / características**
- **RNF-01** Sem build, sem dependências de runtime declaradas (fora o cliente Supabase nos laudos com banco); funciona em navegador moderno (desenvolvido/testado em Chromium).
- **RNF-02** Rascunho sobrevive a F5/queda; nada do rascunho sai do computador.
- **RNF-03** Manutenção do motor num único arquivo; teste de regressão por comparação de saída HTML (`ferramentas/testar-laudos.mjs`, Playwright/Chromium).
- **RNF-04** Aviso amigável se `laudo-core.js` não carregar.

**Limitações / dívida técnica (relevantes para o integrador)**
1. Sem migrações SQL neste repositório; `laudos_ovulacao` e possivelmente RLS só existem no painel Supabase.
2. Contrato com o `curva-fetal` sem código compartilhado: mudanças de CPF/ids/lixeira/colunas precisam ser espelhadas nos dois lados manualmente.
3. Código duplicado fora do motor: modal de GPA (4 cópias), bloco de mioma (5), seletor de espaçamento (13), override com validade (só 1º trimestre).
4. `draftRestore()` trata qualquer exceção como "rascunho corrompido" e apaga o rascunho.
5. **Não implementado:** rastreio de síndrome de transfusão feto-fetal; CIUR seletivo em gemelares (nomenclatura própria); agrupamento de riscos em dicoriônica triamniótica; histórico/versionamento de laudos emitidos; multiusuário/perfis além do login Supabase; armazenamento do documento final; testes automatizados em CI.
6. A médica às vezes sobe arquivos por "Add files via upload" do GitHub, sobrescrevendo correções — risco operacional a eliminar ao mover para o produto hospedeiro.
7. Regras médicas (limites, percentis, textos-padrão) estão embutidas no JS; não há configuração externa além das frases e VR editáveis.

---

## 9. Critérios de aceite sugeridos para a integração
1. Cada um dos 14 laudos abre, monta o preview e imprime sem erro de console.
2. Preencher → recarregar → todos os campos e o texto editado à mão voltam (rascunho).
3. Impressão de laudo com ≥ 2 folhas: sem duplicação de blocos, assinatura no pé da última folha, cabeçalho repetido.
4. `.doc` baixado: cartão de identificação em caixa única, entrelinha e paginação equivalentes ao PDF.
5. Salvar laudo obstétrico: 1 `exams` por feto, CPF pontuado, sem `id` explícito, sem tocar registros com `excluido_em`.
6. Saída de `ferramentas/testar-laudos.mjs` idêntica antes/depois da integração (exceto diferenças intencionais).
