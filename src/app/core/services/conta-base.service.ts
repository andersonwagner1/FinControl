import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ContaBase } from '../models/conta-base.model';

@Injectable({ providedIn: 'root' })
export class ContaBaseService {
  private readonly apiUrl = 'http://localhost:8080/api/contas-base';
  private contasBase$ = new BehaviorSubject<ContaBase[]>([]);

  constructor(private http: HttpClient) {
    this.http.get<ContaBase[]>(this.apiUrl).subscribe({ next: contas => this.contasBase$.next(contas), error: () => undefined });
  }

  getContasBase(): Observable<ContaBase[]> {
    return this.contasBase$.asObservable();
  }

  getContasBaseSnapshot(): ContaBase[] {
    return this.contasBase$.getValue();
  }

  getContaBaseById(id: number): ContaBase | undefined {
    return this.contasBase$.getValue().find(c => c.id === id);
  }

  adicionarContaBase(contaBase: ContaBase): void {
    this.http.post<ContaBase>(this.apiUrl, contaBase).subscribe({ next: salvo => this.contasBase$.next([...this.contasBase$.getValue(), salvo]) });
  }

  atualizarContaBase(contaAtualizada: ContaBase): void {
    this.http.put<ContaBase>(`${this.apiUrl}/${contaAtualizada.id}`, contaAtualizada).subscribe({ next: salvo => this.contasBase$.next(this.contasBase$.getValue().map(c => c.id === salvo.id ? salvo : c)) });
  }
}
