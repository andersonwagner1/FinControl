import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServicoDashboardFinanceiro } from './dashboard-financeiro';

describe('ServicoDashboardFinanceiro', () => {
  let servico: ServicoDashboardFinanceiro;
  let controladorHttp: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(ServicoDashboardFinanceiro);
    controladorHttp = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controladorHttp.verify());

  it('combina movimentações com os cadastros usados no dashboard', () => {
    let resultado: unknown;

    servico.consultar().subscribe((linhas) => {
      resultado = linhas;
    });

    const respostas: Record<string, unknown[]> = {
      '/movimentacoes': [{
        id: 11,
        dtMovimentacao: '2025-03-08T00:00:00',
        nrDia: 8,
        vlCredito: 0,
        vlDebito: 125,
        dsObservacao: 'Compras',
        icSituacao: 'SIM',
        bancoContaId: 3,
        competenciaId: 5,
        tipoMovimentacaoId: 7,
        investimentoId: null,
      }],
      '/bancos-contas': [{ id: 3, bancoId: 2, contaId: 4 }],
      '/bancos': [{ id: 2, dsBanco: 'Banco Azul' }],
      '/contas': [{ id: 4, dsConta: 'Conta corrente' }],
      '/categorias-movimentacao': [{ id: 6, dsCategoria: 'Alimentação', icTipo: 'D' }],
      '/tipos-movimentacao': [{
        id: 7,
        dsTipoMovimentacao: 'Débito',
        categoriaId: 6,
        icRelatorio: 'DEBITO',
        icTipoMovimentacao: 'DEBITO',
      }],
      '/investimentos': [],
      '/competencias': [{ id: 5, nrAno: 2025, nrMes: 3 }],
    };

    for (const [recurso, valor] of Object.entries(respostas)) {
      controladorHttp.expectOne(`http://localhost:8080/api${recurso}`).flush({
        sucesso: true,
        mensagem: 'OK',
        valor,
      });
    }

    expect(resultado).toEqual([{
      id: 11,
      idConta: 4,
      idBanco: 2,
      bancoConta: 'Banco Azul / Conta corrente',
      dsObservacao: 'Compras',
      dtMovimentacao: '2025-03-08',
      nrDia: 8,
      nrMes: 3,
      nrAno: 2025,
      vlCredito: 0,
      vlDebito: 125,
      idTipoMovimentacao: 7,
      dsTipoMovimentacao: 'Débito',
      icRelatorio: 'DEBITO',
      dsCategoria: 'Alimentação',
      icTipo: 'D',
      dsInvestimento: '',
    }]);
  });
});
