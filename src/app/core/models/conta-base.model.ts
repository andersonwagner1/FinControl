import { TipoConta } from './conta.model';

export interface ContaBase {
  id: number;
  descricao: string;
  tipo: TipoConta;
}
