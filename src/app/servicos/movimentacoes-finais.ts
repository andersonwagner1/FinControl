import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { RetornoApi } from '../modelos/banco-conta-disponivel';
import { ResumoMovimentacaoFinal } from '../modelos/resumo-movimentacao-final';

@Injectable({ providedIn: 'root' })
export class ServicoMovimentacoesFinais {
  private readonly http = inject(HttpClient);
  private readonly enderecoApi = 'http://localhost:8080/api';

  consultar(ano: number, mes: number, bancoId: number, contaId: number): Observable<ResumoMovimentacaoFinal> {
    const parametros = new HttpParams()
      .set('ano', ano)
      .set('mes', mes)
      .set('bancoId', bancoId)
      .set('contaId', contaId);

    return this.http
      .get<RetornoApi<ResumoMovimentacaoFinal>>(`${this.enderecoApi}/movimentacoes-finais/consulta`, { params: parametros })
      .pipe(
        map((resposta) => {
          if (!resposta.sucesso || !resposta.valor) {
            throw new Error(resposta.mensagem || 'A API retornou um resumo financeiro inválido.');
          }
          return resposta.valor;
        }),
        catchError((erro: unknown) => {
          if (erro instanceof HttpErrorResponse && erro.status === 0) {
            return throwError(() => new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.'));
          }
          if (erro instanceof HttpErrorResponse && erro.status === 404) {
            return throwError(() => new Error('Não há saldo final cadastrado para a combinação selecionada.'));
          }
          return throwError(() => erro);
        }),
      );
  }
}
