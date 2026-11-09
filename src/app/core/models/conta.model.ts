export type TipoConta = 'CC' | 'CP' | 'RF' | 'PREV' | 'FII' | 'ACAO' | 'BC' | 'D' | 'RV';


export const TIPOS_CONTA: Record<TipoConta, { label: string; categoria: 'bancaria' | 'investimento'; cor: string; icone: string }> = {
  CC: { label: 'Corrente', categoria: 'bancaria', cor: '#4f8ef7', icone: '🏦' },
  CP: { label: 'Poupança', categoria: 'bancaria', cor: '#22c55e', icone: '🐷' },
  
  RF: { label: 'Renda Fixa (CDB, LCI/LCA, SELIC, Pré-fixado, Invest Fácil)', categoria: 'investimento', cor: '#8b5cf6', icone: '📈' },
  PREV: { label: 'IPCA (IPCA+)', categoria: 'investimento', cor: '#343979', icone: '👴' },
  FII: { label: 'Fundos de Investimentos', categoria: 'investimento', cor: '#f59e0b', icone: '🏢' },
  ACAO: { label: 'Ações', categoria: 'investimento', cor: '#3b82f6', icone: '📊' },
  BC: { label: 'BitCoin', categoria: 'investimento', cor: '#f97316', icone: '₿' },
  D: { label: 'Dólar', categoria: 'investimento', cor: '#10b981', icone: '💵' },
  RV: { label: 'Ações', categoria: 'investimento', cor: '#10b981', icone: '💵' }
};

export interface Conta {
  id?: number; // Opcional
  bancoId?: number;
  tipo: TipoConta;
  descricao: string;
  saldo: number;
  ativa: boolean;
  rentabilidade?: number; // % ao ano para investimentos
  vencimento?: string; // data para CDB/Tesouro
  limite?: number;
  diaFechamento?: number;
  diaVencimento?: number;
  dataAbertura: string;
  dataFechamento?: string;
}
