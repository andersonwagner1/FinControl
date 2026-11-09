import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { RetornoApi } from '../modelos/banco-conta-disponivel';
import { LancamentoMovimentacao, MovimentacaoLancada } from '../modelos/lancamento-movimentacao';

@Injectable({ providedIn: 'root' })
export class ServicoLancamentosMovimentacao {
  private readonly http = inject(HttpClient);
  private readonly enderecoApi = 'http://localhost:8080/api';

  lancar(lancamento: LancamentoMovimentacao): Observable<MovimentacaoLancada> {
    return this.http.post<RetornoApi<MovimentacaoLancada>>(
      `${this.enderecoApi}/movimentacoes/lancamento`,
      lancamento,
    ).pipe(
      map((resposta) => {
        if (!resposta.sucesso || !resposta.valor) {
          throw new Error(resposta.mensagem || 'A API não confirmou o lançamento da movimentação.');
        }
        return resposta.valor;
      }),
      catchError((erro: unknown) => {
        if (erro instanceof HttpErrorResponse && erro.status === 0) {
          return throwError(() => new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.'));
        }
        return throwError(() => erro);
      }),
    );
  }
}
