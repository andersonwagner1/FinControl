import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ContasBaseComponent } from './contas-base.component';

const routes: Routes = [
  { path: '', component: ContasBaseComponent }
];

@NgModule({
  declarations: [ContasBaseComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ContasBaseModule {}
