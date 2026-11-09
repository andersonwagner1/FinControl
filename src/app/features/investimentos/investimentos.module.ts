import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { InvestimentosComponent } from './investimentos.component';

const routes: Routes = [{ path: '', component: InvestimentosComponent }];

@NgModule({
  declarations: [InvestimentosComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class InvestimentosModule {}
