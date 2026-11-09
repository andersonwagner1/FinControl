import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, throwError } from 'rxjs';
import { RetornoApi } from '../modelos/banco-conta-disponivel';
import { LinhaDashboardFinanceiro } from '../modelos/dashboard-financeiro';

interface MovimentoApi {
  id: number;
  dtMovimentacao: string | null;
  nrDia: number | null;
  vlCredito: number | null;
  vlDebito: number | null;
  vlSaldo: number | null;
  dsObservacao: string | null;
  icSituacao: 'SIM' | 'NAO';
  bancoContaId: number | null;
  competenciaId: number | null;
  tipoMovimentacaoId: number | null;
  investimentoId: number | null;
}

interface BancoContaApi {
  id: number;
  bancoId: number | null;
  contaId: number | null;
}

interface BancoApi {
  id: number;
  dsBanco: string;
}

interface ContaApi {
  id: number;
  dsConta: string;
}

interface CategoriaApi {
  id: number;
  dsCategoria: string;
  icTipo: string;
}

interface TipoMovimentacaoApi {
  id: number;
  dsTipoMovimentacao: string;
  categoriaId: number | null;
  icRelatorio: string | null;
  icTipoMovimentacao: string;
}

interface InvestimentoApi {
  id: number;
  dsInvestimento: string;
}

interface CompetenciaApi {
  id: number;
  nrAno: number;
  nrMes: number;
}

@Injectable({ providedIn: 'root' })
export class ServicoDashboardFinanceiro {
  private readonly http = inject(HttpClient);
  private readonly enderecoApi = 'http://localhost:8080/api';

  consultar(): Observable<LinhaDashboardFinanceiro[]> {
    return forkJoin({
      movimentos: this.listar<MovimentoApi>('/movimentacoes'),
      bancosContas: this.listar<BancoContaApi>('/bancos-contas'),
      bancos: this.listar<BancoApi>('/bancos'),
      contas: this.listar<ContaApi>('/contas'),
      categorias: this.listar<CategoriaApi>('/categorias-movimentacao'),
      tipos: this.listar<TipoMovimentacaoApi>('/tipos-movimentacao'),
      investimentos: this.listar<InvestimentoApi>('/investimentos'),
      competencias: this.listar<CompetenciaApi>('/competencias'),
    }).pipe(
      map(({ movimentos, bancosContas, bancos, contas, categorias, tipos, investimentos, competencias }) => {
        const contasPorId = new Map(contas.map((conta) => [conta.id, conta.dsConta]));
        const bancosPorId = new Map(bancos.map((banco) => [banco.id, banco.dsBanco]));
        const bancosContasPorId = new Map(bancosContas.map((vinculo) => [vinculo.id, vinculo]));
        const categoriasPorId = new Map(categorias.map((categoria) => [categoria.id, categoria]));
        const tiposPorId = new Map(tipos.map((tipo) => [tipo.id, tipo]));
        const investimentosPorId = new Map(investimentos.map((investimento) => [investimento.id, investimento.dsInvestimento]));
        const competenciasPorId = new Map(competencias.map((competencia) => [competencia.id, competencia]));

        return movimentos
          .filter((movimento) => movimento.icSituacao === 'SIM')
          .map((movimento): LinhaDashboardFinanceiro => {
            const vinculo = movimento.bancoContaId === null ? undefined : bancosContasPorId.get(movimento.bancoContaId);
            const tipo = movimento.tipoMovimentacaoId === null ? undefined : tiposPorId.get(movimento.tipoMovimentacaoId);
            const categoria = tipo?.categoriaId === null || tipo?.categoriaId === undefined
              ? undefined
              : categoriasPorId.get(tipo.categoriaId);
            const competencia = movimento.competenciaId === null
              ? undefined
              : competenciasPorId.get(movimento.competenciaId);
            const data = this.normalizarData(movimento.dtMovimentacao);
            const dia = data ? Number(data.slice(8, 10)) : movimento.nrDia ?? 0;
            const mes = data ? Number(data.slice(5, 7)) : competencia?.nrMes ?? 0;
            const ano = data ? Number(data.slice(0, 4)) : competencia?.nrAno ?? 0;

            return {
              id: movimento.id,
              idConta: vinculo?.contaId ?? null,
              idBanco: vinculo?.bancoId ?? null,
              bancoConta: vinculo
                ? `${bancosPorId.get(vinculo.bancoId ?? -1) ?? 'Banco'} / ${contasPorId.get(vinculo.contaId ?? -1) ?? 'Conta'}`
                : 'Não identificado',
              dsObservacao: movimento.dsObservacao ?? '',
              dtMovimentacao: data,
              nrDia: dia,
              nrMes: mes,
              nrAno: ano,
              vlCredito: movimento.vlCredito ?? 0,
              vlDebito: movimento.vlDebito ?? 0,
              vlSaldo: movimento.vlSaldo,
              idTipoMovimentacao: movimento.tipoMovimentacaoId,
              dsTipoMovimentacao: tipo?.dsTipoMovimentacao ?? 'Não identificado',
              icRelatorio: tipo?.icRelatorio ?? '',
              dsCategoria: categoria?.dsCategoria ?? 'Não categorizado',
              icTipo: categoria?.icTipo ?? this.mapearTipo(tipo?.icTipoMovimentacao ?? ''),
              dsInvestimento: movimento.investimentoId === null
                ? ''
                : investimentosPorId.get(movimento.investimentoId) ?? '',
            };
          });
      }),
      catchError((erro: unknown) => this.tratarErroHttp(erro)),
    );
  }

  private listar<T>(recurso: string): Observable<T[]> {
    return this.http.get<RetornoApi<T[]>>(`${this.enderecoApi}${recurso}`).pipe(
      map((resposta) => {
        if (!resposta.sucesso || !Array.isArray(resposta.valor)) {
          throw new Error(resposta.mensagem || `A API retornou uma lista inválida para ${recurso}.`);
        }
        return resposta.valor;
      }),
    );
  }

  private mapearTipo(tipo: string): string {
    switch (tipo) {
      case 'CREDITO': return 'C';
      case 'DEBITO': return 'D';
      case 'APLICACAO': return 'A';
      case 'RESGATE': return 'R';
      default: return '';
    }
  }

  private normalizarData(data: string | null): string | null {
    if (!data) {
      return null;
    }
    const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(data);
    if (isoDate) {
      return isoDate[1];
    }
    const date = new Date(data);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  private tratarErroHttp(erro: unknown): Observable<never> {
    if (erro instanceof HttpErrorResponse && erro.status === 0) {
      return throwError(() => new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.'));
    }
    return throwError(() => erro);
  }
}
