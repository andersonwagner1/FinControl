import { Routes } from '@angular/router';

export const rotas: Routes = [
  {
    path: 'dashboard-financeiro',
    loadComponent: () => import('./dashboard-financeiro/dashboard-financeiro').then((modulo) => modulo.ComponenteDashboardFinanceiro),
    title: 'Dashboard financeiro | Finora',
  },
  {
    path: '',
    loadComponent: () => import('./movimentacao/movimentacao').then((modulo) => modulo.ComponentePainel),
    title: 'Painel | Finora',
  },  
  {
    path: 'cartoes-credito',
    loadComponent: () => import('./cartoes-credito/cartoes-credito').then((modulo) => modulo.ComponenteCartoesCredito),
    title: 'Cartão de crédito | Finora',
  },
  {
    path: 'competencias',
    loadComponent: () => import('./competencias/competencias').then((modulo) => modulo.ComponenteCompetencias),
    title: 'Competências | Finora',
  },
  {
    path: 'tipos-movimentacao',
    loadComponent: () => import('./tipos-movimentacao/tipos-movimentacao').then((modulo) => modulo.ComponenteTiposMovimentacao),
    title: 'Tipos de movimentação | Finora',
  },
  {
    path: 'movimentacoes-finais',
    loadComponent: () => import('./movimentacoes-finais/movimentacoes-finais').then((modulo) => modulo.ComponenteMovimentacoesFinais),
    title: 'Movimentação de fechamento | Finora',
  },
  { path: '**', redirectTo: '' },
];
