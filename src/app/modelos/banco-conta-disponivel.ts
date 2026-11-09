export interface BancoContaDisponivel {
  bancoContaId: number;
  bancoId: number;
  nomeBanco: string;
  contaId: number;
  nomeConta: string;
}

export interface RetornoApi<T> {
  sucesso: boolean;
  mensagem: string;
  valor: T;
}
