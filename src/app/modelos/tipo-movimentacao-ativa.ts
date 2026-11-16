export type IndicadorTipoMovimentacao = 'CREDITO' | 'DEBITO' | 'APLICACAO' | 'TRANSFERENCIA' | 'RESGATE';

export interface TipoMovimentacaoAtiva {
  id: number;
  dsTipoMovimentacao: string;
  dsCategoria: string;
  categoriaId?: number | null;
  icTipoMovimentacao: IndicadorTipoMovimentacao;
}

export interface CategoriaMovimentacao {
  id: number;
  dsCategoria: string;
  icTipo?: string;
}
