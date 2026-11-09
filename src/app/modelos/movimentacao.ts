export type TipoMovimentacao = 'entrada' | 'saida';

export interface Movimentacao {
  identificador: string;
  descricao: string;
  categoria: string;
  tipo: TipoMovimentacao;
  tipoMovimentacao?: string;
  saldo?: number | null;
  valor: number;
  data: string;
  banco: string;
  conta: string;
}

export interface MovimentacaoConsulta {
  id: number;
  nrPosicao: number;
  dtMovimentacao: string | number | null;
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

export type DadosMovimentacao = Omit<Movimentacao, 'identificador'>;
