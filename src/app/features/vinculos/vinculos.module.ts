import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { VinculosComponent } from './vinculos.component';

const routes: Routes = [
  { path: '', component: VinculosComponent }
];

@NgModule({
  declarations: [VinculosComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class VinculosModule {}
