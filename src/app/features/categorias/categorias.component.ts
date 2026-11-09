import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Categoria, StatusCategoria, TipoCategoria, STATUS_CATEGORIA, TIPOS_CATEGORIA } from '../../core/models/categoria.model';
import { CategoriaService } from '../../core/services/categoria.service';

@Component({
  selector: 'app-categorias',
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.scss']
})
export class CategoriasComponent implements OnInit, OnDestroy {
  private subs = new Subscription();
  categorias: Categoria[] = [];
  categoriasFiltradas: Categoria[] = [];
  form!: FormGroup;
  showModal = false;
  editando: Categoria | null = null;
  filtroTipo: TipoCategoria | 'todos' = 'todos';
  filtroStatus: StatusCategoria | 'todos' = 'SIM';
  tipos = TIPOS_CATEGORIA;
  status = STATUS_CATEGORIA;

  constructor(private categoriaService: CategoriaService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      tipo: ['D', Validators.required]
    });
    this.subs.add(this.categoriaService.getCategorias().subscribe(categorias => {
      this.categorias = categorias;
      this.aplicarFiltros();
    }));
  }

  aplicarFiltros(): void {
    this.categoriasFiltradas = this.categorias.filter(categoria =>
      (this.filtroTipo === 'todos' || categoria.tipo === this.filtroTipo) &&
      (this.filtroStatus === 'todos' || categoria.ativo === this.filtroStatus)
    );
  }

  getTotal(tipo: TipoCategoria, ativo: StatusCategoria): number {
    return this.categorias.filter(categoria => categoria.tipo === tipo && categoria.ativo === ativo).length;
  }

  abrirModal(categoria?: Categoria): void {
    this.editando = categoria || null;
    this.form.reset({ nome: categoria?.nome || '', tipo: categoria?.tipo || 'D' });
    this.showModal = true;
  }

  salvar(): void {
    if (this.form.invalid) return;
    const valor = this.form.value;
    if (this.editando) {
      this.categoriaService.atualizarCategoria({ ...this.editando, nome: valor.nome, tipo: valor.tipo });
    } else {
      this.categoriaService.adicionarCategoria(valor.nome, valor.tipo);
    }
    this.fecharModal();
  }

  


  alternarStatus(categoria: Categoria): void {
    this.categoriaService.alterarStatus(categoria.id!, categoria.ativo === 'SIM' ? 'NAO' : 'SIM');
  }

  excluir(categoria: Categoria): void {
    if (confirm(`Excluir a categoria "${categoria.nome}"?`)) {
      this.categoriaService.removerCategoria(categoria.id!);
    }
  }

  fecharModal(): void {
    this.showModal = false;
    this.editando = null;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
