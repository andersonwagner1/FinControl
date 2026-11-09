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
  { path: '**', redirectTo: '' },
];
