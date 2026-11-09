import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServicoTransferencias } from './transferencias';

describe('ServicoTransferencias', () => {
  let servico: ServicoTransferencias;
  let controladorHttp: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(ServicoTransferencias);
    controladorHttp = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controladorHttp.verify());

  it('consulta destinos disponíveis usando o id da conta de origem', () => {
    const destinos = [{
      bancoContaId: 2,
      bancoId: 3,
      nomeBanco: 'Banco destino',
      contaId: 4,
      nomeConta: 'Conta destino',
    }];
    let respostaRecebida = false;

    servico.listarDestinosDisponiveis(1).subscribe((resposta) => {
      expect(resposta).toEqual(destinos);
      respostaRecebida = true;
    });

    const requisicao = controladorHttp.expectOne((item) =>
      item.url === 'http://localhost:8080/api/transferencias/disponiveis'
      && item.params.get('bancoContaId') === '1');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ sucesso: true, mensagem: 'OK', valor: destinos });
    expect(respostaRecebida).toBe(true);
  });
});
