import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServicoBancosContas } from './bancos-contas';

describe('ServicoBancosContas', () => {
  let servico: ServicoBancosContas;
  let controladorHttp: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(ServicoBancosContas);
    controladorHttp = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controladorHttp.verify());

  it('consulta os bancos e contas pela competência informada', () => {
    const bancosContas = [{
      bancoContaId: 7,
      bancoId: 2,
      nomeBanco: 'Banco de teste',
      contaId: 4,
      nomeConta: 'Conta corrente',
    }];
    let respostaRecebida = false;

    servico.listarDisponiveis(11, 2026).subscribe((resposta) => {
      expect(resposta).toEqual(bancosContas);
      respostaRecebida = true;
    });

    const requisicao = controladorHttp.expectOne((item) =>
      item.url === 'http://localhost:8080/api/bancos-contas/disponiveis'
      && item.params.get('mes') === '11'
      && item.params.get('ano') === '2026');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ sucesso: true, mensagem: 'OK', valor: bancosContas });
    expect(respostaRecebida).toBe(true);
  });
});
