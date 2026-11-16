import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Competencia } from '../modelos/cartao-credito';
import { RetornoApi } from '../modelos/banco-conta-disponivel';

@Injectable({ providedIn: 'root' })
export class ServicoCompetencias {
  private readonly http = inject(HttpClient);
  private readonly enderecoApi = 'http://localhost:8080/api';

  listarPorAno(ano: number): Observable<Competencia[]> {
    return this.http.get<RetornoApi<Competencia[]> | Competencia[]>(`${this.enderecoApi}/competencias/ano/${ano}`).pipe(
      map((resposta) => {
        const valor = this.ehRetornoApi(resposta) ? resposta.valor : resposta;
        if (!Array.isArray(valor) || (this.ehRetornoApi(resposta) && !resposta.sucesso)) {
          throw new Error(this.ehRetornoApi(resposta) ? resposta.mensagem : 'A API retornou uma lista inválida de competências.');
        }
        return valor;
      }),
      catchError((erro: unknown) => this.tratarErroHttp(erro)),
    );
  }

  adicionarAno(ano: number): Observable<void> {
    return this.http.post<RetornoApi<unknown> | unknown>(`${this.enderecoApi}/competencias/ano/${ano}`, {}).pipe(
      map((resposta) => {
        if (this.ehRetornoApi(resposta) && !resposta.sucesso) {
          throw new Error(resposta.mensagem || 'A API não confirmou o cadastro das competências.');
        }
      }),
      catchError((erro: unknown) => this.tratarErroHttp(erro)),
    );
  }

  private ehRetornoApi(resposta: RetornoApi<unknown> | unknown): resposta is RetornoApi<unknown> {
    return typeof resposta === 'object' && resposta !== null && 'sucesso' in resposta && 'valor' in resposta;
  }

  private tratarErroHttp(erro: unknown): Observable<never> {
    if (erro instanceof HttpErrorResponse && erro.status === 0) {
      return throwError(() => new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.'));
    }
    return throwError(() => erro);
  }
}
