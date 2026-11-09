# Finora — Controle financeiro

Aplicação Angular para acompanhar entradas e saídas, visualizar um resumo do período e registrar movimentações por banco e conta.

## Executar localmente

Instale as dependências do aplicativo Angular:

```bash
npm install
```

Inicie também a API em `E:\Development\projeto\api-financa`:

```bash
mvn spring-boot:run
```

O painel consulta `GET http://localhost:8080/api/bancos-contas/disponiveis?mes={mes}&ano={ano}` para listar os vínculos banco/conta ativos cuja competência inclui o período informado, e `GET http://localhost:8080/api/tipos-movimentacao/ativos` para carregar os tipos disponíveis no seletor pesquisável de movimentação. Para tipos classificados como aplicação, resgate ou transferência, consulta `GET http://localhost:8080/api/transferencias/disponiveis?bancoContaId={id}` para apresentar destinos possíveis. Para aplicação ou resgate, consulta também `GET http://localhost:8080/api/investimentos/banco-conta/{bancoContaId}/ativos` usando o ID da conta selecionada em "Transferir para".

A tabela do painel consulta `GET http://localhost:8080/api/movimentacoes/consulta?ano={ano}&mes={mes}&bancoId={bancoId}&contaId={contaId}` e atualiza os resultados quando qualquer um desses filtros muda. Após salvar uma movimentação, a tabela é consultada novamente. Ao salvar pelo painel, o aplicativo envia `POST http://localhost:8080/api/movimentacoes/lancamento` com os campos `bancoContaId`, `tipoMovimentacaoId`, `nrPosicao`, `dtMovimentacao`, `valor`, `observacao` e `investimentoId`.

Cada registro da tabela permite editar data, tipo, valor e observação por `PUT /api/movimentacoes/{id}`, ou excluir por `DELETE /api/movimentacoes/{id}` após confirmação. Transferências com registros vinculados não podem ser alteradas ou excluídas individualmente. A API recalcula os saldos após alterações e exclusões.

A tela `/cartoes-credito` consulta `GET /api/cartoes-credito` e `GET /api/competencias` para exibir compras e resumos por competência. Ela envia compras para `POST /api/cartoes-credito/lancamento-cartao` com `dtMovimentacao`, `vlDebito`, `dsObservacao`, `icSituacao`, `bancoContaId`, `competenciaId`, `tipoMovimentacaoId` e `nrParcelas`. O resumo relaciona cada compra à competência por `competenciaId`, incluindo parcelas em competências futuras.

O dashboard `/dashboard-financeiro` reúne movimentações e cadastros da API para apresentar KPIs, fluxo de caixa, despesas por categoria, investimentos, origem das rendas e tabela paginada. Os filtros permitem selecionar mês/ano ou intervalo de datas, banco/conta, categoria e tipo de relatório; o botão no cabeçalho alterna o tema claro/escuro.

O componente reutilizável `app-sankey-financeiro` recebe `[movimentacoes]` no formato `MovimentacaoFinanceira[]` e `[saldoAnterior]` como número em reais. Ele agrupa as entradas e saídas, detalha aplicações por investimento e apresenta o saldo residual; quando as saídas superam o saldo disponível, exibe um aviso de déficit. A tabela abaixo do Sankey agrupa as movimentações por ano/mês, aplica a fórmula de fechamento mensal e transporta o saldo final para a competência seguinte. O filtro da tabela inicia no ano atual; deixe o campo de ano vazio para exibir todos os anos.

Inicie o Angular:

```bash
npm start
```

Abra `http://localhost:4200/` no navegador.

## Funcionalidades

- Dashboard com resumo e tabela de movimentações consultados na API para o período e filtros selecionados.
- Filtros por banco, conta, mês e ano.
- Modal de lançamento no painel integrado à API.
- Lançamentos parcelados de cartão de crédito com resumo por competência.
- Dashboard financeiro em `/dashboard-financeiro`, com filtros, indicadores, gráficos e tema escuro.
- Formulário em `/movimentacoes/nova` com persistência local e dados de exemplo neste navegador.

## Verificação

```bash
npm run build
npm test -- --watch=false
```

Os dados das movimentações continuam sendo mantidos no navegador. A listagem de bancos e contas usa a API local.
