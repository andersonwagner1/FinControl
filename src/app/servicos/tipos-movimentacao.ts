import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { RetornoApi } from '../modelos/banco-conta-disponivel';
import { TipoMovimentacaoAtiva } from '../modelos/tipo-movimentacao-ativa';

@Injectable({ providedIn: 'root' })
export class ServicoTiposMovimentacao {
  private readonly http = inject(HttpClient);
  private readonly enderecoApi = 'http://localhost:8080/api';

  listarAtivos(): Observable<TipoMovimentacaoAtiva[]> {
    return this.http.get<RetornoApi<TipoMovimentacaoAtiva[]>>(`${this.enderecoApi}/tipos-movimentacao/ativos`)
      .pipe(
        map((resposta) => {
          if (!resposta.sucesso || !Array.isArray(resposta.valor)) {
            throw new Error(resposta.mensagem || 'A API retornou uma lista inválida de tipos de movimentação.');
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
