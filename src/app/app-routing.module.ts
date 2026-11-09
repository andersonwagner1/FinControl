import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'contas',
    loadChildren: () => import('./features/contas/contas.module').then(m => m.ContasModule)
  },
  {
    path: 'cartao-de-credito',
    loadChildren: () => import('./features/cartao-de-credito/cartao-de-credito.module').then(m => m.CartaoDeCreditoModule)
  },
  {
    path: 'lancamentos',
    loadChildren: () => import('./features/lancamentos/lancamentos.module').then(m => m.LancamentosModule)
  },
  {
    path: 'transferencias',
    loadChildren: () => import('./features/transferencias/transferencias.module').then(m => m.TransferenciasModule)
  },
  {
    path: 'bancos',
    loadChildren: () => import('./features/bancos/bancos.module').then(m => m.BancosModule)
  },
  {
    path: 'contas-base',
    loadChildren: () => import('./features/contas-base/contas-base.module').then(m => m.ContasBaseModule)
  },
  {
    path: 'vinculos',
    loadChildren: () => import('./features/vinculos/vinculos.module').then(m => m.VinculosModule)
  },
  {
    path: 'categorias',
    loadChildren: () => import('./features/categorias/categorias.module').then(m => m.CategoriasModule)
  },
  {
    path: 'investimentos',
    loadChildren: () => import('./features/investimentos/investimentos.module').then(m => m.InvestimentosModule)
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
