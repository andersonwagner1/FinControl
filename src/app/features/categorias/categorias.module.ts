import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { CategoriasComponent } from './categorias.component';

const routes: Routes = [
  { path: '', component: CategoriasComponent }
];

@NgModule({
  declarations: [CategoriasComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class CategoriasModule {}
