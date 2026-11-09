import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServicoInvestimentos } from './investimentos';

describe('ServicoInvestimentos', () => {
  let servico: ServicoInvestimentos;
  let controladorHttp: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(ServicoInvestimentos);
    controladorHttp = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controladorHttp.verify());

  it('consulta investimentos ativos para o banco e conta selecionados', () => {
    const investimentos = [{
      id: 8,
      bancoContaId: 3,
      dsInvestimento: 'CDB',
      icSituacao: 'SIM',
    }];
    let respostaRecebida = false;

    servico.listarAtivosPorBancoConta(3).subscribe((resposta) => {
      expect(resposta).toEqual(investimentos);
      respostaRecebida = true;
    });

    const requisicao = controladorHttp.expectOne(
      'http://localhost:8080/api/investimentos/banco-conta/3/ativos',
    );
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ sucesso: true, mensagem: 'OK', valor: investimentos });
    expect(respostaRecebida).toBe(true);
  });
});
