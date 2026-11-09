import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServicoMovimentacoesFinais } from './movimentacoes-finais';

describe('ServicoMovimentacoesFinais', () => {
  let servico: ServicoMovimentacoesFinais;
  let controladorHttp: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(ServicoMovimentacoesFinais);
    controladorHttp = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controladorHttp.verify());

  it('consulta o resumo com ano, mês, banco e conta selecionados', () => {
    const resumo = {
      vlSaldoInicial: 1000,
      vlSaldoFinal: 1250,
      vlTotalCredito: 500,
      vlTotalDebito: 250,
      icFechado: 'NAO' as const,
    };
    let respostaRecebida = false;

    servico.consultar(2026, 11, 3, 8).subscribe((resposta) => {
      expect(resposta).toEqual(resumo);
      respostaRecebida = true;
    });

    const requisicao = controladorHttp.expectOne((item) =>
      item.url === 'http://localhost:8080/api/movimentacoes-finais/consulta'
      && item.params.get('ano') === '2026'
      && item.params.get('mes') === '11'
      && item.params.get('bancoId') === '3'
      && item.params.get('contaId') === '8');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ sucesso: true, mensagem: 'OK', valor: resumo });
    expect(respostaRecebida).toBe(true);
  });
});
