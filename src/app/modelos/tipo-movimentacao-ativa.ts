export type IndicadorTipoMovimentacao = 'CREDITO' | 'DEBITO' | 'APLICACAO' | 'TRANSFERENCIA' | 'RESGATE';

export interface TipoMovimentacaoAtiva {
  id: number;
  dsTipoMovimentacao: string;
  dsCategoria: string;
  icTipoMovimentacao: IndicadorTipoMovimentacao;
}
