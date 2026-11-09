import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { BancoContaDisponivel, RetornoApi } from '../modelos/banco-conta-disponivel';

@Injectable({ providedIn: 'root' })
export class ServicoBancosContas {
  private readonly http = inject(HttpClient);
  private readonly enderecoApi = 'http://localhost:8080/api';

  listarDisponiveis(mes: number, ano: number): Observable<BancoContaDisponivel[]> {
    const parametros = new HttpParams().set('mes', mes).set('ano', ano);
    return this.http.get<RetornoApi<BancoContaDisponivel[]>>(`${this.enderecoApi}/bancos-contas/disponiveis`, { params: parametros })
      .pipe(
        map((resposta) => {
          console.log('Resposta da API de bancos e contas disponíveis:', resposta);
          if (!resposta.sucesso || !Array.isArray(resposta.valor)) {
            throw new Error(resposta.mensagem || 'A API retornou uma lista inválida de bancos e contas.');
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
