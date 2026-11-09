import { registerLocaleData } from '@angular/common';
import localePtBr from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Competencia, LancamentoCartaoCredito } from '../modelos/cartao-credito';
import { ComponenteCartoesCredito } from './cartoes-credito';

describe('ComponenteCartoesCredito', () => {
  let controladorHttp: HttpTestingController;

  beforeEach(async () => {
    registerLocaleData(localePtBr);
    await TestBed.configureTestingModule({
      imports: [ComponenteCartoesCredito],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    controladorHttp = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controladorHttp.verify());

  it('soma gastos pelas competências e exibe mês e ano associados pelo id', () => {
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    const mesAtual = dataAtual.getMonth() + 1;
    const competencias = [-1, 0, 1, 2, 3].map((deslocamento, indice): Competencia => {
      const data = new Date(anoAtual, mesAtual - 1 + deslocamento, 1);
      return {
        id: 17 + indice * 9,
        nrAno: data.getFullYear(),
        nrMes: data.getMonth() + 1,
        dsMesAno: `${data.getMonth() + 1}/${data.getFullYear()}`,
      };
    });
    const competencia = (deslocamento: number) => competencias[deslocamento + 1];
    const criarLancamento = (
      id: number,
      competenciaId: number,
      vlCompra: number,
      bancoContaId = 7,
    ): LancamentoCartaoCredito => ({
      id,
      bancoContaId,
      competenciaId,
      tipoMovimentacaoId: 12,
      nrDia: '6',
      dtMovimentacao: '2026-11-06',
      vlCompra,
      dsObservacao: `Compra ${id}`,
      nrParcelas: 1,
      icSituacao: 'SIM',
      vinculoId: null,
    });
    const lancamentos = [
      criarLancamento(1, competencia(-1).id, 50),
      criarLancamento(2, competencia(0).id, 100),
      criarLancamento(3, competencia(0).id, 900, 99),
      criarLancamento(4, competencia(1).id, 80),
      criarLancamento(5, competencia(2).id, 200),
      criarLancamento(6, competencia(3).id, 300),
    ];
    const fixture = TestBed.createComponent(ComponenteCartoesCredito);
    fixture.detectChanges();

    controladorHttp.expectOne('http://localhost:8080/api/cartoes-credito')
      .flush({ sucesso: true, mensagem: 'OK', valor: lancamentos });
    controladorHttp.expectOne('http://localhost:8080/api/competencias')
      .flush({ sucesso: true, mensagem: 'OK', valor: competencias });
    controladorHttp.expectOne((requisicao) =>
      requisicao.url === 'http://localhost:8080/api/bancos-contas/disponiveis'
      && requisicao.params.get('mes') === String(mesAtual)
      && requisicao.params.get('ano') === String(anoAtual))
      .flush({
        sucesso: true,
        mensagem: 'OK',
        valor: [{
          bancoContaId: 7,
          bancoId: 2,
          nomeBanco: 'Banco teste',
          contaId: 4,
          nomeConta: 'Conta corrente',
        }],
      });
    controladorHttp.expectOne('http://localhost:8080/api/tipos-movimentacao/ativos')
      .flush({ sucesso: true, mensagem: 'OK', valor: [{
        id: 12,
        dsTipoMovimentacao: 'Compra',
        dsCategoria: 'Alimentação',
        icTipoMovimentacao: 'DEBITO',
      }] });

    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.summary-card strong') as NodeListOf<HTMLElement>;
    expect(cards[0].textContent).toContain('50,00');
    expect(cards[1].textContent).toContain('100,00');
    expect(cards[2].textContent).toContain('80,00');
    expect(cards[3].textContent).toContain('500,00');

    const rows = fixture.nativeElement.querySelectorAll('.transactions tbody tr') as NodeListOf<HTMLTableRowElement>;
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Compra 2');
    expect(rows[0].textContent).toContain(String(anoAtual));
    expect(rows[0].querySelectorAll('button.edit-row-button')).toHaveLength(1);
    expect(rows[0].querySelectorAll('button.delete-row-button')).toHaveLength(1);
    expect(rows[0].textContent).toContain([
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ][mesAtual - 1]);
  });
});
