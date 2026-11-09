import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { TransferenciasComponent } from './transferencias.component';

const routes: Routes = [
  { path: '', component: TransferenciasComponent }
];

@NgModule({
  declarations: [TransferenciasComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class TransferenciasModule {}
