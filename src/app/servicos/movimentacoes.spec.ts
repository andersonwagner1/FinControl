import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MovimentacaoConsulta } from '../modelos/movimentacao';
import { ServicoMovimentacoes } from './movimentacoes';

describe('ServicoMovimentacoes', () => {
  let servico: ServicoMovimentacoes;
  let controladorHttp: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(ServicoMovimentacoes);
    controladorHttp = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controladorHttp.verify());

  it('consulta as movimentações pelo período, banco e conta', () => {
    const movimentacoes: MovimentacaoConsulta[] = [{
      id: 33,
      nrPosicao: 1,
      dtMovimentacao: '2026-11-05',
      nrDia: 5,
      vlCredito: null,
      vlDebito: 125.5,
      vlSaldo: 874.5,
      dsObservacao: 'Conta de energia',
      icCalcular: 'SIM',
      icSituacao: 'SIM',
      bancoContaId: 7,
      competenciaId: 18,
      tipoMovimentacaoId: 12,
      vinculadoId: null,
      investimentoId: null,
    }];
    let respostaRecebida = false;

    servico.consultar(2026, 11, 3, 8).subscribe((resposta) => {
      expect(resposta).toEqual(movimentacoes);
      respostaRecebida = true;
    });

    const requisicao = controladorHttp.expectOne((item) =>
      item.url === 'http://localhost:8080/api/movimentacoes/consulta'
      && item.params.get('ano') === '2026'
      && item.params.get('mes') === '11'
      && item.params.get('bancoId') === '3'
      && item.params.get('contaId') === '8');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ sucesso: true, mensagem: 'OK', valor: movimentacoes });
    expect(respostaRecebida).toBe(true);
  });

  it('atualiza uma movimentação pelo ID', () => {
    const movimentacao: MovimentacaoConsulta = {
      id: 33,
      nrPosicao: 1,
      dtMovimentacao: '2026-11-05T00:00:00.000Z',
      nrDia: 5,
      vlCredito: 125.5,
      vlDebito: 0,
      vlSaldo: 1125.5,
      dsObservacao: 'Descrição alterada',
      icCalcular: 'SIM',
      icSituacao: 'SIM',
      bancoContaId: 7,
      competenciaId: 18,
      tipoMovimentacaoId: 12,
      vinculadoId: null,
      investimentoId: null,
    };
    let respostaRecebida = false;

    servico.atualizar(33, movimentacao).subscribe((resposta) => {
      expect(resposta).toEqual(movimentacao);
      respostaRecebida = true;
    });

    const requisicao = controladorHttp.expectOne('http://localhost:8080/api/movimentacoes/33');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual(movimentacao);
    requisicao.flush({ sucesso: true, mensagem: 'Registro atualizado', valor: movimentacao });
    expect(respostaRecebida).toBe(true);
  });

  it('exclui uma movimentação pelo ID', () => {
    let respostaRecebida = false;

    servico.excluir(33).subscribe(() => {
      respostaRecebida = true;
    });

    const requisicao = controladorHttp.expectOne('http://localhost:8080/api/movimentacoes/33');
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush({ sucesso: true, mensagem: 'Registro excluído', valor: null });
    expect(respostaRecebida).toBe(true);
  });
});
