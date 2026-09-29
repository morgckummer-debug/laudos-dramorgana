# Requisitos — Editor de Laudos integrado ao Ultrastudio

**Status:** rascunho vivo (v0.1) · **Data:** 2026-09-29
**Objetivo:** listar, do básico ao detalhado, tudo o que o editor de laudos precisa ter para ser embutido no Ultrastudio (software de captação de imagens do ultrassom), de modo que nada importante seja descoberto só no fim.
**Como ler:** os requisitos crescem por camadas (A → K). Cada um tem um ID, uma prioridade e uma origem.

- **Prioridade (MoSCoW):** `M` obrigatório · `S` importante · `C` desejável · `?` decisão pendente
- **Origem:** `[E]` já existe no editor hoje · `[N]` novo, a construir · `[A]` existe mas precisa ser adaptado
- O Ultrastudio é tratado como **caixa-preta**: só definimos o que o editor precisa *receber* e *devolver* (camada H), sem supor como ele é por dentro.
- Complementa `pflichtenheft.md` (o que existe hoje). Este documento diz o que falta.

---

## A. Princípios (regem todo o resto)

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| A1 | O **paciente é o centro**; todo laudo pertence a uma pessoa e aparece na linha do tempo dela | M | [N] |
| A2 | Um dado é digitado **uma vez só**; o que o Ultrastudio já sabe (nome, CPF, nascimento, imagens) não é redigitado | M | [N] |
| A3 | **Nunca perder trabalho da médica**: rascunho automático, recuperação após queda, sem exceção silenciosa que descarte dados | M | [E] |
| A4 | O laudo emitido é um **documento clínico**: tem autoria, data, versão e não muda sem deixar rastro | M | [N] |
| A5 | O editor continua **usável sem internet** se o Ultrastudio for local/rede interna (a definir) | ? | [A] |
| A6 | O médico decide o texto final: o sistema sugere e calcula, a médica sempre pode editar à mão | M | [E] |
| A7 | Mudanças nas regras médicas (frases, valores de referência, fórmulas) são feitas em **um lugar só**, valendo para todos os laudos | M | [E] |

---

## B. Identidade do paciente

O CPF é hoje a única chave. Na integração ele continua sendo a chave de negócio principal, mas **não pode ser a única forma de identificar uma pessoa**.

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| B1 | Identificar o paciente pelo **CPF** (formato canônico `000.000.000-00`), com máscara e validação de dígitos verificadores | M | [A] (máscara existe; validação de dígitos não) |
| B2 | Aceitar **paciente sem CPF** (criança, estrangeira, recém-nascida, paciente que não informou): identificador alternativo do Ultrastudio (prontuário/ID interno), com marcação clara "sem CPF" | M | [N] — hoje `pelvico-infantil` e medicina interna não têm CPF |
| B3 | Guardar o **ID do Ultrastudio** ao lado do CPF; o vínculo entre os dois é permanente e não depende do nome | M | [N] |
| B4 | Dados mínimos do paciente: nome, nome social (opcional), data de nascimento, sexo, CPF, contatos. Idade calculada **na data do exame**, não na data de hoje | M | [A] |
| B5 | **Correção de CPF digitado errado** sem perder o histórico da paciente | M | [N] |
| B6 | **Unir cadastros duplicados** (mesma pessoa em duas fichas) sem perder laudos | S | [N] |
| B7 | Tratar **homônimos** e CPF que bate com a pessoa errada: aviso quando o nome do laudo diverge do cadastro (hoje só o toast, e o nome do laudo sobrescreve) | M | [A] |
| B8 | Paciente **excluída/inativa** (lixeira) fica fora das buscas normais e não recebe laudo novo | M | [E] (`excluido_em`) |
| B9 | Paciente **menor de idade**: responsável/acompanhante no cabeçalho, quando aplicável | S | [N] |

---

## C. Linha do tempo da paciente

A paciente é uma pessoa com **história dentro da clínica**, não um exame isolado. Uma paciente pode ter, ao longo dos anos, um abdome, um transvaginal, uma gestação inteira (com vários exames) e uma mama.

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| C1 | Tela/visão **cronológica** de tudo o que a paciente fez na clínica: cada item com data, tipo, médica, situação (rascunho/emitido) | M | [N] |
| C2 | Cada item da linha do tempo é um **Atendimento** que pode conter um ou mais laudos | M | [N] |
| C3 | Abrir um item da linha do tempo reabre o laudo com **todos os campos e o texto editado à mão** | M | [N] (hoje só há rascunho local) |
| C4 | Filtrar a linha do tempo por tipo (obstétrico, ginecológico, medicina interna), período e médica | S | [N] |
| C5 | Mostrar na linha do tempo os **episódios** (ver D) como agrupadores: "Gestação de 2026" com seus exames dentro | M | [N] |
| C6 | Ao criar um laudo novo, o sistema **sugere o contexto**: "esta paciente tem gestação ativa, é o 3º exame dela" | S | [N] |
| C7 | Trazer o **laudo anterior do mesmo tipo** para comparação (ex.: mioma cresceu?) | C | [N] |

---

## D. Tipos de exame: simples × episódios

Dois comportamentos diferentes, que precisam existir desde o desenho.

**Exame simples (avulso):** começa e termina no mesmo dia. Ex.: abdome total, rins e vias urinárias, tireoide, cervical, mamas, transvaginal, pélvico infantil.

**Exame de episódio (acompanhamento):** pertence a uma história com início, meio e fim, e cada exame carrega dados do anterior.

| Episódio | Exames que pertencem a ele | Hoje no editor |
|---|---|---|
| **Gestação** | 1º trimestre, morfológico 1º tri (FMF), TN+Doppler+colo, obstétrico 2º/3º tri, morfológico 2º tri | Integrado ao Supabase (`gestacoes`/`exams`) |
| **Ciclo de ovulação** | rastreamento de ovulação (várias visitas) | Tabela própria `laudos_ovulacao` |
| **Ciclo de FIV** | monitorização folicular FIV | A confirmar |
| **Investigação de puberdade precoce** | pélvico infantil (pode haver reavaliações) | Sem integração |

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| D1 | O sistema distingue **exame simples** de **exame de episódio** no cadastro do tipo de laudo | M | [N] |
| D2 | **Gestação como episódio**: criada por um exame (ou manualmente), com DUM, DPP, cronologia oficial, gestas/partos/abortos, tipo (única/gemelar/trigemelar), corionicidade, flags de risco (PPT prévio, progesterona, cerclagem) | M | [A] |
| D3 | Os exames de uma gestação **herdam** os dados dela (DUM, DPP, GPA, corionicidade, nº de fetos) sem redigitar | M | [N] |
| D4 | **Só uma gestação ativa** por paciente; ao criar outra, o sistema pergunta o que fazer com a anterior | M | [A] |
| D5 | **Encerrar a gestação** (parto, aborto, gestação ectópica, mola, perda) com data e desfecho; depois disso ela deixa de receber exames | M | [N] |
| D6 | A **cronologia oficial** (qual data manda no cálculo da IG: DUM, 1ª ecografia, FIV) é escolhida uma vez e vale para toda a gestação; mudança fica registrada com motivo e data | M | [N] |
| D7 | **IG calculada na data do exame** (não na data em que o laudo foi aberto nem impresso) | M | [A] |
| D8 | Gestação múltipla: identificação estável dos fetos (A/B/C) **entre exames**, para o gráfico de crescimento do Feto B ser sempre do mesmo feto | M | [A] |
| D9 | Mudança de nº de fetos entre exames (ex.: perda de um gemelar) é tratada de forma explícita, sem apagar o histórico | S | [N] |
| D10 | **Ciclo (ovulação/FIV)** como episódio: várias visitas num mesmo ciclo, encerrar ciclo, iniciar novo ciclo reaproveitando dados da paciente | M | [E] (rastreamento) |
| D11 | Regras de **encadeamento** entre laudos do mesmo episódio (ex.: 1º trimestre → morfológico → 2º/3º tri) configuráveis | S | [N] |
| D12 | Um exame **avulso** pode ser promovido a parte de um episódio depois (esqueceram de vincular) | S | [N] |
| D13 | Novos episódios/tipos de exame podem ser **adicionados sem reescrever o núcleo** | M | [A] |

---

## E. Ciclo de vida do laudo

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| E1 | Estados: **Rascunho → Emitido → (Retificado)**; opcionalmente **Assinado** e **Cancelado** | M | [N] |
| E2 | **Rascunho automático** contínuo, agora **no servidor/banco do Ultrastudio** (hoje só `localStorage` do navegador) e não só no computador da médica | M | [A] |
| E3 | Vários rascunhos em aberto ao mesmo tempo (ex.: dois pacientes na sala) sem misturar dados | M | [N] |
| E4 | **Emitir** = congelar a versão: guarda o conteúdo final (texto editado à mão incluído), data/hora, médica responsável | M | [N] |
| E5 | Laudo emitido **não é sobrescrito**: correção gera **nova versão** (retificação) com motivo, a anterior fica consultável | M | [N] |
| E6 | Cada versão registra **quem** alterou, **quando** e **o quê** (trilha de auditoria) | M | [N] |
| E7 | **Data do exame ≠ data de emissão**: as duas guardadas e impressas corretamente | M | [A] |
| E8 | **Médica executante** (quem fez a ecografia), **médica que assina** e **digitadora** podem ser pessoas diferentes | M | [E] (executante/digitadora existem) |
| E9 | Assinatura: só carimbo de texto (CRM) como hoje, ou **assinatura digital** (ICP-Brasil)? | ? | [N] |
| E10 | Bloquear edição de laudo emitido/assinado, com opção de "abrir para retificar" com registro | M | [N] |
| E11 | Cancelar/anular laudo emitido por engano, mantendo o registro | S | [N] |
| E12 | **Recuperar rascunho** após falha do sistema, queda de energia ou troca de computador | M | [A] |

---

## F. Conteúdo e edição do laudo (o que já existe e não pode piorar)

Resumo dos comportamentos atuais que o novo ambiente **tem de preservar**. Detalhes em `pflichtenheft.md` §3–§5 e `CLAUDE.md`.

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| F1 | Formulário estruturado + **preview do documento editável à mão**, com texto gerado a partir dos campos | M | [E] |
| F2 | Texto digitado à mão **sobrevive** a mudanças posteriores do formulário; só o bloco cujo dado mudou é regenerado | M | [E] |
| F3 | **Redes de proteção do documento**: sem duplicar bloco, sem apagar bloco vizinho ao editar, colar sempre como texto puro | M | [E] |
| F4 | Impressão diagnóstica/conclusão gerada por regras, com checklist e edição linha a linha; linha editada é descartada se os campos que a geraram mudarem | M | [A] (validade só no 1º tri) |
| F5 | **Frases-padrão** e **valores de referência** editáveis por médica, com marcadores `{X}` e aviso de marcador inválido | M | [E] |
| F6 | Cálculos: IG, Hadlock, percentis, RCP, PIG/CIUR, riscos FMF, volumes, esteatose etc. | M | [E] |
| F7 | Gestação múltipla até 3 fetos; sacos/embriões no 1º trimestre | M | [E] |
| F8 | Blocos repetíveis (fetos, sacos, miomas, linfonodos, folículos, achados de mama) com identificador estável | M | [E] |
| F9 | Regras médicas com **fonte citada** (Hadlock, Figueras, Acharya, Ebbing, FMF, ISUOG) — hoje as fórmulas de RCP/percentil existem também no app de Curvas e precisam ficar idênticas | M | [A] |
| F10 | **Fórmulas médicas com testes automáticos** (entrada → saída esperada), para nenhuma mudança alterar cálculo em silêncio | S | [N] |
| F11 | Mesmos textos e regras **para todos os laudos** de um mesmo assunto (mioma, útero, líquido) — hoje duplicados em até 13 cópias | S | [A] |

---

## G. Imagens do exame (o ponto de contato mais forte com o Ultrastudio)

Hoje o editor **não tem imagens** (exceto a folha de anexo da FMF). Este é o maior bloco novo.

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| G1 | Receber do Ultrastudio a **lista de imagens/vídeos** capturados no exame corrente, com miniatura | M | [N] |
| G2 | **Selecionar** quais imagens entram no laudo e em que **ordem** | M | [N] |
| G3 | Layout de imagens: folha(s) de imagens ao final; 1, 2, 4, 6 por página; legenda editável por imagem | M | [N] |
| G4 | Imagem ligada a um **achado/medida** específica (ex.: foto do nódulo junto da descrição) | S | [N] |
| G5 | Imagens entram **no PDF impresso e no Word** com boa qualidade (resolução, compressão, tamanho do arquivo) | M | [N] |
| G6 | **Não exibir dados sensíveis desnecessários** nas imagens (nome do paciente queimado na imagem do aparelho: cortar/mascarar?) | ? | [N] |
| G7 | Imagem removida/trocada depois de emitido gera nova versão do laudo | M | [N] |
| G8 | **Medidas feitas no aparelho** (DBP, CC, CA, CF, TN, IP...) importadas junto da imagem, quando o Ultrastudio as extrair, para **preencher campos** (com confirmação da médica) | C | [N] |
| G9 | Imagens da FMF (relatório) na folha de anexo | M | [E] |
| G10 | Vídeo/clip: só referência, ou incorporado? | ? | [N] |

---

## H. Contrato com o Ultrastudio (caixa-preta)

Sem ver o código do Ultrastudio, definimos aqui só as **portas de entrada e saída**. A tecnologia da ponte (iframe/WebView, `postMessage`, API HTTP local, arquivo) fica em aberto.

**Editor recebe (entrada):**

| ID | Dado | Prio |
|---|---|---|
| H1 | Identificação do paciente: ID interno, CPF (ou ausência), nome, nome social, nascimento, sexo | M |
| H2 | Identificação do **exame/atendimento**: ID, data/hora, tipo solicitado, médico solicitante, convênio, indicação clínica | M |
| H3 | Identificação do **médico logado** (executante/assinante): nome, CRM, UF, especialidade, assinatura/logo | M |
| H4 | **Lista de imagens** do exame (ver G) | M |
| H5 | Dados de **episódio já conhecidos** (gestação ativa: DUM, DPP, GPA) se o Ultrastudio os guardar | S |
| H6 | Configuração da clínica: nome, endereço, logo, timbrado, telefones | M |

**Editor devolve (saída):**

| ID | Dado | Prio |
|---|---|---|
| H7 | **Laudo final** em formato fechado (PDF) + versão editável reabrível (HTML/JSON) | M |
| H8 | **Dados estruturados** do laudo (medidas, achados, IG, diagnósticos) num JSON com **esquema versionado**, para o Ultrastudio guardar e pesquisar | M |
| H9 | **Estado** do laudo (rascunho/emitido) e eventos: "iniciado", "salvo", "emitido", "cancelado" | M |
| H10 | Pedido de **impressão** / envio ao paciente (e-mail, link, portal) | S |

**Regras do contrato:**

| ID | Requisito | Prio |
|---|---|---|
| H11 | Contrato **versionado** (`v1`, `v2`...) e documentado; mudança no editor não quebra o host | M |
| H12 | O editor **funciona sozinho em modo de teste** (com dados simulados) para desenvolver sem o Ultrastudio | M |
| H13 | Falha de comunicação com o host mostra aviso claro e **não descarta** o que a médica digitou | M |
| H14 | Autenticação/sessão: o editor **confia na sessão do Ultrastudio**; sem tela de login própria | M |
| H15 | Identificar onde o **laudo vive**: no banco do Ultrastudio (recomendado), no do editor, ou nos dois | ? |

---

## I. Dados estruturados e integração com a Curva de Crescimento

Hoje as medidas obstétricas vão ao Supabase para o app `curva-fetal`. Decisão pendente: o app continua, o Ultrastudio absorve o gráfico, ou ambos.

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| I1 | Manter as **quatro regras do contrato atual** (CPF pontuado, insert sem `id`, filtro de lixeira, só colunas do schema) enquanto o Supabase existir | M | [E] |
| I2 | Um `exams` por feto/embrião, com replicação dos dados maternos (uterinas, colo, riscos) em cada feto | M | [E] |
| I3 | Reconciliar **divergências** (GPA, nome, cronologia) com escolha da médica, nunca sobrescrever em silêncio | M | [A] |
| I4 | Flags de risco só sobem (`true`), nunca revertem sozinhas | M | [E] |
| I5 | Se o Ultrastudio virar a fonte da verdade: **migrar** pacientes/gestações/exames existentes do Supabase sem duplicar nem perder | ? | [N] |
| I6 | Esquema dos dados estruturados **igual para todos os consumidores** (Curvas, Ultrastudio, relatórios) | M | [N] |

---

## J. Saída e documentos

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| J1 | **PDF** gerado de forma determinística (não depender do diálogo de impressão do navegador), com as mesmas quebras de página da tela | M | [A] |
| J2 | **Word (.docx)** com layout equivalente ao PDF (hoje é HTML renomeado `.doc`) | S | [A] |
| J3 | Impressão em **papel timbrado físico** (margens 3,5 cm topo / 2 cm pé e laterais) **e** em papel branco com timbrado digital | M | [A] |
| J4 | Nome do arquivo = *paciente – exame – data*; sem caracteres inválidos | M | [E] |
| J5 | Laudo em mais de uma folha: cabeçalho de identificação repetido, "Continua…", numeração de páginas, assinatura na última | M | [E] |
| J6 | Suporte a **duas vias** ou versão resumida para a paciente | C | [N] |
| J7 | **QR Code / link de verificação** do laudo | C | [N] |
| J8 | Enviar por e-mail/WhatsApp/portal | C | [N] |
| J9 | Laudos anexos: relatório evolutivo, gráficos de referência, folha FMF | M | [E] |

---

## K. Segurança, privacidade e conformidade

Dados de saúde são dado pessoal sensível (**LGPD**).

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| K1 | **Controle de acesso** por perfil: médica, digitadora, recepção, administrador | M | [N] |
| K2 | **Trilha de auditoria** de acesso (quem abriu, imprimiu, alterou) | M | [N] |
| K3 | Dados em repouso e em trânsito **criptografados** | M | [N] |
| K4 | **Nada de dados clínicos** em `localStorage` sem necessidade; se existir, apagar ao trocar de usuário/paciente | M | [A] |
| K5 | Regras de acesso do banco (RLS ou equivalente) **versionadas** junto do código | M | [N] |
| K6 | **Retenção e descarte**: prontuário eletrônico tem prazo legal (no Brasil, 20 anos em prontuário; verificar norma aplicável) | M | [N] |
| K7 | **Backup e restauração** testados | M | [N] |
| K8 | Consentimento e direitos do titular (acesso, correção, exclusão) atendidos pelo host, com ganchos no editor | S | [N] |
| K9 | CFM/CRM: identificação do profissional no laudo conforme norma; Res. CFM sobre prontuário eletrônico e assinatura | M | [N] |
| K10 | Nenhum dado clínico em logs de erro ou telemetria | M | [N] |

---

## L. Configuração e manutenção

| ID | Requisito | Prio | Orig. |
|---|---|---|---|
| L1 | **Modelos de laudo** (estrutura, campos, frases, referências) como **dados** versionados, não só código | S | [N] |
| L2 | **Frases e valores de referência por médica** (perfil individual) e por clínica (padrão) | M | [A] |
| L3 | **Novo laudo** = configuração + pouco código; hoje é "copiar um HTML parecido" | S | [A] |
| L4 | Atualizar o editor **sem tocar em dados já emitidos**: laudo emitido guarda o texto final e a versão do modelo que o gerou | M | [N] |
| L5 | **Suíte de testes de regressão** (a atual compara o HTML de saída antes/depois) rodando automaticamente a cada mudança | S | [A] |
| L6 | Versionamento do editor e **registro de qual versão** gerou cada laudo | M | [N] |
| L7 | Impedir que uma cópia antiga de um laudo desfaça correções (hoje risco de "Add files via upload") | M | [A] |
| L8 | Ambiente de **homologação** separado da clínica | S | [N] |

---

## M. Migração do que já existe

| ID | Requisito | Prio |
|---|---|---|
| M1 | Migrar `patients`, `gestacoes` e `exams` do Supabase para o destino escolhido (I5), mantendo IDs de referência | ? |
| M2 | Migrar `laudos_ovulacao` (snapshots de ciclo) | S |
| M3 | Tratar `laudos_tv` e `laudos_pelvico_infantil` (histórico legado, sem gravação nova) | C |
| M4 | **Rascunhos em `localStorage`** de hoje: definir se serão descartados ou importados | C |
| M5 | Preservar frases e valores de referência **personalizados** da Dra. Morgana | M |
| M6 | Período de **convivência** em que os dois sistemas existem, sem duplicar registro | S |

---

## N. Não funcionais

| ID | Requisito | Prio |
|---|---|---|
| N1 | Abrir o editor em **menos de ~2 s** e responder à digitação sem atraso perceptível | M |
| N2 | Laudo de **3+ folhas com imagens** imprime sem travar | M |
| N3 | Uso em **tela cheia de consultório**: resolução, zoom, uso com mouse e teclado; toque (tablet) desejável | S |
| N4 | Navegadores/engines suportados definidos (hoje: Chromium) | M |
| N5 | Desempenho com pacientes de **longo histórico** (anos de exames) | S |
| N6 | Acessibilidade mínima: contraste, foco de teclado, tamanho de fonte | C |
| N7 | Tudo em **pt-BR**, datas `DD/MM/AAAA`, decimais com vírgula | M |
| N8 | Fuso horário consistente entre editor e host | M |

---

## O. Lista "não esquecer depois" — detalhes que costumam aparecer só no fim

Marque cada um como **decidido / a decidir / não se aplica**.

1. Paciente **sem CPF** (criança, estrangeira) — B2
2. **CPF corrigido** depois de haver exames — B5
3. **Duas pacientes fundidas** — B6
4. **Gestação encerrada** (parto, aborto, perda) e o que acontece com exames posteriores — D5
5. **Gemelar que vira feto único** (perda de um) e o histórico dos gráficos — D9
6. **Troca de cronologia oficial** no meio da gestação e IG dos exames já emitidos — D6
7. **Laudo emitido com erro**: retificar sem apagar o original — E5
8. **Duas médicas** no mesmo exame (executante e assinante) — E8
9. **Digitadora** que prepara e médica que só revisa e assina — E8
10. **Data do exame retroativa** (laudar dias depois) e IG calculada nessa data — D7
11. **Rascunho aberto por dias**; dois computadores editando o mesmo laudo (conflito) — E2/E3
12. **Imagem trocada/removida** depois da emissão — G7
13. **Nome do paciente queimado na imagem** do aparelho — G6
14. **Laudo sem internet** / Ultrastudio fora do ar — H13/A5
15. **Impressão em timbrado físico vs digital** e em duas vias — J3/J6
16. **Retenção legal** de prontuário e como descartar — K6
17. **Backup** e restauração testados — K7
18. **Atualização do editor** que muda uma fórmula: laudos antigos não podem mudar — L4
19. **Frases personalizadas** de cada médica migradas — M5
20. **Convênio, número de guia, indicação clínica** aparecem no laudo? — H2
21. **Laudo em outro idioma** (paciente estrangeira)? — N7
22. **Cópia de laudos antigos** por solicitação do paciente (LGPD) — K8
23. **Mais de uma unidade/clínica** no mesmo Ultrastudio — L2
24. **Venda a outras clínicas** (multi-tenant) — hoje o sistema é de uma médica só

---

## P. Decisões em aberto (bloqueiam o planejamento)

| # | Pergunta | Depende de |
|---|---|---|
| 1 | Onde o **laudo emitido** é guardado: Ultrastudio, Supabase ou ambos? (H15) | Ultrastudio |
| 2 | Como o editor é **embutido** (iframe/WebView/janela)? (H) | Tecnologia do Ultrastudio |
| 3 | O **Ultrastudio passa a ser a fonte de pacientes** ou o Supabase continua? (I5) | Ultrastudio |
| 4 | O app de **Curva de Crescimento** continua separado ou é absorvido? (I) | Dra. Morgana |
| 5 | Como as **imagens** chegam ao editor: arquivo, URL, base64? (G1) | Ultrastudio |
| 6 | **Assinatura digital** é exigida? (E9) | Dra. Morgana / CRM |
| 7 | O produto será **vendido a outras clínicas**? | Dra. Morgana / marido |
| 8 | Quais dos 14 laudos entram na **primeira entrega**? | Dra. Morgana |
| 9 | Servidor **local ou na nuvem**? (K, N) | Ultrastudio |
| 10 | Quem é responsável por **LGPD** e prazos de retenção? (K6) | Dra. Morgana |

---

## Q. Como este documento vai crescer

Próximas camadas a detalhar, por ordem de risco:
1. **Modelo de dados unificado** (paciente → atendimento → episódio → exame → laudo → versão → imagens), com diagrama.
2. **Contrato H** em detalhe (campos, tipos, exemplos JSON, eventos).
3. **Regras por episódio** (gestação, ciclo, FIV, puberdade) com máquina de estados.
4. **Plano de migração** (M) com dados reais.
5. **Plano de entrega por fases** (qual laudo primeiro).
