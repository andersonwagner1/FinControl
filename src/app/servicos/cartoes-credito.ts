import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import {
  AtualizacaoLancamentoCartaoCredito,
  Competencia,
  LancamentoCartaoCredito,
  NovoLancamentoCartaoCredito,
} from '../modelos/cartao-credito';
import { RetornoApi } from '../modelos/banco-conta-disponivel';

@Injectable({ providedIn: 'root' })
export class ServicoCartoesCredito {
  private readonly http = inject(HttpClient);
  private readonly enderecoApi = 'http://localhost:8080/api';

  listarLancamentos(): Observable<LancamentoCartaoCredito[]> {
    return this.http.get<RetornoApi<LancamentoCartaoCredito[]>>(`${this.enderecoApi}/cartoes-credito`)
      .pipe(
        map((resposta) => {
          if (!resposta.sucesso || !Array.isArray(resposta.valor)) {
            throw new Error(resposta.mensagem || 'A API retornou uma lista inválida de lançamentos de cartão.');
          }
          return resposta.valor;
        }),
        catchError((erro: unknown) => this.tratarErroHttp(erro)),
      );
  }

  listarCompetencias(): Observable<Competencia[]> {
    return this.http.get<RetornoApi<Competencia[]>>(`${this.enderecoApi}/competencias`)
      .pipe(
        map((resposta) => {
          if (!resposta.sucesso || !Array.isArray(resposta.valor)) {
            throw new Error(resposta.mensagem || 'A API retornou uma lista inválida de competências.');
          }
          return resposta.valor;
        }),
        catchError((erro: unknown) => this.tratarErroHttp(erro)),
      );
  }

  lancar(lancamento: NovoLancamentoCartaoCredito): Observable<LancamentoCartaoCredito[]> {
    return this.http.post<RetornoApi<LancamentoCartaoCredito[]>>(
      `${this.enderecoApi}/cartoes-credito/lancamento-cartao`,
      lancamento,
    ).pipe(
      map((resposta) => {
        if (!resposta.sucesso || !Array.isArray(resposta.valor)) {
          throw new Error(resposta.mensagem || 'A API não confirmou o lançamento no cartão de crédito.');
        }
        return resposta.valor;
      }),
      catchError((erro: unknown) => this.tratarErroHttp(erro)),
    );
  }

  atualizar(id: number, lancamento: AtualizacaoLancamentoCartaoCredito): Observable<LancamentoCartaoCredito> {
    return this.http.put<RetornoApi<LancamentoCartaoCredito>>(
      `${this.enderecoApi}/cartoes-credito/${id}`,
      lancamento,
    ).pipe(
      map((resposta) => {
        if (!resposta.sucesso || !resposta.valor) {
          throw new Error(resposta.mensagem || 'A API não confirmou a alteração do lançamento do cartão.');
        }
        return resposta.valor;
      }),
      catchError((erro: unknown) => this.tratarErroHttp(erro)),
    );
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<RetornoApi<unknown>>(`${this.enderecoApi}/cartoes-credito/${id}`)
      .pipe(
        map((resposta) => {
          if (!resposta.sucesso) {
            throw new Error(resposta.mensagem || 'A API não confirmou a exclusão do lançamento do cartão.');
          }
        }),
        catchError((erro: unknown) => this.tratarErroHttp(erro)),
      );
  }

  private tratarErroHttp(erro: unknown): Observable<never> {
    if (erro instanceof HttpErrorResponse && erro.status === 0) {
      return throwError(() => new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.'));
    }
    return throwError(() => erro);
  }
}
