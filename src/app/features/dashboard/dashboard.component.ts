import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { forkJoin, map, of, Subscription } from 'rxjs';
import { ContaService } from '../../core/services/conta.service';
import { LancamentoService } from '../../core/services/lancamento.service';
import { BancoService } from '../../core/services/banco.service';
import { Banco } from '../../core/models/banco.model';
import { Conta, TIPOS_CONTA } from '../../core/models/conta.model';
import { Lancamento } from '../../core/models/lancamento.model';
import { LancamentoCartao } from '../../core/models/lancamento-cartao.model';
import { DashboardCart } from '../../core/models/dashboard-cart.model';
import { DashboardService, RelatorioMensal } from '../../core/services/dashboard.service';
import { LancamentoCartaoService } from '../../core/services/lancamento-cartao.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';

Chart.register(...registerables);

interface ResumoBanco {
  banco: Banco;
  saldoTotal: number;
  contas: number;
  contatypes: string[];
}

interface SankeyFluxo {
  origem: string;
  destino: string;
  valor: number;
  tipo: 'entrada' | 'saida' | 'transferencia';
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('donutChart') donutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gastosChart') gastosChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('patrimonioChart') patrimonioChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fluxoMensalChart') fluxoMensalChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sankeyChart') sankeyChartRef!: ElementRef<HTMLDivElement>;

  private subs = new Subscription();
  private donutChart?: Chart;
  private barChart?: Chart;
  private gastosChart?: Chart<'pie', number[], string>;
  private patrimonioChart?: Chart<'line', number[], string>;
  private fluxoMensalChart?: Chart<'line', number[], string>;
  private sankeyChart?: ECharts;
  private viewReady = false;
  private competenciaRequestId = 0;
  private patrimonioRequestId = 0;
  private fluxoMensalRequestId = 0;

  contas: Conta[] = [];
  private contasOriginais: Conta[] = [];
  lancamentos: Lancamento[] = [];
  private lancamentosCompetencia: Lancamento[] = [];
  lancamentosCartao: LancamentoCartao[] = [];
  bancos: Banco[] = [];
  resumosBanco: ResumoBanco[] = [];

  saldoTotal = 0;
  saldoBancario = 0;
  saldoInvestimentos = 0;
  totalCreditos = 0;
  totalDebitos = 0;
  gastosPorTipo: Array<{ tipo: string; valor: number }> = [];
  totalGastos = 0;
  carregandoGastos = false;
  erroGastos = false;
  patrimonioMensal: Array<{ competencia: string; rotulo: string; saldo: number }> = [];
  carregandoPatrimonioMensal = false;
  erroPatrimonioMensal = false;
  fluxoMensal: Array<{ competencia: string; rotulo: string; creditos: number; debitos: number; lucro: number }> = [];
  carregandoFluxoMensal = false;
  erroFluxoMensal = false;
  anoRelatorio = new Date().getFullYear();
  relatorioMensal: RelatorioMensal[] = [];
  carregandoRelatorio = false;
  erroRelatorio = false;
  private dashboardCartLoaded = false;
  dashboardCart: DashboardCart = {
    patrimonioTotal: 0,
    saldoBancario: 0,
    investimentos: 0,
    creditosMes: 0,
    debitosMes: 0,
    saldoMes: 0,
  };
  mesAtual = new Date().getMonth() + 1;
  anoAtual = new Date().getFullYear();

  ultimosLancamentos: Lancamento[] = [];
  competenciaInicial = this.formatarCompetencia(new Date());
  competenciaFinal = this.competenciaInicial;

  get sankeyFluxos(): SankeyFluxo[] {
    const fluxos = new Map<string, SankeyFluxo>();
    /*const adicionarFluxo = (origem: string, destino: string, valor: number, tipo: SankeyFluxo['tipo']): void => {
      const chave = `${tipo}|${origem}|${destino}`;
      const atual = fluxos.get(chave);
      if (atual) {
        atual.valor += valor;
      } else {
        fluxos.set(chave, { origem, destino, valor, tipo });
      }
    };

    for (const lancamento of this.lancamentos) {
      const conta = this.contas.find(c => c.id === lancamento.contaId);
      if (!conta || lancamento.valor <= 0) continue;

      if (lancamento.transferenciaId) {
        if (lancamento.tipo !== 'debito') continue;
        const destino = this.lancamentos.find(l => l.transferenciaId === lancamento.transferenciaId && l.tipo === 'credito');
        const contaDestino = destino && this.contas.find(c => c.id === destino.contaId);
        if (contaDestino && contaDestino.tipo !== 'CC') {
          adicionarFluxo(this.nomeConta(conta), this.nomeConta(contaDestino), lancamento.valor, 'transferencia');
        }
        continue;
      }

      if (lancamento.tipo === 'credito') {
        adicionarFluxo(lancamento.categoria || 'Outras entradas', this.nomeConta(conta), lancamento.valor, 'entrada');
      } else {
        adicionarFluxo(this.nomeConta(conta), lancamento.categoria || 'Outras saídas', lancamento.valor, 'saida');
      }
    }
*/
    return Array.from(fluxos.values()).sort((a, b) => b.valor - a.valor);
  }

  get sankeyEntradas(): SankeyFluxo[] {
    return this.sankeyFluxos.filter(fluxo => fluxo.tipo === 'entrada');
  }

  get sankeySaidas(): SankeyFluxo[] {
    return this.sankeyFluxos.filter(fluxo => fluxo.tipo === 'saida');
  }

  get sankeyTransferencias(): SankeyFluxo[] {
    return this.sankeyFluxos.filter(fluxo => fluxo.tipo === 'transferencia');
  }

  getSankeyLargura(valor: number): number {
    const maiorValor = Math.max(...this.sankeyFluxos.map(fluxo => fluxo.valor), 1);
    return Math.max(8, Math.round((valor / maiorValor) * 30));
  }

  nomeConta(conta: Conta): string {
    return conta.tipo === 'CC' ? 'Conta Corrente · ' + this.getBancoNome(conta.bancoId) : this.getBancoNome(conta?.id) + ' · ' + conta.descricao;
  }

  tiposConta = TIPOS_CONTA;

  getTipoContaInfo(tipo: string) {
    return TIPOS_CONTA[tipo as keyof typeof TIPOS_CONTA] ?? { label: tipo, icone: '?', cor: '#888', categoria: 'bancaria' };
  }

  constructor(
    private contaService: ContaService,
    private lancamentoService: LancamentoService,
    private bancoService: BancoService,
    private dashboardService: DashboardService
    , private lancamentoCartaoService: LancamentoCartaoService
  ) {}

  ngOnInit(): void {
    const periodoAtual = this.lancamentoService.periodoMesVigente();
    this.subs.add(this.lancamentoService.buscarPagina('1900-01-01', periodoAtual.dataFim, 0, 500)
      .subscribe({ error: () => undefined }));

    this.subs.add(
      this.bancoService.getBancos().subscribe(bancos => {
        this.bancos = bancos;
        this.calcularResumos();
      })
    );

    this.subs.add(
      this.contaService.getContas().subscribe(contas => {
        this.contasOriginais = contas;
        this.carregarSaldosCompetencia(this.competenciaRequestId);
        this.carregarEvolucaoPatrimonio();
        this.updateSankeyChart();
      })
    );

    this.subs.add(
      this.lancamentoService.getLancamentos().subscribe(lancamentos => {
        this.lancamentos = lancamentos;
        this.ultimosLancamentos = [...lancamentos]
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
          .slice(0, 8);
      })
    );

    this.atualizarPeriodoSankey();
    this.carregarFluxoMensal();
    this.carregarRelatorio();
  }

  private carregarRelatorio(): void {
    this.carregandoRelatorio = true;
    this.erroRelatorio = false;

    this.subs.add(this.dashboardService.getRelatorio(this.anoRelatorio).subscribe({
      next: relatorio => {
        this.relatorioMensal = relatorio;
        this.carregandoRelatorio = false;
      },
      error: () => {
        this.relatorioMensal = [];
        this.carregandoRelatorio = false;
        this.erroRelatorio = true;
      }
    }));
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    setTimeout(() => this.initCharts(), 200);
  }

  calcularResumos(): void {
    this.saldoBancario = this.contaService.getSaldoTotalBancario();
    this.saldoInvestimentos = this.contaService.getSaldoTotalInvestimentos();
    this.saldoTotal = this.saldoBancario + this.saldoInvestimentos;
    if (!this.dashboardCartLoaded) {
      this.dashboardCart = {
        ...this.dashboardCart,
        patrimonioTotal: this.saldoTotal,
        saldoBancario: this.saldoBancario,
        investimentos: this.saldoInvestimentos,
      };
    }

    this.resumosBanco = this.bancos.map(banco => {
      const contasBanco = this.contas.filter(c => c.bancoId === banco.id);
      return {
        banco,
        saldoTotal: contasBanco.reduce((acc, c) => acc + c.saldo, 0),
        contas: contasBanco.length,
        contatypes: [...new Set(contasBanco.map(c => c.tipo))],
      };
    });

    if (this.donutChart) {
      this.updateCharts();
    }
  }

  initCharts(): void {
    this.initDonutChart();
    this.initBarChart();
    this.atualizarGraficoGastos();
    this.atualizarGraficoPatrimonio();
    this.atualizarGraficoFluxoMensal();
    this.updateSankeyChart();
  }

  private carregarFluxoMensal(): void {
    const requestId = ++this.fluxoMensalRequestId;
    const hoje = new Date();
    const primeiroMes = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const meses = Array.from({ length: 12 }, (_, index) => {
      const data = new Date(primeiroMes.getFullYear(), primeiroMes.getMonth() + index, 1);
      return {
        competencia: this.formatarCompetencia(data),
        rotulo: data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        creditos: 0,
        debitos: 0,
        lucro: 0
      };
    });

    this.carregandoFluxoMensal = true;
    this.erroFluxoMensal = false;
    this.subs.add(this.lancamentoService.buscarPeriodoCompleto(
      this.formatarData(primeiroMes),
      this.formatarData(ultimoDia)
    ).subscribe({
      next: lancamentos => {
        if (requestId !== this.fluxoMensalRequestId) return;

        const totais = new Map(meses.map(mes => [mes.competencia, mes]));
        lancamentos.forEach(lancamento => {
          const competencia = lancamento.data.slice(0, 7);
          const mes = totais.get(competencia);
          if (!mes) return;

          if (lancamento.tipo === 'CREDITO') {
            mes.creditos += Math.abs(lancamento.valor);
          } else if (lancamento.tipo === 'DEBITO') {
            mes.debitos += Math.abs(lancamento.valor);
          }
        });

        this.fluxoMensal = meses.map(mes => ({ ...mes, lucro: mes.creditos - mes.debitos }));
        this.carregandoFluxoMensal = false;
        this.atualizarGraficoFluxoMensal();
      },
      error: () => {
        if (requestId !== this.fluxoMensalRequestId) return;
        this.fluxoMensal = [];
        this.carregandoFluxoMensal = false;
        this.erroFluxoMensal = true;
        this.atualizarGraficoFluxoMensal();
      }
    }));
  }

  private atualizarGraficoFluxoMensal(): void {
    if (!this.viewReady || !this.fluxoMensalChartRef) return;

    const labels = this.fluxoMensal.map(item => item.rotulo);
    const datasets = [
      { label: 'Entradas', data: this.fluxoMensal.map(item => item.creditos), borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
      { label: 'Débitos', data: this.fluxoMensal.map(item => item.debitos), borderColor: '#ef4444', backgroundColor: '#ef4444' },
      { label: 'Lucro (entradas - débitos)', data: this.fluxoMensal.map(item => item.lucro), borderColor: '#22c55e', backgroundColor: '#22c55e' }
    ];

    if (!this.fluxoMensalChart) {
      this.fluxoMensalChart = new Chart(this.fluxoMensalChartRef.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: datasets.map(dataset => ({
            ...dataset,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { color: 'rgba(241,245,249,0.7)', usePointStyle: true, padding: 16 } },
            tooltip: {
              callbacks: {
                label: context => ` ${context.dataset.label}: ${Number(context.parsed.y).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
              }
            }
          },
          scales: {
            x: { ticks: { color: 'rgba(241,245,249,0.6)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: {
              ticks: {
                color: 'rgba(241,245,249,0.6)',
                callback: value => 'R$ ' + Number(value).toLocaleString('pt-BR')
              },
              grid: { color: 'rgba(255,255,255,0.06)' }
            }
          }
        }
      });
      return;
    }

    this.fluxoMensalChart.data.labels = labels;
    this.fluxoMensalChart.data.datasets.forEach((dataset, index) => {
      dataset.data = datasets[index].data;
    });
    this.fluxoMensalChart.update();
  }

  private carregarEvolucaoPatrimonio(): void {
    const requestId = ++this.patrimonioRequestId;
    const hoje = new Date();
    const competenciaAtual = this.formatarCompetencia(hoje);
    const meses = Array.from({ length: 12 }, (_, index) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - 11 + index, 1);
      return {
        competencia: this.formatarCompetencia(data),
        dataCompetencia: `${this.formatarCompetencia(data)}-01`,
        dataInicio: this.formatarData(data),
        dataFim: this.formatarData(new Date(data.getFullYear(), data.getMonth() + 1, 0)),
        rotulo: data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      };
    });

    this.carregandoPatrimonioMensal = true;
    this.erroPatrimonioMensal = false;
    const consultasMensais = meses.map(mes => {
      const contasDoMes = this.contasOriginais.filter(conta =>
        conta.dataAbertura <= mes.dataFim && (!conta.dataFechamento || conta.dataFechamento >= mes.dataInicio)
      );
      const consultas = contasDoMes.map(conta => conta.id == null
        ? of({ saldoFinal: 0 })
        : this.lancamentoService.buscarSaldoCompetencia(conta.id, mes.dataCompetencia));

      return (consultas.length > 0 ? forkJoin(consultas) : of([])).pipe(
        map(saldos => ({
          competencia: mes.competencia,
          rotulo: mes.rotulo,
          saldo: contasDoMes.reduce((total, conta, index) => total + (
            saldos[index]?.saldoFinal ?? (mes.competencia === competenciaAtual ? conta.saldo : 0)
          ), 0)
        }))
      );
    });

    this.subs.add(forkJoin(consultasMensais).subscribe({
      next: patrimonio => {
        if (requestId !== this.patrimonioRequestId) return;
        this.patrimonioMensal = patrimonio;
        this.carregandoPatrimonioMensal = false;
        this.atualizarGraficoPatrimonio();
      },
      error: () => {
        if (requestId !== this.patrimonioRequestId) return;
        this.patrimonioMensal = [];
        this.carregandoPatrimonioMensal = false;
        this.erroPatrimonioMensal = true;
      }
    }));
  }

  private atualizarGraficoPatrimonio(): void {
    if (!this.viewReady || !this.patrimonioChartRef) return;

    const labels = this.patrimonioMensal.map(item => item.rotulo);
    const valores = this.patrimonioMensal.map(item => item.saldo);
    if (!this.patrimonioChart) {
      this.patrimonioChart = new Chart(this.patrimonioChartRef.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Patrimônio',
            data: valores,
            borderColor: '#4ade80',
            backgroundColor: 'rgba(74, 222, 128, 0.12)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#4ade80'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: context => ` ${Number(context.parsed.y).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
              }
            }
          },
          scales: {
            x: { ticks: { color: 'rgba(241,245,249,0.6)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: {
              beginAtZero: false,
              ticks: {
                color: 'rgba(241,245,249,0.6)',
                callback: value => 'R$ ' + Number(value).toLocaleString('pt-BR')
              },
              grid: { color: 'rgba(255,255,255,0.06)' }
            }
          }
        }
      });
      return;
    }

    this.patrimonioChart.data.labels = labels;
    this.patrimonioChart.data.datasets[0].data = valores;
    this.patrimonioChart.update();
  }

  private updateSankeyChart(): void {
    if (!this.viewReady || !this.sankeyChartRef) return;

    const links = this.criarFluxosFinanceiros();
    const nodes = [...new Set(links.flatMap(link => [link.source, link.target]))]
      .map(name => ({ name, itemStyle: { color: name.startsWith('Crédito ·') ? '#4ade80' : '#fb7185' } }));

    if (!this.sankeyChart) {
      this.sankeyChart = echarts.init(this.sankeyChartRef.nativeElement);
    }

    const option: EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#141e33',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        textStyle: { color: '#f1f5f9' },
        valueFormatter: value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      },
      series: [{
        type: 'sankey',
        data: nodes,
        links,
        left: 16,
        right: 16,
        top: 16,
        bottom: 16,
        nodeWidth: 14,
        nodeGap: 12,
        draggable: false,
        layoutIterations: 32,
        label: { color: 'rgba(241,245,249,0.86)', fontFamily: 'Inter', fontSize: 12 },
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.38 },
        emphasis: { focus: 'adjacency' }
      }]
    };

    this.sankeyChart.setOption(option, true);
  }

  private criarFluxosFinanceiros(): Array<{ source: string; target: string; value: number }> {
    const fluxos = new Map<string, { source: string; target: string; value: number }>();
    const adicionar = (source: string, target: string, value: number): void => {
      if (value <= 0) return;
      const chave = `${source}|${target}`;
      const fluxo = fluxos.get(chave);
      if (fluxo) fluxo.value += value;
      else fluxos.set(chave, { source, target, value });
    };
    const contaPorId = new Map(this.contas.map(conta => [conta.id, conta]));
    const transferencias = this.lancamentosCompetencia.filter(l => l.transferenciaId && this.estaNoPeriodoSankey(l.data));

    // Transferências entre contas: identifica resgates e novas aplicações automaticamente.
    transferencias.filter(l => l.tipo === 'DEBITO').forEach(debito => {
      const credito = transferencias.find(l => l.transferenciaId === debito.transferenciaId && l.tipo === 'CREDITO');
      const origem = contaPorId.get(debito.bancoContaId);
      const destino = credito && contaPorId.get(credito.bancoContaId);
      if (!origem || !destino) return;

      if (!this.ehContaCorrente(origem) && this.ehContaCorrente(destino)) {
        adicionar(`Resgate · ${origem.descricao}`, 'Conta Corrente', debito.valor);
      } else if (this.ehContaCorrente(origem) && !this.ehContaCorrente(destino)) {
        adicionar('Conta Corrente', 'Aplicações e Investimentos', debito.valor);
      }
    });

    // Entradas e débitos feitos diretamente na conta corrente.
    this.lancamentosCompetencia
      .filter(l => !l.transferenciaId && l.valor > 0 && this.estaNoPeriodoSankey(l.data))
      .forEach(lancamento => {
        const conta = contaPorId.get(lancamento.bancoContaId);
        if (!conta || !this.ehContaCorrente(conta)) return;
        const categoria = lancamento.tipoMovimentacaoId || 'Sem categoria';
        if (lancamento.tipo === 'CREDITO') {
          adicionar(`Crédito · ${categoria}`, 'Conta Corrente', lancamento.valor);
       // } else if (categoria !== 'Cartão de Crédito') {
        //  adicionar('Conta Corrente', `Débito direto · ${categoria}`, lancamento.valor);
        }
      });

    // Compras do cartão usam o cartão como intermediário entre a conta e cada categoria final.
    const comprasCartao = this.lancamentosCartao
      .filter(l => l.tipo === 'debito' && l.valor > 0 && this.estaNoPeriodoSankey(l.data));
    const totalComprasCartao = comprasCartao.reduce((total, compra) => total + compra.valor, 0);
    const pagamentosFatura = this.lancamentosCompetencia
      .filter(l => {
        const conta = contaPorId.get(l.bancoContaId);
        return l.tipo === 'DEBITO' && !l.transferenciaId && this.ehContaCorrente(conta)
         /* && l.categoria === 'Cartão de Crédito'*/ && this.estaNoPeriodoSankey(l.data);
      })
      .reduce((total, pagamento) => total + pagamento.valor, 0);
    const fluxoFatura = totalComprasCartao || pagamentosFatura;
    if (fluxoFatura > 0) adicionar('Conta Corrente', 'Cartão de Crédito', fluxoFatura);
    comprasCartao.forEach(compra => {
      const categoria = compra.tipoMovimentacao?.trim() || 'Sem categoria';
      adicionar('Cartão de Crédito', `Débito cartão · ${categoria}`, compra.valor);
    });

    return [...fluxos.values()];
  }

  private ehContaCorrente(conta?: Conta): boolean {
    return conta?.tipo === 'CC';
  }

 /* private agruparCategorias(tipo: Lancamento['tipo']): Array<{ categoria: string; valor: number }> {
    const totais = new Map<string, number>();
    this.lancamentos
      .filter(l => l.tipo === tipo && !l.transferenciaId && l.valor > 0 && this.estaNoPeriodoSankey(l.data))
      .forEach(l => {
        const categoria = l.categoria || (tipo === 'CREDITO' ? 'Outros créditos' : 'Outros débitos');
        totais.set(categoria, (totais.get(categoria) ?? 0) + l.valor);
      });

    return [...totais.entries()]
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor);
  }*/

  atualizarPeriodoSankey(): void {
    if (!this.competenciaInicial || !this.competenciaFinal || this.competenciaInicial > this.competenciaFinal) return;
    const requestId = ++this.competenciaRequestId;
    this.carregarLancamentosSankey(requestId);
    this.carregarGastosPorTipo(requestId);
    this.carregarSaldosCompetencia(requestId);
  }

  private carregarGastosPorTipo(requestId: number): void {
    const periodo = this.obterPeriodoCompetencia();
    this.carregandoGastos = true;
    this.erroGastos = false;

    this.subs.add(this.lancamentoService.buscarPeriodoCompleto(periodo.dataInicio, periodo.dataFim)
      .subscribe({
        next: lancamentos => {
          if (requestId !== this.competenciaRequestId) return;

          const totais = new Map<string, number>();
          lancamentos
            .filter(lancamento => lancamento.tipo === 'DEBITO')
            .forEach(lancamento => {
              const tipo = lancamento.tipoMovimentacao || 'Sem tipo';
              totais.set(tipo, (totais.get(tipo) ?? 0) + Math.abs(lancamento.valor));
            });

          this.gastosPorTipo = [...totais.entries()]
            .map(([tipo, valor]) => ({ tipo, valor }))
            .sort((a, b) => b.valor - a.valor);
          this.totalGastos = this.gastosPorTipo.reduce((total, item) => total + item.valor, 0);
          this.carregandoGastos = false;
          this.erroGastos = false;
          this.atualizarGraficoGastos();
        },
        error: () => {
          if (requestId !== this.competenciaRequestId) return;
          this.gastosPorTipo = [];
          this.totalGastos = 0;
          this.carregandoGastos = false;
          this.erroGastos = true;
          this.atualizarGraficoGastos();
        }
      }));
  }

  private atualizarGraficoGastos(): void {
    if (!this.viewReady || !this.gastosChartRef) return;

    const cores = ['#fb7185', '#f59e0b', '#38bdf8', '#4ade80', '#a78bfa', '#f472b6', '#2dd4bf', '#facc15'];
    const labels = this.gastosPorTipo.map(item => item.tipo);
    const valores = this.gastosPorTipo.map(item => item.valor);

    if (!this.gastosChart) {
      this.gastosChart = new Chart(this.gastosChartRef.nativeElement, {
        type: 'pie',
        data: {
          labels,
          datasets: [{ data: valores, backgroundColor: labels.map((_, index) => cores[index % cores.length]), borderColor: '#151d2b', borderWidth: 2 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: 'rgba(241,245,249,0.7)', padding: 16, usePointStyle: true } },
            tooltip: {
              callbacks: {
                label: context => ` ${context.label}: ${Number(context.parsed).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
              }
            }
          }
        }
      });
      return;
    }

    this.gastosChart.data.labels = labels;
    this.gastosChart.data.datasets[0].data = valores;
    this.gastosChart.data.datasets[0].backgroundColor = labels.map((_, index) => cores[index % cores.length]);
    this.gastosChart.update();
  }

  private carregarLancamentosSankey(requestId: number): void {
    const periodo = this.obterPeriodoCompetencia();
    this.subs.add(this.lancamentoService.buscarPeriodoDashboard(periodo.dataInicio, periodo.dataFim)
      .subscribe({
        next: lancamentos => {
          if (requestId !== this.competenciaRequestId) return;
          this.lancamentosCompetencia = lancamentos;
          this.updateSankeyChart();
        },
        error: () => undefined
      }));
    this.subs.add(this.lancamentoCartaoService.buscarPeriodoDashboard(periodo.dataInicio, periodo.dataFim)
      .subscribe({
        next: lancamentos => {
          if (requestId !== this.competenciaRequestId) return;
          this.lancamentosCartao = lancamentos;
          this.updateSankeyChart();
        },
        error: () => undefined
      }));
    this.subs.add(this.dashboardService.getDashboardCart(this.competenciaInicial, this.competenciaFinal)
      .subscribe({
        next: dashboardCart => {
          if (requestId !== this.competenciaRequestId) return;
          this.dashboardCartLoaded = true;
          this.dashboardCart = dashboardCart;
          this.saldoTotal = dashboardCart.patrimonioTotal;
          this.saldoBancario = dashboardCart.saldoBancario;
          this.saldoInvestimentos = dashboardCart.investimentos;
          this.totalCreditos = dashboardCart.creditosMes;
          this.totalDebitos = dashboardCart.debitosMes;
        },
        error: () => undefined
      }));
  }

  private estaNoPeriodoSankey(data: string): boolean {
    const dataLancamento = data.slice(0, 10);
    const periodo = this.obterPeriodoCompetencia();
    return dataLancamento >= periodo.dataInicio && dataLancamento <= periodo.dataFim;
  }

  private carregarSaldosCompetencia(requestId: number): void {
    if (this.contasOriginais.length === 0) {
      this.contas = [];
      this.calcularResumos();
      return;
    }

    const dataCompetencia = `${this.competenciaFinal}-01`;
    const consultas = this.contasOriginais.map(conta => conta.id == null
      ? of({ saldoFinal: 0 })
      : this.lancamentoService.buscarSaldoCompetencia(conta.id, dataCompetencia));

    this.subs.add(forkJoin(consultas).subscribe({
      next: saldos => {
        if (requestId !== this.competenciaRequestId) return;
        this.contas = this.contasOriginais.map((conta, index) => ({
          ...conta,
          saldo: saldos[index].saldoFinal
            ?? (this.competenciaFinal === this.formatarCompetencia(new Date()) ? conta.saldo : 0)
        }));
        this.calcularResumos();
        this.updateSankeyChart();
      },
      error: () => undefined
    }));
  }

  private obterPeriodoCompetencia(): { dataInicio: string; dataFim: string } {
    const [anoFinal, mesFinal] = this.competenciaFinal.split('-').map(Number);
    return {
      dataInicio: `${this.competenciaInicial}-01`,
      dataFim: this.formatarData(new Date(anoFinal, mesFinal, 0)),
    };
  }

  private formatarCompetencia(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatarData(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }

  private criarFluxosCategorias(
    creditos: Array<{ categoria: string; valor: number }>,
    debitos: Array<{ categoria: string; valor: number }>
  ): Array<{ source: string; target: string; value: number }> {
    const fontes = creditos.map(item => ({ nome: `Crédito · ${item.categoria}`, restante: item.valor }));
    const destinos = debitos.map(item => ({ nome: `Débito · ${item.categoria}`, restante: item.valor }));
    const links: Array<{ source: string; target: string; value: number }> = [];
    let origem = 0;
    let destino = 0;

    while (origem < fontes.length && destino < destinos.length) {
      const valor = Math.min(fontes[origem].restante, destinos[destino].restante);
      if (valor > 0) links.push({ source: fontes[origem].nome, target: destinos[destino].nome, value: valor });
      fontes[origem].restante -= valor;
      destinos[destino].restante -= valor;
      if (fontes[origem].restante < 0.005) origem++;
      if (destinos[destino].restante < 0.005) destino++;
    }

    fontes.slice(origem).filter(item => item.restante > 0.005)
      .forEach(item => links.push({ source: item.nome, target: 'Débito · Saldo disponível', value: item.restante }));
    destinos.slice(destino).filter(item => item.restante > 0.005)
      .forEach(item => links.push({ source: 'Crédito · Saldo anterior', target: item.nome, value: item.restante }));

    return links;
  }

  initDonutChart(): void {
    if (!this.donutChartRef) return;
    const ctx = this.donutChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels: string[] = [];
    const data: number[] = [];
    const colors: string[] = [];

    Object.entries(TIPOS_CONTA).forEach(([tipo, info]) => {
      const soma = this.contas.filter(c => c.tipo === tipo as any).reduce((acc, c) => acc + c.saldo, 0);
      if (soma > 0) {
        labels.push(info.label);
        data.push(soma);
        colors.push(info.cor);
      }
    });

    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.map(c => c + '30'),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(241,245,249,0.7)',
              padding: 16,
              font: { size: 12, family: 'Inter' },
              usePointStyle: true,
              pointStyleWidth: 8,
            }
          },
          tooltip: {
            backgroundColor: '#141e33',
            titleColor: '#f1f5f9',
            bodyColor: 'rgba(241,245,249,0.7)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw as number;
                return ' ' + val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              }
            }
          }
        }
      }
    });
  }

  initBarChart(): void {
    if (!this.barChartRef) return;
    const ctx = this.barChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.bancos.map(b => b.nome),
        datasets: [
          {
            label: 'Bancário',
            data: this.bancos.map(b =>
              this.contas.filter(c => c.bancoId === b.id && (c.tipo === 'CC' || c.tipo === 'CP')).reduce((a, c) => a + c.saldo, 0)
            ),
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: '#6366f1',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Investimentos',
            data: this.bancos.map(b =>
              this.contas.filter(c => c.bancoId === b.id && c.tipo !== 'CC' && c.tipo !== 'CP').reduce((a, c) => a + c.saldo, 0)
            ),
            backgroundColor: 'rgba(245, 158, 11, 0.7)',
            borderColor: '#f59e0b',
            borderWidth: 1,
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'rgba(241,245,249,0.7)',
              font: { size: 12, family: 'Inter' },
              usePointStyle: true,
              pointStyleWidth: 8,
            }
          },
          tooltip: {
            backgroundColor: '#141e33',
            titleColor: '#f1f5f9',
            bodyColor: 'rgba(241,245,249,0.7)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ' ' + (ctx.raw as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            }
          }
        },
        scales: {
          x: {
            ticks: { color: 'rgba(241,245,249,0.5)', font: { family: 'Inter' } },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            ticks: {
              color: 'rgba(241,245,249,0.5)',
              font: { family: 'Inter' },
              callback: (v) => 'R$ ' + Number(v).toLocaleString('pt-BR')
            },
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  }

  updateCharts(): void {
    if (this.donutChart) {
      this.donutChart.destroy();
      this.initDonutChart();
    }
    if (this.barChart) {
      this.barChart.destroy();
      this.initBarChart();
    }
  }

  getContaNome(contaId: number): string {
    const conta = this.contas.find(c => c.id === contaId);
    return conta ? conta.descricao : contaId + "-";
  }

  getBancoNome(contaId?: number): string {
    const conta = this.contas.find(c => c.id === contaId);
    if (!conta) return '';
    const banco = this.bancos.find(b => b.id === conta.bancoId);
    return banco ? banco.nome : '';
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.patrimonioRequestId++;
    this.fluxoMensalRequestId++;
    this.donutChart?.destroy();
    this.barChart?.destroy();
    this.gastosChart?.destroy();
    this.patrimonioChart?.destroy();
    this.fluxoMensalChart?.destroy();
    this.sankeyChart?.dispose();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.sankeyChart?.resize();
  }
}
