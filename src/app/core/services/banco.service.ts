import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Banco } from '../models/banco.model';

@Injectable({ providedIn: 'root' })
export class BancoService {
  private readonly apiUrl = 'http://localhost:8080/api/bancos';
  private bancos$ = new BehaviorSubject<Banco[]>([  ]);

  constructor(private http: HttpClient) {
    this.listarBancos().subscribe({ error: () => undefined });
  }

  getBancos(): Observable<Banco[]> {
    return this.bancos$.asObservable();
  }

  listarBancos(): Observable<Banco[]> {
    return this.http.get<Banco[]>(this.apiUrl).pipe(
      tap(bancos => this.bancos$.next(bancos))
    );
  }

  getBancosSnapshot(): Banco[] {
    return this.bancos$.getValue();
  }

  getBancoById(id: number): Banco | undefined {
    return this.bancos$.getValue().find(b => b.id === id);
  }

  consultarBanco(id: number): Observable<Banco> {
    return this.http.get<Banco>(`${this.apiUrl}/${id}`);
  }

  adicionarBanco(banco: Banco): Observable<Banco> {
    return this.http.post<Banco>(this.apiUrl, banco).pipe(
      tap(salvo => this.bancos$.next([...this.bancos$.getValue(), salvo]))
    );
  }

  atualizarBanco(bancoAtualizado: Banco): Observable<Banco> {
    return this.http.put<Banco>(`${this.apiUrl}/${bancoAtualizado.id}`, bancoAtualizado).pipe(
      tap(salvo => this.bancos$.next(this.bancos$.getValue().map(b => b.id === salvo.id ? salvo : b)))
    );
  }
}
