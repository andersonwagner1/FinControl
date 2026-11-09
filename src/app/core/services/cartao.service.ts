import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Cartao, CartaoInput } from '../models/cartao.model';

@Injectable({ providedIn: 'root' })
export class CartaoService {
  private readonly apiUrl = 'http://localhost:8080/api/cartoes-credito';
  private readonly cartoes$ = new BehaviorSubject<Cartao[]>([]);

  constructor(private http: HttpClient) {}

  listarCartoes(): Observable<Cartao[]> {
    return this.http.get<Cartao[]>(this.apiUrl).pipe(
      tap(cartoes => {
        
        this.cartoes$.next(cartoes);

      }
        
    )
    );
  }

  consultarCartao(id: number): Observable<Cartao> {
    return this.http.get<Cartao>(`${this.apiUrl}/${id}`);
  }

  salvarCartao(cartao: CartaoInput): Observable<Cartao> {
    console.log('Salvando cartão:', cartao);
    return this.http.post<Cartao>(this.apiUrl, cartao).pipe(
      tap(salvo => this.cartoes$.next([...this.cartoes$.getValue(), salvo]))
    );
  }

  atualizarCartao(id: number, cartao: CartaoInput): Observable<Cartao> {
    return this.http.put<Cartao>(`${this.apiUrl}/${id}`, { ...cartao, id }).pipe(
      tap(atualizado => this.cartoes$.next(
        this.cartoes$.getValue().map(item => item.id === atualizado.id ? atualizado : item)
      ))
    );
  }

  getCartoesSnapshot(): Cartao[] {
    return this.cartoes$.getValue();
  }

  getCartoes$(): Observable<Cartao[]> {
    return this.cartoes$.asObservable();
  }
}
