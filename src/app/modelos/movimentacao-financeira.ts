export type RelatorioFinanceiro =
  | 'RESGATE'
  | 'CREDITO'
  | 'RENDA'
  | 'DEBITO'
  | 'MENSAL'
  | 'APLICACAO';

export interface MovimentacaoFinanceira {
  ano: number;
  mes: number;
  dsTipoMovimentacao: string;
  icRelatorio: RelatorioFinanceiro;
  dsInvestimento?: string;
  valor: number;
}

export interface LinhaTabelaMensal {
  ano: number;
  mes: number;
  saldoAnterior: number;
  credito: number;
  renda: number;
  totalCredito: number;
  mensal: number;
  debito: number;
  totalDebito: number;
  aplicacao: number;
  resgate: number;
  saldoFinal: number;
}

export interface SankeyNo {
  name: string;
  label: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyFinanceiro {
  nodes: SankeyNo[];
  links: SankeyLink[];
  totalEntradas: number;
  totalSaidas: number;
  saldoRemanescente: number;
  deficit: number;
}

const SALDO_ANTERIOR = { id: 'saldo-anterior', label: 'Saldo do Mês Anterior' };
const CONTA_CORRENTE = { id: 'conta-corrente', label: 'Conta Corrente' };
const APLICACAO = { id: 'aplicacao', label: 'Aplicação' };
const SALDO_ATUAL = { id: 'saldo-atual-em-conta', label: 'Saldo Atual em Conta' };
const INVESTIMENTO_NAO_IDENTIFICADO = 'Investimento não identificado';

export function montarFluxoSankey(
  movimentacoes: readonly MovimentacaoFinanceira[],
  saldoAnterior: number,
): SankeyFinanceiro {
  const saldoAnteriorCentavos = paraCentavos(saldoAnterior, 'saldoAnterior');
  const entradas = new Map<string, number>();
  const saidas = new Map<string, number>();
  const aplicacoes = new Map<string, number>();
  let totalEntradasCentavos = saldoAnteriorCentavos;
  let totalSaidasCentavos = 0;
  const nos = new Map<string, SankeyNo>();
  const links: SankeyLink[] = [];

  adicionarNo(nos, SALDO_ANTERIOR.id, SALDO_ANTERIOR.label);
  adicionarNo(nos, CONTA_CORRENTE.id, CONTA_CORRENTE.label);
  adicionarLigacoesAgrupadas(entradas, movimentacoes, ['RESGATE', 'CREDITO', 'RENDA']);
  adicionarLigacoesAgrupadas(saidas, movimentacoes, ['DEBITO', 'MENSAL']);
  adicionarAplicacoes(aplicacoes, movimentacoes);

  if (saldoAnteriorCentavos > 0) {
    links.push({
      source: SALDO_ANTERIOR.id,
      target: CONTA_CORRENTE.id,
      value: emUnidadeMonetaria(saldoAnteriorCentavos),
    });
  }

  for (const [descricao, valorCentavos] of entradas) {
    const nome = descricao || 'Entrada não identificada';
    const id = `entrada:${nome}`;
    adicionarNo(nos, id, nome);
    links.push({ source: id, target: CONTA_CORRENTE.id, value: emUnidadeMonetaria(valorCentavos) });
    totalEntradasCentavos += valorCentavos;
  }

  const totalAplicacoesCentavos = somar(aplicacoes.values());
  for (const [descricao, valorCentavos] of saidas) {
    const nome = descricao || 'Saída não identificada';
    const id = `saida:${nome}`;
    adicionarNo(nos, id, nome);
    links.push({ source: CONTA_CORRENTE.id, target: id, value: emUnidadeMonetaria(valorCentavos) });
    totalSaidasCentavos += valorCentavos;
  }

  if (totalAplicacoesCentavos > 0) {
    adicionarNo(nos, APLICACAO.id, APLICACAO.label);
    links.push({
      source: CONTA_CORRENTE.id,
      target: APLICACAO.id,
      value: emUnidadeMonetaria(totalAplicacoesCentavos),
    });
    for (const [destino, valorCentavos] of aplicacoes) {
      const id = `investimento:${destino}`;
      adicionarNo(nos, id, destino);
      links.push({ source: APLICACAO.id, target: id, value: emUnidadeMonetaria(valorCentavos) });
    }
    totalSaidasCentavos += totalAplicacoesCentavos;
  }

  const saldoCentavos = totalEntradasCentavos - totalSaidasCentavos;
  const saldoRemanescenteCentavos = Math.max(saldoCentavos, 0);
  const deficitCentavos = Math.max(-saldoCentavos, 0);
  if (saldoRemanescenteCentavos > 0) {
    adicionarNo(nos, SALDO_ATUAL.id, SALDO_ATUAL.label);
    links.push({
      source: CONTA_CORRENTE.id,
      target: SALDO_ATUAL.id,
      value: emUnidadeMonetaria(saldoRemanescenteCentavos),
    });
  }

  return {
    nodes: [...nos.values()],
    links,
    totalEntradas: emUnidadeMonetaria(totalEntradasCentavos),
    totalSaidas: emUnidadeMonetaria(totalSaidasCentavos),
    saldoRemanescente: emUnidadeMonetaria(saldoRemanescenteCentavos),
    deficit: emUnidadeMonetaria(deficitCentavos),
  };
}

export function agruparFluxoMensal(
  movimentacoes: readonly MovimentacaoFinanceira[],
  saldoInicial = 0,
): LinhaTabelaMensal[] {
  let saldoAnteriorCentavos = paraCentavosAssinados(saldoInicial, 'saldoInicial');
  const meses = new Map<string, {
    ano: number;
    mes: number;
    credito: number;
    renda: number;
    mensal: number;
    debito: number;
    aplicacao: number;
    resgate: number;
  }>();

  for (const movimentacao of movimentacoes) {
    validarCompetencia(movimentacao.ano, movimentacao.mes);
    const chave = `${movimentacao.ano}-${String(movimentacao.mes).padStart(2, '0')}`;
    const agrupado = meses.get(chave) ?? {
      ano: movimentacao.ano,
      mes: movimentacao.mes,
      credito: 0,
      renda: 0,
      mensal: 0,
      debito: 0,
      aplicacao: 0,
      resgate: 0,
    };
    const valorCentavos = paraCentavos(movimentacao.valor, 'valor');
    switch (movimentacao.icRelatorio) {
      case 'CREDITO':
        agrupado.credito += valorCentavos;
        break;
      case 'RENDA':
        agrupado.renda += valorCentavos;
        break;
      case 'MENSAL':
        agrupado.mensal += valorCentavos;
        break;
      case 'DEBITO':
        agrupado.debito += valorCentavos;
        break;
      case 'APLICACAO':
        agrupado.aplicacao += valorCentavos;
        break;
      case 'RESGATE':
        agrupado.resgate += valorCentavos;
        break;
    }
    meses.set(chave, agrupado);
  }

  return [...meses.values()]
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .map((mes): LinhaTabelaMensal => {
      const totalCreditoCentavos = saldoAnteriorCentavos + mes.credito + mes.renda;
      const totalDebitoCentavos = mes.mensal + mes.debito;
      const saldoFinalCentavos = totalCreditoCentavos - totalDebitoCentavos + mes.resgate - mes.aplicacao;
      const linha: LinhaTabelaMensal = {
        ano: mes.ano,
        mes: mes.mes,
        saldoAnterior: emUnidadeMonetaria(saldoAnteriorCentavos),
        credito: emUnidadeMonetaria(mes.credito),
        renda: emUnidadeMonetaria(mes.renda),
        totalCredito: emUnidadeMonetaria(totalCreditoCentavos),
        mensal: emUnidadeMonetaria(mes.mensal),
        debito: emUnidadeMonetaria(mes.debito),
        totalDebito: emUnidadeMonetaria(totalDebitoCentavos),
        aplicacao: emUnidadeMonetaria(mes.aplicacao),
        resgate: emUnidadeMonetaria(mes.resgate),
        saldoFinal: emUnidadeMonetaria(saldoFinalCentavos),
      };
      saldoAnteriorCentavos = saldoFinalCentavos;
      return linha;
    });
}

function validarCompetencia(ano: number, mes: number): void {
  if (!Number.isInteger(ano) || ano < 1 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new RangeError('Ano e mês devem representar uma competência válida.');
  }
}

function adicionarLigacoesAgrupadas(
  destino: Map<string, number>,
  movimentacoes: readonly MovimentacaoFinanceira[],
  relatorios: readonly RelatorioFinanceiro[],
): void {
  for (const movimento of movimentacoes) {
    if (!relatorios.includes(movimento.icRelatorio)) {
      continue;
    }
    somarNoMapa(destino, movimento.dsTipoMovimentacao || '', paraCentavos(movimento.valor, 'valor'));
  }
}

function adicionarAplicacoes(
  destino: Map<string, number>,
  movimentacoes: readonly MovimentacaoFinanceira[],
): void {
  for (const movimento of movimentacoes) {
    if (movimento.icRelatorio !== 'APLICACAO') {
      continue;
    }
    const nome = movimento.dsInvestimento?.trim() || INVESTIMENTO_NAO_IDENTIFICADO;
    somarNoMapa(destino, nome, paraCentavos(movimento.valor, 'valor'));
  }
}

function adicionarNo(nos: Map<string, SankeyNo>, id: string, label: string): void {
  if (!nos.has(id)) {
    nos.set(id, { name: id, label });
  }
}

function somarNoMapa(mapa: Map<string, number>, chave: string, valor: number): void {
  if (valor > 0) {
    mapa.set(chave, (mapa.get(chave) ?? 0) + valor);
  }
}

function somar(valores: Iterable<number>): number {
  let total = 0;
  for (const valor of valores) {
    total += valor;
  }
  return total;
}

function paraCentavos(valor: number, campo: string): number {
  if (valor < 0) {
    throw new RangeError(`${campo} deve ser um valor não negativo.`);
  }
  return paraCentavosAssinados(valor, campo);
}

function paraCentavosAssinados(valor: number, campo: string): number {
  if (!Number.isFinite(valor)) {
    throw new RangeError(`${campo} deve ser um valor financeiro finito.`);
  }
  const centavos = Math.round((valor + Number.EPSILON * Math.max(1, valor)) * 100);
  if (!Number.isSafeInteger(centavos)) {
    throw new RangeError(`${campo} excede o limite de precisão monetária suportado.`);
  }
  return centavos;
}

function emUnidadeMonetaria(centavos: number): number {
  return centavos / 100;
}
