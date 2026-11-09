export interface LancamentoMovimentacao {
  bancoContaId: number;
  tipoMovimentacaoId: number;
  nrPosicao: number;
  dtMovimentacao: string;
  valor: number;
  observacao: string;
  investimentoId: number | null;

  transferenciaId: number | null;
}

export interface MovimentacaoLancada {
  id: number;
  nrPosicao: number;
  dtMovimentacao: string;
  nrDia: number;
  vlCredito: number | null;
  vlDebito: number | null;
  vlSaldo: number | null;
  dsObservacao: string | null;
  icCalcular: string;
  icSituacao: string;
  bancoContaId: number;
  competenciaId: number;
  tipoMovimentacaoId: number;
  vinculadoId: number | null;
  investimentoId: number | null;
}
