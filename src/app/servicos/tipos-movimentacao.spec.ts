import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServicoTiposMovimentacao } from './tipos-movimentacao';

describe('ServicoTiposMovimentacao', () => {
  let servico: ServicoTiposMovimentacao;
  let controladorHttp: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(ServicoTiposMovimentacao);
    controladorHttp = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controladorHttp.verify());

  it('consulta os tipos de movimentação ativos', () => {
    const tipos = [{
      id: 1,
      dsTipoMovimentacao: 'Salário',
      dsCategoria: 'Receitas',
      icTipoMovimentacao: 'CREDITO',
    }];
    let respostaRecebida = false;

    servico.listarAtivos().subscribe((resposta) => {
      expect(resposta).toEqual(tipos);
      respostaRecebida = true;
    });

    const requisicao = controladorHttp.expectOne('http://localhost:8080/api/tipos-movimentacao/ativos');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ sucesso: true, mensagem: 'OK', valor: tipos });
    expect(respostaRecebida).toBe(true);
  });
});
