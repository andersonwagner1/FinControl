import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardCart } from '../models/dashboard-cart.model';

export interface RelatorioMensal {
  competencia: string;
  mes: string;
  saldoAnterior: number;
  resgate: number;
  renda: number;
  credito: number;
  rendimento: number;
  totalCredito: number;
  rendimentoNegativo: number;
  cartao: number;
  aplicacao: number;
  debito: number;
  mensal: number;
  totalDebito: number;
  saldoFinal: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = 'http://localhost:8080/api/dashboard';

  constructor(private http: HttpClient) {}

  getDashboardCart(competenciaInicial: string, competenciaFinal: string): Observable<DashboardCart> {
    const params = new HttpParams()
      .set('competenciaInicial', competenciaInicial)
      .set('competenciaFinal', competenciaFinal);

    return this.http.get<DashboardCart>(`${this.apiUrl}/cart`, { params });
  }

  getRelatorio(ano: number): Observable<RelatorioMensal[]> {
    const params = new HttpParams().set('ano', ano);
    return this.http.get<RelatorioMensal[]>(`${this.apiUrl}/relatorio`, { params });
  }
}