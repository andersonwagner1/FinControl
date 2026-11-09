import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  AtualizacaoLancamentoCartaoCredito,
  NovoLancamentoCartaoCredito,
} from '../modelos/cartao-credito';
import { ServicoCartoesCredito } from './cartoes-credito';

describe('ServicoCartoesCredito', () => {
  let servico: ServicoCartoesCredito;
  let controladorHttp: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(ServicoCartoesCredito);
    controladorHttp = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controladorHttp.verify());

  it('envia o lançamento para o endpoint de cartão e valida as parcelas retornadas', () => {
    const lancamento: NovoLancamentoCartaoCredito = {
      dtMovimentacao: '2026-11-06',
      vlDebito: 240,
      dsObservacao: 'Compra parcelada',
      icSituacao: 'SIM',
      bancoContaId: 7,
      competenciaId: 18,
      tipoMovimentacaoId: 12,
      nrParcelas: 3,
    };
    const parcelas = [
      { id: 33, competenciaId: 18, vlCompra: 80 },
      { id: 34, competenciaId: 19, vlCompra: 80 },
      { id: 35, competenciaId: 20, vlCompra: 80 },
    ];
    let respostaRecebida = false;

    servico.lancar(lancamento).subscribe((resposta) => {
      expect(resposta).toEqual(parcelas);
      respostaRecebida = true;
    });

    const requisicao = controladorHttp.expectOne('http://localhost:8080/api/cartoes-credito/lancamento-cartao');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual(lancamento);
    requisicao.flush({ sucesso: true, mensagem: 'OK', valor: parcelas }, { status: 201, statusText: 'Created' });
    expect(respostaRecebida).toBe(true);
  });

  it('consulta competências para relacionar lançamentos aos meses e anos', () => {
    const competencias = [{ id: 18, nrAno: 2026, nrMes: 11, dsMesAno: 'Novembro/2026' }];

    servico.listarCompetencias().subscribe((resposta) => expect(resposta).toEqual(competencias));

    const requisicao = controladorHttp.expectOne('http://localhost:8080/api/competencias');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ sucesso: true, mensagem: 'OK', valor: competencias });
  });

  it('atualiza o lançamento selecionado pelo endpoint CRUD de cartões', () => {
    const lancamento: AtualizacaoLancamentoCartaoCredito = {
      id: 33,
      bancoContaId: 7,
      competenciaId: 18,
      tipoMovimentacaoId: 12,
      nrDia: '12',
      dtMovimentacao: '2026-11-12T00:00:00.000Z',
      vlCompra: 125,
      dsObservacao: 'Compra atualizada',
      nrParcelas: 1,
      icSituacao: 'SIM',
      vinculoId: null,
    };

    servico.atualizar(33, lancamento).subscribe((resposta) => expect(resposta).toEqual(lancamento));

    const requisicao = controladorHttp.expectOne('http://localhost:8080/api/cartoes-credito/33');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual(lancamento);
    requisicao.flush({ sucesso: true, mensagem: 'OK', valor: lancamento });
  });

  it('exclui o lançamento selecionado pelo endpoint CRUD de cartões', () => {
    let exclusaoConfirmada = false;

    servico.excluir(33).subscribe(() => {
      exclusaoConfirmada = true;
    });

    const requisicao = controladorHttp.expectOne('http://localhost:8080/api/cartoes-credito/33');
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush({ sucesso: true, mensagem: 'Excluído', valor: null });
    expect(exclusaoConfirmada).toBe(true);
  });
});
