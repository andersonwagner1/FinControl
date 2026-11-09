export interface Cartao {
  id: number;
  vinculoId: number;
  nome: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  dataAbertura: string;
  dataFechamento?: string;
  ativa: boolean;
}

export type CartaoInput = Omit<Cartao, 'id'> & { id?: number };
