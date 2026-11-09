import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

import { Categoria, StatusCategoria, TipoCategoria } from '../models/categoria.model';

const STORAGE_KEY = 'controle-financeiro-categorias';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly apiUrl = 'http://localhost:8080/api/categorias';
  private categorias$ = new BehaviorSubject<Categoria[]>(this.carregarCategorias());

  constructor(private http: HttpClient) {
    this.http.get<Categoria[]>(this.apiUrl).subscribe({ next: categorias => this.categorias$.next(categorias), error: () => undefined });
  }

  getCategorias() {
    return this.categorias$.asObservable();
  }

  getCategoriasSnapshot(): Categoria[] {
    return this.categorias$.getValue();
  }

  adicionarCategoria(nome: string, tipo: TipoCategoria): void {
    const categoria: Categoria = {      
      nome: nome.trim(),
      tipo,
      ativo: 'SIM'
    };
    this.http.post<Categoria>(this.apiUrl, categoria).subscribe({ next: salvo => this.atualizar([...this.getCategoriasSnapshot(), salvo]) });
  }

  atualizarCategoria(categoria: Categoria): void {
    const atualizada = { ...categoria, nome: categoria.nome.trim() };
    this.http.put<Categoria>(`${this.apiUrl}/${categoria.id}`, atualizada).subscribe({ next: salvo => this.atualizar(this.getCategoriasSnapshot().map(item => item.id === salvo.id ? salvo : item)) });
  }

  alterarStatus(id: number, ativo: StatusCategoria): void {
    this.http.patch<Categoria>(`${this.apiUrl}/${id}/status?ativo=${ativo}`, {}).subscribe({ next: salvo => this.atualizar(this.getCategoriasSnapshot().map(item => item.id === salvo.id ? salvo : item)) });
  }

  removerCategoria(id: number): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({ next: () => this.atualizar(this.getCategoriasSnapshot().filter(item => item.id !== id)) });
  }

  private atualizar(categorias: Categoria[]): void {
    this.categorias$.next(categorias);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categorias));
  }

  private carregarCategorias(): Categoria[] {
    const armazenadas = localStorage.getItem(STORAGE_KEY);
    if (armazenadas) {
      try {
        return JSON.parse(armazenadas) as Categoria[];
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    return [
      //...CATEGORIAS_CREDITO.map((nome, index) => ({ id: `${index}`, nome, tipo: 'CREDITO' as TipoCategoria, ativo: 'A' as StatusCategoria })),
      //...CATEGORIAS_DEBITO.filter(nome => nome !== 'Transferência Enviada').map((nome, index) => ({ id: `cat-d-${index}`, nome, tipo: 'D' as TipoCategoria, ativo: 'A' as StatusCategoria })),
      //{ id: 'cat-t-0', nome: 'Transferência Enviada', tipo: 'T' as TipoCategoria, ativo: 'A' as StatusCategoria },
      //{ id: 'cat-t-1', nome: 'Transferência Recebida', tipo: 'T' as TipoCategoria, ativo: 'A' as StatusCategoria }
    ];
  }
}
