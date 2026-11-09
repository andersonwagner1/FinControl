export type TipoCategoria = 'CREDITO' | 'DEBITO' | 'TRANSFERENCIA' | 'APLICACAO' | 'RESGATE' | 'TODOS';
export type StatusCategoria = 'SIM' | 'NAO';
export type CodigoRelatorio = 'CREDITO' | 'RENDA' | 'RENDIMENTO_NEGATIVO' | 'CARTAO' | 'APLICACAO' | 'RESGATE' | 'DEBITO' | 'MENSAL' | 'RENDIMENTO';

export interface Categoria {
  id?: number;
  nome: string;
  tipo: TipoCategoria;
  ativo: StatusCategoria;
  icRelatorio?: CodigoRelatorio | null;
}

export const TIPOS_CATEGORIA: Record<TipoCategoria, string> = {
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
  TRANSFERENCIA: 'Transferência',
  APLICACAO:'aPLICAÇÃO',
  RESGATE:'resgate',
  TODOS: "Todos"
};

export const STATUS_CATEGORIA: Record<StatusCategoria, string> = {
  SIM: 'Ativo',
  NAO: 'Inativo'
};
