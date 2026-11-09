import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  collapsed = false;

  menus: MenuItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'grid' },
    { path: '/contas', label: 'Contas (Geral)', icon: 'credit-card' },
    { path: '/cartao-de-credito', label: 'Cartão de crédito', icon: 'card' },
    { path: '/lancamentos', label: 'Lançamentos', icon: 'list' },
    { path: '/transferencias', label: 'Transferências', icon: 'arrow-right-left' },
    { path: '/bancos', label: 'Bancos', icon: 'briefcase' },
    { path: '/contas-base', label: 'Tipos de Conta', icon: 'layers' },
    { path: '/vinculos', label: 'Vínculos', icon: 'link' },
    { path: '/categorias', label: 'Categorias', icon: 'tag' },
    { path: '/investimentos', label: 'Investimentos', icon: 'chart' },
  ];

  constructor(public router: Router) {}

  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  isActive(path: string): boolean {
    return this.router.url.startsWith(path);
  }
}
