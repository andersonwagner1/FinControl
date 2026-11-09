import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ContasComponent } from './contas.component';

const routes: Routes = [
  { path: '', component: ContasComponent }
];

@NgModule({
  declarations: [ContasComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ContasModule {}
