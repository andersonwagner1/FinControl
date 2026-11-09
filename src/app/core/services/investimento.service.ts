import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Investimento } from '../models/investimento.model';
import { InvestimentoContaVinculada } from '../models/investimento-conta-vinculada.model';

interface ContaVinculadaApi {
  id?: number;
  contaId?: number;
  bancoId?: number;
  bancoNome?: string;
  contaNome?: string;
  descricao?: string;
  banco?: { id?: number; nome?: string };
  conta?: { id?: number; nome?: string; descricao?: string };
}

@Injectable({ providedIn: 'root' })
export class InvestimentoService {
  private readonly apiUrl = 'http://localhost:8080/api/investimentos';
  private readonly contasVinculadasUrl = `${this.apiUrl}/contas-vinculadas`;
  private readonly investimentos$ = new BehaviorSubject<Investimento[]>([]);

  constructor(private http: HttpClient) {}

  getInvestimentos(): Observable<Investimento[]> {
    return this.investimentos$.asObservable();
  }

  getInvestimentosAtivos(bancoContaId : number): Observable<Investimento[]> {
     return this.http.get<Investimento[]>(`${this.apiUrl}/listar-por-banco/${bancoContaId}`).pipe(
      tap(investimentos => this.investimentos$.next(investimentos))
    );
  }

  listarInvestimentos(): Observable<Investimento[]> {
    return this.http.get<Investimento[]>(this.apiUrl).pipe(
      tap(investimentos => this.investimentos$.next(investimentos))
    );
  }

 // listarContasVinculadas(): Observable<InvestimentoContaVinculada[]> {
    /*return null;this.http.get<ContaVinculadaApi[]>(this.contasVinculadasUrl).pipe(
      map(contas => contas
        .map(conta => ({
          contaId: conta.contaId || conta.conta?.id || conta.id || '',
          bancoId: conta.bancoId || conta.banco?.id || '',
          bancoNome: conta.bancoNome || conta.banco?.nome || conta.bancoId || 'Banco não informado',
          contaNome: conta.contaNome || conta.conta?.nome || conta.conta?.descricao || conta.descricao || conta.id || 'Conta não informada'
        }))
        .filter(conta => Boolean(conta.contaId && conta.bancoId))
      )
    );*/
  //}

  adicionarInvestimento(nome: string, contaId: number): Observable<Investimento> {
    return this.http.post<Investimento>(this.apiUrl, {
      nome: nome.trim(),
      contaId,
      ativo: true
    }).pipe(
      tap(investimento => this.investimentos$.next([
        ...this.investimentos$.getValue(),
        investimento
      ]))
    );
  }

  atualizarInvestimento(investimento: Investimento): Observable<Investimento> {
    return this.http.put<Investimento>(`${this.apiUrl}/${investimento.id}`, investimento).pipe(
      tap(salvo => this.investimentos$.next(this.investimentos$.getValue().map(item =>
        item.id === salvo.id ? salvo : item
      )))
    );
  }
}
