export type TipoRelatorio = 'DEBITO' | 'APLICACAO' | 'RESGATE' | 'RENDIMENTO' | 'MENSAL' | 'CREDITO' | 'RENDA' | string;
export type TipoFinanceiro = 'TD' | 'TC' | 'C' | 'D' | 'A' | 'R' | string;

export interface LinhaDashboardFinanceiro {
  id: number;
  idConta: number | null;
  idBanco: number | null;
  bancoConta: string;
  dsObservacao: string;
  dtMovimentacao: string | null;
  nrDia: number;
  nrMes: number;
  nrAno: number;
  vlCredito: number;
  vlDebito: number;
  vlSaldo?: number | null;
  idTipoMovimentacao: number | null;
  dsTipoMovimentacao: string;
  icRelatorio: TipoRelatorio;
  dsCategoria: string;
  icTipo: TipoFinanceiro;
  dsInvestimento: string;
}

export interface IndicadorDashboard {
  totalEntradas: number;
  totalSaidas: number;
  saldoLiquido: number;
  totalInvestido: number;
}

export interface FluxoFinanceiro {
  periodo: string;
  entradas: number;
  saidas: number;
}

export interface ValorAgrupado {
  nome: string;
  valor: number;
  secundario?: number;
}

export function calcularIndicadoresFinanceiros(linhas: readonly LinhaDashboardFinanceiro[]): IndicadorDashboard {
  let totalEntradas = 0;
  let totalSaidas = 0;
  let totalInvestido = 0;

  for (const linha of linhas) {
    if (['C'].includes(linha.icTipo)) { //removido td e r
      totalEntradas += linha.vlCredito;
    }
    if (['D'].includes(linha.icTipo)) { //removido td e a
      totalSaidas += linha.vlDebito;
    }
    if (linha.icTipo === 'A' || linha.icRelatorio === 'APLICACAO') {
      totalInvestido += linha.vlDebito;
    }
  }

  return {
    totalEntradas,
    totalSaidas,
    saldoLiquido: totalEntradas - totalSaidas,
    totalInvestido,
  };
}

export function agregarPorCategoria(linhas: readonly LinhaDashboardFinanceiro[]): ValorAgrupado[] {
  return agregar(linhas.filter((linha) => linha.vlDebito > 0), (linha) => linha.dsCategoria, (linha) => linha.vlDebito);
}

export function agregarInvestimentos(linhas: readonly LinhaDashboardFinanceiro[]): ValorAgrupado[] {
  const totais = new Map<string, ValorAgrupado>();
  for (const linha of linhas) {
    if (linha.icTipo !== 'A' && linha.icTipo !== 'R') {
      continue;
    }
    const nome = linha.dsInvestimento || linha.bancoConta || 'Não identificado';
    const atual = totais.get(nome) ?? { nome, valor: 0, secundario: 0 };
    if (linha.icTipo === 'A') {
      atual.valor += linha.vlDebito;
    } else {
      atual.secundario = (atual.secundario ?? 0) + linha.vlCredito;
    }
    totais.set(nome, atual);
  }
  return [...totais.values()].sort((a, b) => b.valor + (b.secundario ?? 0) - a.valor - (a.secundario ?? 0));
}

export function agregarOrigemRendas(linhas: readonly LinhaDashboardFinanceiro[]): ValorAgrupado[] {
  return agregar(
    linhas.filter((linha) => ['C', 'TC', 'R'].includes(linha.icTipo)),
    (linha) => linha.dsCategoria || linha.bancoConta || 'Não identificado',
    (linha) => linha.vlCredito,
  ).slice(0, 6);
}

function agregar(
  linhas: readonly LinhaDashboardFinanceiro[],
  chave: (linha: LinhaDashboardFinanceiro) => string,
  valor: (linha: LinhaDashboardFinanceiro) => number,
): ValorAgrupado[] {
  const totais = new Map<string, number>();
  for (const linha of linhas) {
    const nome = chave(linha) || 'Não categorizado';
    totais.set(nome, (totais.get(nome) ?? 0) + valor(linha));
  }
  return [...totais.entries()]
    .map(([nome, total]) => ({ nome, valor: total }))
    .sort((a, b) => b.valor - a.valor);
}
