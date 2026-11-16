import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { RetornoApi } from '../modelos/banco-conta-disponivel';
import { CategoriaMovimentacao, TipoMovimentacaoAtiva } from '../modelos/tipo-movimentacao-ativa';

export interface DadosTipoMovimentacao {
  dsTipoMovimentacao: string;
  categoriaId: number;
  icTipoMovimentacao: TipoMovimentacaoAtiva['icTipoMovimentacao'];
}

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

  listar(): Observable<TipoMovimentacaoAtiva[]> {
    return this.http.get<RetornoApi<TipoMovimentacaoAtiva[]> | TipoMovimentacaoAtiva[]>(`${this.enderecoApi}/tipos-movimentacao`)
      .pipe(map((resposta) => this.extrairLista(resposta)), catchError((erro: unknown) => this.tratarErro(erro)));
  }

  listarCategorias(): Observable<CategoriaMovimentacao[]> {
    return this.http.get<RetornoApi<CategoriaMovimentacao[]> | CategoriaMovimentacao[]>(`${this.enderecoApi}/categorias-movimentacao`)
      .pipe(map((resposta) => this.extrairListaGenerica(resposta)), catchError((erro: unknown) => this.tratarErro(erro)));
  }

  salvar(tipo: DadosTipoMovimentacao): Observable<TipoMovimentacaoAtiva> {
    return this.http.post<RetornoApi<TipoMovimentacaoAtiva> | TipoMovimentacaoAtiva>(`${this.enderecoApi}/tipos-movimentacao/salvar`, tipo)
      .pipe(map((resposta) => this.extrairValor(resposta, 'A API não confirmou o cadastro do tipo de movimentação.')), catchError((erro: unknown) => this.tratarErro(erro)));
  }

  atualizar(id: number, tipo: DadosTipoMovimentacao): Observable<TipoMovimentacaoAtiva> {
    return this.http.put<RetornoApi<TipoMovimentacaoAtiva> | TipoMovimentacaoAtiva>(`${this.enderecoApi}/tipos-movimentacao/${id}`, tipo)
      .pipe(map((resposta) => this.extrairValor(resposta, 'A API não confirmou a alteração do tipo de movimentação.')), catchError((erro: unknown) => this.tratarErro(erro)));
  }

  private extrairLista(resposta: RetornoApi<TipoMovimentacaoAtiva[]> | TipoMovimentacaoAtiva[]): TipoMovimentacaoAtiva[] {
    const valor = this.ehRetornoApi(resposta) ? resposta.valor : resposta;
    if (!Array.isArray(valor) || (this.ehRetornoApi(resposta) && !resposta.sucesso)) throw new Error('A API retornou uma lista inválida de tipos de movimentação.');
    return valor;
  }

  private extrairListaGenerica(resposta: RetornoApi<CategoriaMovimentacao[]> | CategoriaMovimentacao[]): CategoriaMovimentacao[] {
    const valor = this.ehRetornoApi(resposta) ? resposta.valor : resposta;
    if (!Array.isArray(valor) || (this.ehRetornoApi(resposta) && !resposta.sucesso)) throw new Error('A API retornou uma lista inválida de categorias.');
    return valor;
  }

  private extrairValor(resposta: RetornoApi<TipoMovimentacaoAtiva> | TipoMovimentacaoAtiva, mensagem: string): TipoMovimentacaoAtiva {
    const valor = this.ehRetornoApi(resposta) ? resposta.valor : resposta;
    if (!valor || (this.ehRetornoApi(resposta) && !resposta.sucesso)) throw new Error(this.ehRetornoApi(resposta) ? resposta.mensagem || mensagem : mensagem);
    return valor;
  }

  private ehRetornoApi(resposta: RetornoApi<unknown> | unknown): resposta is RetornoApi<unknown> {
    return typeof resposta === 'object' && resposta !== null && 'sucesso' in resposta && 'valor' in resposta;
  }

  private tratarErro(erro: unknown): Observable<never> {
    if (erro instanceof HttpErrorResponse && erro.status === 0) return throwError(() => new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.'));
    return throwError(() => erro);
  }
}
