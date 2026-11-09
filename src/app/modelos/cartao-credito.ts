export interface Competencia {
  id: number;
  nrAno: number;
  nrMes: number;
  dsMesAno: string;
}

export interface LancamentoCartaoCredito {
  id: number;
  bancoContaId: number;
  competenciaId: number;
  tipoMovimentacaoId: number;
  nrDia: string;
  dtMovimentacao: string | null;
  vlCompra: number;
  dsObservacao: string | null;
  nrParcelas: number;
  icSituacao: 'SIM' | 'NAO';
  vinculoId: number | null;
}

export interface NovoLancamentoCartaoCredito {
  dtMovimentacao: string;
  vlDebito: number;
  dsObservacao: string;
  icSituacao: 'SIM';
  bancoContaId: number;
  competenciaId: number;
  tipoMovimentacaoId: number;
  nrParcelas: number;
}

export type AtualizacaoLancamentoCartaoCredito = Omit<LancamentoCartaoCredito, 'dtMovimentacao'> & {
  dtMovimentacao: string;
};
