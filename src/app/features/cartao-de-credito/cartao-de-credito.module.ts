import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { CartaoDeCreditoComponent } from './cartao-de-credito.component';

const routes: Routes = [
  { path: '', component: CartaoDeCreditoComponent }
];

@NgModule({
  declarations: [CartaoDeCreditoComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class CartaoDeCreditoModule {}
