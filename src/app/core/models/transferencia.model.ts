export interface Transferencia {
  id: number;
  contaOrigemId: number;
  contaDestinoId: number;
  valor: number;
  data: string;
  descricao: string;
}
