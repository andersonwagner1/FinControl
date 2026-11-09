export interface InvestimentoAtivo {
  id: number;
  bancoContaId: number;
  dsInvestimento: string;
  icSituacao: 'SIM' | 'NAO';
}
