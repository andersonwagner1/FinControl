import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { LancamentosComponent } from './lancamentos.component';

const routes: Routes = [
  { path: '', component: LancamentosComponent }
];

@NgModule({
  declarations: [LancamentosComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class LancamentosModule {}
