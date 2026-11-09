export interface Vinculo {
  id: number;
  bancoId: number;
  contaBaseId: number;
  descricao?: string;
  saldo: number;
  dataInicio: string;
  dataFim?: string;
  rentabilidade?: number;
  vencimento?: string;
  limite?: number;
  diaFechamento?: number;
  diaVencimento?: number;
  ativa: boolean;
}
