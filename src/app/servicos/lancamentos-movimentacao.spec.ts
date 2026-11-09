import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LancamentoMovimentacao } from '../modelos/lancamento-movimentacao';
import { ServicoLancamentosMovimentacao } from './lancamentos-movimentacao';

describe('ServicoLancamentosMovimentacao', () => {
  let servico: ServicoLancamentosMovimentacao;
  let controladorHttp: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(ServicoLancamentosMovimentacao);
    controladorHttp = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controladorHttp.verify());

  it('envia o payload no formato esperado pela API Java', () => {
    const lancamento: LancamentoMovimentacao = {
      bancoContaId: 7,
      tipoMovimentacaoId: 12,
      nrPosicao: 1,
      dtMovimentacao: '2026-11-05',
      valor: 125.5,
      observacao: 'Conta de energia',
      investimentoId: 15,
      transferenciaId: null,
    };
    const resposta = {
      id: 33,
      nrPosicao: 1,
      dtMovimentacao: '2026-11-05',
      nrDia: 5,
      vlCredito: null,
      vlDebito: 125.5,
      vlSaldo: null,
      dsObservacao: 'Conta de energia',
      icCalcular: 'SIM',
      icSituacao: 'SIM',
      bancoContaId: 7,
      competenciaId: 18,
      tipoMovimentacaoId: 12,
      vinculadoId: null,
      investimentoId: 15,
    };
    let respostaRecebida = false;

    servico.lancar(lancamento).subscribe((valor) => {
      expect(valor).toEqual(resposta);
      respostaRecebida = true;
    });

    const requisicao = controladorHttp.expectOne('http://localhost:8080/api/movimentacoes/lancamento');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual(lancamento);
    requisicao.flush({ sucesso: true, mensagem: 'Lancamento registrado com sucesso', valor: resposta }, { status: 201, statusText: 'Created' });
    expect(respostaRecebida).toBe(true);
  });
});
