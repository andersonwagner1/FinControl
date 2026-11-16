export interface ResumoMovimentacaoFinal {
  vlSaldoInicial: number;
  vlSaldoFinal: number;
  vlTotalCredito: number;
  vlTotalDebito: number;
  icFechado: 'SIM' | 'NAO';
}

export interface MovimentacaoFinalMensal {
  id?: number;
  nrAno?: number;
  nrMes?: number;
  mes?: number;
  bancoId?: number;
  contaId?: number;
  bancoContaId?: number;
  vlSaldoInicial: number;
  vlSaldoFinal: number;
  vlEsperado: number;
  icFechado?: 'SIM' | 'NAO';
}
