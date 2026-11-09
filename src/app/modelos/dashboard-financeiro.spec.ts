import {
  agregarInvestimentos,
  agregarOrigemRendas,
  agregarPorCategoria,
  calcularIndicadoresFinanceiros,
  LinhaDashboardFinanceiro,
} from './dashboard-financeiro';

describe('agregações do dashboard financeiro', () => {
  const linhas: LinhaDashboardFinanceiro[] = [
    {
      id: 1,
      idConta: 1,
      idBanco: 1,
      bancoConta: 'Banco A / Conta corrente',
      dsObservacao: 'Salário',
      dtMovimentacao: '2025-01-01',
      nrDia: 1,
      nrMes: 1,
      nrAno: 2025,
      vlCredito: 5000,
      vlDebito: 0,
      idTipoMovimentacao: 1,
      dsTipoMovimentacao: 'Crédito',
      icRelatorio: 'RENDA',
      dsCategoria: 'Salário',
      icTipo: 'C',
      dsInvestimento: '',
    },
    {
      id: 2,
      idConta: 1,
      idBanco: 1,
      bancoConta: 'Banco A / Conta corrente',
      dsObservacao: 'Mercado',
      dtMovimentacao: '2025-01-02',
      nrDia: 2,
      nrMes: 1,
      nrAno: 2025,
      vlCredito: 0,
      vlDebito: 800,
      idTipoMovimentacao: 2,
      dsTipoMovimentacao: 'Débito',
      icRelatorio: 'DEBITO',
      dsCategoria: 'Alimentação',
      icTipo: 'D',
      dsInvestimento: '',
    },
    {
      id: 3,
      idConta: 1,
      idBanco: 1,
      bancoConta: 'Banco A / Conta corrente',
      dsObservacao: 'Aporte CDB',
      dtMovimentacao: '2025-01-03',
      nrDia: 3,
      nrMes: 1,
      nrAno: 2025,
      vlCredito: 0,
      vlDebito: 1200,
      idTipoMovimentacao: 3,
      dsTipoMovimentacao: 'Aplicação',
      icRelatorio: 'APLICACAO',
      dsCategoria: 'Investimentos',
      icTipo: 'A',
      dsInvestimento: 'CDB',
    },
    {
      id: 4,
      idConta: 1,
      idBanco: 1,
      bancoConta: 'Banco A / Conta corrente',
      dsObservacao: 'Resgate CDB',
      dtMovimentacao: '2025-01-04',
      nrDia: 4,
      nrMes: 1,
      nrAno: 2025,
      vlCredito: 200,
      vlDebito: 0,
      idTipoMovimentacao: 4,
      dsTipoMovimentacao: 'Resgate',
      icRelatorio: 'RESGATE',
      dsCategoria: 'Investimentos',
      icTipo: 'R',
      dsInvestimento: 'CDB',
    },
  ];

  it('calcula entradas, saídas, saldo líquido e total investido', () => {
    expect(calcularIndicadoresFinanceiros(linhas)).toEqual({
      totalEntradas: 5200,
      totalSaidas: 2000,
      saldoLiquido: 3200,
      totalInvestido: 1200,
    });
  });

  it('agrupa despesas por categoria e aportes/resgates por investimento', () => {
    expect(agregarPorCategoria(linhas)).toEqual([
      { nome: 'Investimentos', valor: 1200 },
      { nome: 'Alimentação', valor: 800 },
    ]);
    expect(agregarInvestimentos(linhas)).toEqual([
      { nome: 'CDB', valor: 1200, secundario: 200 },
    ]);
  });

  it('agrupa as maiores origens de renda por categoria ou conta', () => {
    expect(agregarOrigemRendas(linhas)).toEqual([
      { nome: 'Salário', valor: 5000 },
      { nome: 'Investimentos', valor: 200 },
    ]);
  });
});
