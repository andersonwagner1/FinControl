export type TipoLancamento = 'CREDITO' | 'DEBITO' | 'TRANSFERENCIA' | 'APLICACAO' | 'RESGATE';

       

export interface Lancamento {

banco? : string;
bancoContaId : number;

conta?: string;

data: string;

id?: number;

observacao: string;

saldo?: number;

tipo: TipoLancamento;

tipoMovimentacao?: string;

tipoMovimentacaoId: number;

transferenciaId?: number | null;

valor: number;  



  /*id?: number;
  bancoContaId: number;
  tipo: TipoLancamento;

  tipoMovimentacao: string;

  banco : string;

  conta : string;
  
  tipoMovimentacao : 
  valor: number;
  data: string;
  
  observacao?: string;
  saldoApos?: number;
  transferenciaId?: number;
  investimentoId?: number;*/
}

