import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { RetornoApi } from '../modelos/banco-conta-disponivel';
import { DadosMovimentacao, Movimentacao, MovimentacaoConsulta } from '../modelos/movimentacao';

const CHAVE_ARMAZENAMENTO = 'finora-movements';

interface MovimentacaoLegada {
  id: string;
  description: string;
  category: string;
  type: 'entrada' | 'saida';
  amount: number;
  date: string;
  bank: string;
  account: string;
}

function obterDataAtual(): string {
  const agora = new Date();
  const dataLocal = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return dataLocal.toISOString().slice(0, 10);
}

function criarMovimentacoesIniciais(): Movimentacao[] {
  const hoje = obterDataAtual();
  const ano = hoje.slice(0, 4);
  const mes = hoje.slice(5, 7);
  const dia = Number(hoje.slice(8, 10));
  const dataRecente = (diasAtras: number) => `${ano}-${mes}-${String(Math.max(1, dia - diasAtras)).padStart(2, '0')}`;
  return [
    { identificador: 'sample-1', descricao: 'Salário', categoria: 'Salário', tipo: 'entrada', valor: 6500, data: dataRecente(12), banco: 'Nubank', conta: 'Conta corrente' },
    { identificador: 'sample-2', descricao: 'Aluguel', categoria: 'Moradia', tipo: 'saida', valor: 1850, data: dataRecente(10), banco: 'Itaú', conta: 'Conta corrente' },
    { identificador: 'sample-3', descricao: 'Supermercado Pão de Açúcar', categoria: 'Alimentação', tipo: 'saida', valor: 384.75, data: dataRecente(7), banco: 'Nubank', conta: 'Conta corrente' },
    { identificador: 'sample-4', descricao: 'Projeto freelancer', categoria: 'Renda extra', tipo: 'entrada', valor: 1200, data: dataRecente(5), banco: 'Banco do Brasil', conta: 'Conta corrente' },
    { identificador: 'sample-5', descricao: 'Internet fibra', categoria: 'Contas', tipo: 'saida', valor: 109.9, data: dataRecente(2), banco: 'Itaú', conta: 'Conta corrente' },
    { identificador: 'sample-6', descricao: 'Academia', categoria: 'Saúde', tipo: 'saida', valor: 99.9, data: dataRecente(0), banco: 'Nubank', conta: 'Cartão de crédito' },
  ];
}

@Injectable({ providedIn: 'root' })
export class ServicoMovimentacoes {
  private readonly http = inject(HttpClient);
  private readonly enderecoApi = 'http://localhost:8080/api';
  readonly movimentacoes = signal<Movimentacao[]>(this.carregarMovimentacoes());

  consultar(ano: number, mes: number, bancoId: number, contaId: number): Observable<MovimentacaoConsulta[]> {
    const parametros = new HttpParams()
      .set('ano', ano)
      .set('mes', mes)
      .set('bancoId', bancoId)
      .set('contaId', contaId);

    return this.http
      .get<RetornoApi<MovimentacaoConsulta[]>>(`${this.enderecoApi}/movimentacoes/consulta`, { params: parametros })
      .pipe(
        map((resposta) => {
          if (!resposta.sucesso || !Array.isArray(resposta.valor)) {
            throw new Error(resposta.mensagem || 'A API retornou uma lista inválida de movimentações.');
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

  atualizar(id: number, movimentacao: MovimentacaoConsulta): Observable<MovimentacaoConsulta> {
    return this.http
      .put<RetornoApi<MovimentacaoConsulta>>(`${this.enderecoApi}/movimentacoes/${id}`, movimentacao)
      .pipe(
        map((resposta) => {
          if (!resposta.sucesso || !resposta.valor) {
            throw new Error(resposta.mensagem || 'A API não confirmou a alteração da movimentação.');
          }
          return resposta.valor;
        }),
        catchError((erro: unknown) => this.tratarErroHttp(erro)),
      );
  }

  excluir(id: number): Observable<void> {
    return this.http
      .delete<RetornoApi<unknown>>(`${this.enderecoApi}/movimentacoes/${id}`)
      .pipe(
        map((resposta) => {
          if (!resposta.sucesso) {
            throw new Error(resposta.mensagem || 'A API não confirmou a exclusão da movimentação.');
          }
        }),
        catchError((erro: unknown) => this.tratarErroHttp(erro)),
      );
  }

  adicionar(dados: DadosMovimentacao): void {
    const movimentacao: Movimentacao = { ...dados, identificador: crypto.randomUUID() };
    const atualizadas = [movimentacao, ...this.movimentacoes()];
    this.movimentacoes.set(atualizadas);
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(atualizadas));
  }

  private tratarErroHttp(erro: unknown): Observable<never> {
    if (erro instanceof HttpErrorResponse && erro.status === 0) {
      return throwError(() => new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.'));
    }
    return throwError(() => erro);
  }

  private carregarMovimentacoes(): Movimentacao[] {
    if (typeof localStorage === 'undefined') {
      return criarMovimentacoesIniciais();
    }

    const armazenadas = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (armazenadas === null) {
      const iniciais = criarMovimentacoesIniciais();
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(iniciais));
      return iniciais;
    }

    const movimentacoes = JSON.parse(armazenadas) as (Movimentacao | MovimentacaoLegada)[];
    if (movimentacoes.length > 0 && 'id' in movimentacoes[0]) {
      const atualizadas = movimentacoes.map((movimentacao) => {
        const legada = movimentacao as MovimentacaoLegada;
        return {
          identificador: legada.id,
          descricao: legada.description,
          categoria: legada.category,
          tipo: legada.type,
          valor: legada.amount,
          data: legada.date,
          banco: legada.bank,
          conta: legada.account,
        };
      });
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(atualizadas));
      return atualizadas;
    }

    return movimentacoes as Movimentacao[];
  }
}
