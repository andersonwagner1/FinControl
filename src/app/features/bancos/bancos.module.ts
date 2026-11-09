import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { BancosComponent } from './bancos.component';

const routes: Routes = [
  { path: '', component: BancosComponent }
];

@NgModule({
  declarations: [BancosComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class BancosModule {}
