import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Vinculo } from '../models/vinculo.model';

@Injectable({ providedIn: 'root' })
export class VinculoService {
  private readonly apiUrl = 'http://localhost:8080/api/vinculos';
  private vinculos$ = new BehaviorSubject<Vinculo[]>([   
  ]);

  constructor(private http: HttpClient) {
    this.http.get<Vinculo[]>(this.apiUrl).subscribe({ next: vinculos => this.vinculos$.next(vinculos), error: () => undefined });
  }


  listarVinculosPorCompetencia(competencia : string): Observable<Vinculo[]>{
    return this.http.get<Vinculo[]>(`${this.apiUrl}/${competencia}`);
  }



  getVinculos(): Observable<Vinculo[]> {
    return this.vinculos$.asObservable();
  }

  getVinculosSnapshot(): Vinculo[] {
    return this.vinculos$.getValue();
  }

  getVinculoById(id: number): Vinculo | undefined {
    let result =  this.vinculos$.getValue();
    
    let r =  result .find(v => Number(v.id) === Number(id));
    
    return r;
    
   
  }

  adicionarVinculo(vinculo: Vinculo): void {
    this.http.post<Vinculo>(this.apiUrl, vinculo).subscribe({ next: salvo => this.vinculos$.next([...this.vinculos$.getValue(), salvo]) });
  }

  atualizarVinculo(vinculoAtualizado: Vinculo): void {
    this.http.put<Vinculo>(`${this.apiUrl}/${vinculoAtualizado.id}`, vinculoAtualizado).subscribe({ next: salvo => this.vinculos$.next(this.vinculos$.getValue().map(v => v.id === salvo.id ? salvo : v)) });
  }

  atualizarSaldo(vinculoId: number, novoSaldo: number): void {
    this.http.patch<Vinculo>(`${this.apiUrl}/${vinculoId}/saldo?saldo=${novoSaldo}`, {}).subscribe({ next: salvo => this.vinculos$.next(this.vinculos$.getValue().map(v => v.id === salvo.id ? salvo : v)) });
  }
}
