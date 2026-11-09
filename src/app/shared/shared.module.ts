import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CurrencyBrPipe } from './pipes/currency-br.pipe';
import { ContasByBancoPipe } from './pipes/contas-by-banco.pipe';
import { TotalTransferidoPipe } from './pipes/total-transferido.pipe';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';

@NgModule({
  declarations: [
    CurrencyBrPipe,
    ContasByBancoPipe,
    TotalTransferidoPipe,
    SidebarComponent,
    HeaderComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CurrencyBrPipe,
    ContasByBancoPipe,
    TotalTransferidoPipe,
    SidebarComponent,
    HeaderComponent,
  ]
})
export class SharedModule {}
