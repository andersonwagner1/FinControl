import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponenteSankeyFinanceiro } from '../componentes/sankey-financeiro/sankey-financeiro';
import {
  agregarInvestimentos,
  agregarOrigemRendas,
  agregarPorCategoria,
  calcularIndicadoresFinanceiros,
  FluxoFinanceiro,
  LinhaDashboardFinanceiro,
  ValorAgrupado,
} from '../modelos/dashboard-financeiro';
import {
  agruparFluxoMensal,
  LinhaTabelaMensal,
  MovimentacaoFinanceira,
  RelatorioFinanceiro,
} from '../modelos/movimentacao-financeira';
import { ServicoDashboardFinanceiro } from '../servicos/dashboard-financeiro';

type ModoPeriodo = 'mes' | 'intervalo';
type ChaveOrdenacao = 'dtMovimentacao' | 'dsObservacao' | 'dsCategoria' | 'bancoConta' | 'dsTipoMovimentacao' | 'vlCredito' | 'vlDebito';

interface PontoFluxo extends FluxoFinanceiro {
  x: number;
  yEntradas: number;
  ySaidas: number;
}

interface SegmentoRosca extends ValorAgrupado {
  offset: number;
  dashArray: string;
  cor: string;
}

const CORES_ROSCA = ['#15856a', '#4bb99a', '#83d1b4', '#e1a34b', '#e47a5f', '#7282ce', '#40a9bb'];
const ID_CONTA_SANKEY = 1;

@Component({
  selector: 'app-dashboard-financeiro',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, FormsModule, ComponenteSankeyFinanceiro],
  templateUrl: './dashboard-financeiro.html',
  styleUrl: './dashboard-financeiro.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponenteDashboardFinanceiro implements OnInit {
  private readonly servico = inject(ServicoDashboardFinanceiro);
  protected readonly linhas = signal<LinhaDashboardFinanceiro[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly modoPeriodo = signal<ModoPeriodo>('mes');
  protected readonly mes = signal(new Date().getMonth() + 1);
  protected readonly ano = signal(new Date().getFullYear());
  protected readonly dataInicio = signal(this.dataAtual());
  protected readonly dataFim = signal(this.dataAtual());
  protected readonly conta = signal('');
  protected readonly categoria = signal('');
  protected readonly relatorio = signal('');
  protected readonly temaEscuro = signal(this.carregarTema());
  protected readonly pagina = signal(1);
  protected readonly ordenacao = signal<ChaveOrdenacao>('dtMovimentacao');
  protected readonly ordemAscendente = signal(false);
  protected readonly tamanhoPagina = 10;

  protected readonly meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  protected readonly linhasDoPeriodo = computed(() => {
    const dataInicio = this.modoPeriodo() === 'mes'
      ? `${this.ano()}-${String(this.mes()).padStart(2, '0')}-01`
      : this.dataInicio();
    const dataFim = this.modoPeriodo() === 'mes'
      ? this.fimDoMes(this.ano(), this.mes())
      : this.dataFim();
    return this.linhas().filter((linha) => {
      const data = this.dataParaFiltro(linha);
      return data >= dataInicio && data <= dataFim;
    });
  });
  protected readonly linhasContaSankey = computed(() =>
    this.linhas().filter((linha) => linha.idConta === ID_CONTA_SANKEY));
  protected readonly linhasContaSankeyDoPeriodo = computed(() => {
    return this.linhasDoPeriodo().filter((linha) => linha.idConta === ID_CONTA_SANKEY);
  });
  protected readonly linhasFiltradas = computed(() => {
    const conta = this.conta();
    const categoria = this.categoria();
    const relatorio = this.relatorio();
    return this.linhasDoPeriodo().filter((linha) =>
      (!conta || linha.bancoConta === conta)
      && (!categoria || linha.dsCategoria === categoria)
      && (!relatorio || linha.icRelatorio === relatorio));
  });
  protected readonly movimentosSankey = computed(() => this.linhasContaSankeyDoPeriodo()
    .flatMap((linha) => this.converterMovimentacao(linha)));
  protected readonly movimentosTabelaMensal = computed(() => this.linhasContaSankey()
    .flatMap((linha) => this.converterMovimentacao(linha)));
  protected readonly linhasTabelaMensal = computed<LinhaTabelaMensal[]>(() =>
    agruparFluxoMensal(this.movimentosTabelaMensal()));
  protected readonly saldoAnteriorSankey = computed(() => {
    const inicio = this.modoPeriodo() === 'mes'
      ? `${this.ano()}-${String(this.mes()).padStart(2, '0')}-01`
      : this.dataInicio();
    const anterioresPorConta = new Map<string, LinhaDashboardFinanceiro[]>();

    for (const linha of this.linhasContaSankey()) {
      if (this.dataParaFiltro(linha) >= inicio) {
        continue;
      }
      const anteriores = anterioresPorConta.get(linha.bancoConta) ?? [];
      anteriores.push(linha);
      anterioresPorConta.set(linha.bancoConta, anteriores);
    }

    let saldo = 0;
    for (const anteriores of anterioresPorConta.values()) {
      anteriores.sort((a, b) => this.dataParaFiltro(a).localeCompare(this.dataParaFiltro(b)) || a.id - b.id);
      const ultimoSaldo = anteriores[anteriores.length - 1].vlSaldo;
      saldo += ultimoSaldo ?? anteriores.reduce((total, linha) => total + linha.vlCredito - linha.vlDebito, 0);
    }
    return Math.max(0, saldo);
  });
  protected readonly indicadores = computed(() => calcularIndicadoresFinanceiros(this.linhasFiltradas()));
  protected readonly categorias = computed(() => this.unicos(this.linhas().map((linha) => linha.dsCategoria)));
  protected readonly contas = computed(() => this.unicos(this.linhas().map((linha) => linha.bancoConta)));
  protected readonly relatorios = computed(() => this.unicos(this.linhas().map((linha) => linha.icRelatorio)));
  protected readonly dadosCategorias = computed(() => agregarPorCategoria(this.linhasFiltradas()));
  protected readonly segmentosRosca = computed(() => this.criarSegmentos(this.dadosCategorias()));
  protected readonly dadosInvestimentos = computed(() => agregarInvestimentos(this.linhasFiltradas()).slice(0, 7));
  protected readonly origensRenda = computed(() => agregarOrigemRendas(this.linhasFiltradas()));
  protected readonly fluxo = computed(() => this.criarFluxo(this.linhasFiltradas()));
  protected readonly pontosFluxo = computed(() => this.criarPontosFluxo(this.fluxo()));
  protected readonly caminhoEntradas = computed(() => this.criarCaminho(this.pontosFluxo(), 'yEntradas'));
  protected readonly caminhoSaidas = computed(() => this.criarCaminho(this.pontosFluxo(), 'ySaidas'));
  protected readonly areaEntradas = computed(() => this.criarArea(this.pontosFluxo(), 'yEntradas'));
  protected readonly areaSaidas = computed(() => this.criarArea(this.pontosFluxo(), 'ySaidas'));
  protected readonly linhasPagina = computed(() => {
    const chave = this.ordenacao();
    const direcao = this.ordemAscendente() ? 1 : -1;
    return [...this.linhasFiltradas()]
      .sort((a, b) => {
        const valorA = a[chave];
        const valorB = b[chave];
        if (typeof valorA === 'number' && typeof valorB === 'number') {
          return (valorA - valorB) * direcao;
        }
        return String(valorA ?? '').localeCompare(String(valorB ?? ''), 'pt-BR') * direcao;
      })
      .slice((this.pagina() - 1) * this.tamanhoPagina, this.pagina() * this.tamanhoPagina);
  });
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.linhasFiltradas().length / this.tamanhoPagina)));
  protected readonly totalCategorias = computed(() => this.dadosCategorias().reduce((soma, item) => soma + item.valor, 0));
  protected readonly maxInvestimento = computed(() => Math.max(1, ...this.dadosInvestimentos().map((item) => item.valor + (item.secundario ?? 0))));
  protected readonly maxRenda = computed(() => Math.max(1, ...this.origensRenda().map((item) => item.valor)));
  protected readonly periodoLegenda = computed(() => this.modoPeriodo() === 'mes'
    ? `${this.meses[this.mes() - 1]} ${this.ano()}`
    : `${this.formatarData(this.dataInicio())} – ${this.formatarData(this.dataFim())}`);

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.servico.consultar().subscribe({
      next: (linhas) => {
        this.linhas.set(linhas);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        console.error('Erro ao carregar dados do dashboard financeiro:', erro);
        this.erro.set(erro instanceof Error ? erro.message : 'Não foi possível carregar os dados financeiros.');
        this.carregando.set(false);
      },
    });
  }

  protected alterarModoPeriodo(modo: ModoPeriodo): void {
    this.modoPeriodo.set(modo);
    this.pagina.set(1);
  }

  protected alterarDataInicio(data: string): void {
    this.dataInicio.set(data);
    if (this.dataFim() < data) {
      this.dataFim.set(data);
    }
    this.atualizarFiltro();
  }

  protected alterarDataFim(data: string): void {
    this.dataFim.set(data);
    if (this.dataInicio() > data) {
      this.dataInicio.set(data);
    }
    this.atualizarFiltro();
  }

  protected alternarTema(): void {
    this.temaEscuro.update((escuro) => !escuro);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('finora-dashboard-theme', this.temaEscuro() ? 'dark' : 'light');
    }
  }

  protected limparFiltros(): void {
    this.conta.set('');
    this.categoria.set('');
    this.relatorio.set('');
    this.mes.set(new Date().getMonth() + 1);
    this.ano.set(new Date().getFullYear());
    this.dataInicio.set(this.dataAtual());
    this.dataFim.set(this.dataAtual());
    this.pagina.set(1);
  }

  protected ordenarPor(chave: ChaveOrdenacao): void {
    if (this.ordenacao() === chave) {
      this.ordemAscendente.update((ascendente) => !ascendente);
    } else {
      this.ordenacao.set(chave);
      this.ordemAscendente.set(true);
    }
    this.pagina.set(1);
  }

  protected irParaPagina(pagina: number): void {
    this.pagina.set(Math.max(1, Math.min(this.totalPaginas(), pagina)));
  }

  protected atualizarFiltro(): void {
    this.pagina.set(1);
  }

  private converterMovimentacao(linha: LinhaDashboardFinanceiro): MovimentacaoFinanceira[] {
    const icRelatorio = this.relatorioFinanceiro(linha.icRelatorio);
    if (!icRelatorio || linha.nrAno < 1 || linha.nrMes < 1 || linha.nrMes > 12) {
      return [];
    }
    const ehSaida = ['DEBITO', 'MENSAL', 'APLICACAO'].includes(icRelatorio);
    return [{
      ano: linha.nrAno,
      mes: linha.nrMes,
      dsTipoMovimentacao: linha.dsTipoMovimentacao,
      icRelatorio,
      valor: ehSaida ? linha.vlDebito : linha.vlCredito,
      dsInvestimento: linha.dsInvestimento,
    }];
  }

  private relatorioFinanceiro(valor: string): RelatorioFinanceiro | null {
    switch (valor) {
      case 'RESGATE':
      case 'CREDITO':
      case 'RENDA':
      case 'DEBITO':
      case 'MENSAL':
      case 'APLICACAO':
        return valor;
      default:
        return null;
    }
  }

  protected etiquetaOrdenacao(chave: ChaveOrdenacao): string {
    return this.ordenacao() === chave ? (this.ordemAscendente() ? '↑' : '↓') : '↕';
  }

  protected largura(valor: number, maximo: number): number {
    return Math.max(valor > 0 ? 2 : 0, (valor / maximo) * 100);
  }

  protected classesValor(linha: LinhaDashboardFinanceiro): string {
    return ['R', 'C', 'TC'].includes(linha.icTipo) ? 'positive' : 'negative';
  }

  protected trackLinha(_index: number, linha: LinhaDashboardFinanceiro): number {
    return linha.id;
  }

  private criarSegmentos(categorias: readonly ValorAgrupado[]): SegmentoRosca[] {
    const circunferencia = 251.327;
    const total = categorias.reduce((soma, item) => soma + item.valor, 0);
    let acumulado = 0;
    return categorias.map((categoria, index) => {
      const comprimento = total === 0 ? 0 : (categoria.valor / total) * circunferencia;
      const segmento: SegmentoRosca = {
        ...categoria,
        offset: -acumulado,
        dashArray: `${comprimento} ${circunferencia - comprimento}`,
        cor: CORES_ROSCA[index % CORES_ROSCA.length],
      };
      acumulado += comprimento;
      return segmento;
    });
  }

  private criarFluxo(linhas: readonly LinhaDashboardFinanceiro[]): FluxoFinanceiro[] {
    const agregados = new Map<string, FluxoFinanceiro>();
    if (this.modoPeriodo() === 'mes') {
      const diasNoMes = new Date(this.ano(), this.mes(), 0).getDate();
      for (let dia = 1; dia <= diasNoMes; dia++) {
        agregados.set(String(dia), { periodo: String(dia), entradas: 0, saidas: 0 });
      }
      for (const linha of linhas) {
        const dia = this.dataParaFiltro(linha).slice(8, 10);
        const fluxo = agregados.get(dia);
        if (fluxo) {
          fluxo.entradas += linha.vlCredito;
          fluxo.saidas += linha.vlDebito;
        }
      }
    } else {
      for (const linha of linhas) {
        const chave = `${linha.nrAno}-${String(linha.nrMes).padStart(2, '0')}`;
        const fluxo = agregados.get(chave) ?? {
          periodo: `${this.meses[linha.nrMes - 1]?.slice(0, 3) ?? chave} ${linha.nrAno}`,
          entradas: 0,
          saidas: 0,
        };
        fluxo.entradas += linha.vlCredito;
        fluxo.saidas += linha.vlDebito;
        agregados.set(chave, fluxo);
      }
      return [...agregados.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, fluxo]) => fluxo);
    }
    return [...agregados.values()];
  }

  private criarPontosFluxo(fluxo: readonly FluxoFinanceiro[]): PontoFluxo[] {
    if (fluxo.length === 0) {
      return [];
    }
    const maximo = Math.max(1, ...fluxo.flatMap((item) => [item.entradas, item.saidas]));
    const espacamento = fluxo.length <= 1 ? 0 : 680 / (fluxo.length - 1);
    return fluxo.map((item, index) => ({
      ...item,
      x: 30 + index * espacamento,
      yEntradas: 190 - (item.entradas / maximo) * 160,
      ySaidas: 190 - (item.saidas / maximo) * 160,
    }));
  }

  private criarCaminho(pontos: readonly PontoFluxo[], chave: 'yEntradas' | 'ySaidas'): string {
    return pontos.map((ponto, index) =>
      `${index === 0 ? 'M' : 'L'} ${ponto.x} ${ponto[chave]}`).join(' ');
  }

  private criarArea(pontos: readonly PontoFluxo[], chave: 'yEntradas' | 'ySaidas'): string {
    if (pontos.length === 0) {
      return '';
    }
    return `${this.criarCaminho(pontos, chave)} L ${pontos[pontos.length - 1].x} 200 L ${pontos[0].x} 200 Z`;
  }

  private unicos(valores: string[]): string[] {
    return [...new Set(valores.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  private dataAtual(): string {
    const data = new Date();
    return new Date(data.getTime() - data.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }

  private fimDoMes(ano: number, mes: number): string {
    const dia = new Date(ano, mes, 0).getDate();
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  private formatarData(data: string): string {
    if (!data) {
      return '';
    }
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${data}T12:00:00`));
  }

  private dataParaFiltro(linha: LinhaDashboardFinanceiro): string {
    if (linha.dtMovimentacao) {
      return linha.dtMovimentacao;
    }
    if (linha.nrAno > 0 && linha.nrMes > 0) {
      const dia = Math.max(1, linha.nrDia || 1);
      return `${linha.nrAno}-${String(linha.nrMes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
    return '';
  }

  private carregarTema(): boolean {
    return typeof localStorage !== 'undefined' && localStorage.getItem('finora-dashboard-theme') === 'dark';
  }
}
