import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  AtualizacaoLancamentoCartaoCredito,
  Competencia,
  LancamentoCartaoCredito,
  NovoLancamentoCartaoCredito,
} from '../modelos/cartao-credito';
import { BancoContaDisponivel } from '../modelos/banco-conta-disponivel';
import { TipoMovimentacaoAtiva } from '../modelos/tipo-movimentacao-ativa';
import { ServicoBancosContas } from '../servicos/bancos-contas';
import { ServicoCartoesCredito } from '../servicos/cartoes-credito';
import { ServicoTiposMovimentacao } from '../servicos/tipos-movimentacao';

interface LinhaLancamentoCartao extends LancamentoCartaoCredito {
  competencia: Competencia;
  descricao: string;
  tipoMovimentacao: string;
  conta: string;
  possuiParcelasVinculadas: boolean;
}

@Component({
  selector: 'app-cartoes-credito',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './cartoes-credito.html',
  styleUrls: ['./cartoes-credito.css', '../movimentacao/movimentacao.css', '../movimentacao/movimentacao-modal.css', '../movimentacao/movimentacao-acoes.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponenteCartoesCredito implements OnInit, OnDestroy {
  private readonly servicoCartoesCredito = inject(ServicoCartoesCredito);
  private readonly servicoBancosContas = inject(ServicoBancosContas);
  private readonly servicoTiposMovimentacao = inject(ServicoTiposMovimentacao);
  private requisicaoLancamentos?: Subscription;
  private requisicaoCompetencias?: Subscription;
  private requisicaoBancosContas?: Subscription;
  private requisicaoTiposMovimentacao?: Subscription;
  private requisicaoLancamento?: Subscription;
  private requisicaoAtualizacao?: Subscription;
  private requisicaoExclusao?: Subscription;
  private readonly modalNovoLancamento = viewChild.required<ElementRef<HTMLDialogElement>>('modalNovoLancamento');
  private readonly modalConfirmacaoExclusao = viewChild.required<ElementRef<HTMLDialogElement>>('modalConfirmacaoExclusao');

  protected readonly mesSelecionado = signal(new Date().getMonth() + 1);
  protected readonly anoSelecionado = signal(new Date().getFullYear());
  protected readonly bancoContaSelecionadaId = signal<number | null>(null);
  protected readonly lancamentos = signal<LancamentoCartaoCredito[]>([]);
  protected readonly competencias = signal<Competencia[]>([]);
  protected readonly bancosContasDisponiveis = signal<BancoContaDisponivel[]>([]);
  protected readonly tiposMovimentacao = signal<TipoMovimentacaoAtiva[]>([]);
  protected readonly carregandoLancamentos = signal(false);
  protected readonly carregandoCompetencias = signal(false);
  protected readonly carregandoBancosContas = signal(false);
  protected readonly carregandoTiposMovimentacao = signal(false);
  protected readonly salvandoLancamento = signal(false);
  protected readonly excluindoLancamento = signal(false);
  protected readonly lancamentoEditando = signal<LancamentoCartaoCredito | null>(null);
  protected readonly lancamentoExcluindo = signal<LinhaLancamentoCartao | null>(null);
  protected readonly erroLancamentos = signal<string | null>(null);
  protected readonly erroCompetencias = signal<string | null>(null);
  protected readonly erroBancosContas = signal<string | null>(null);
  protected readonly erroTiposMovimentacao = signal<string | null>(null);
  protected readonly erroSalvamento = signal<string | null>(null);
  protected readonly erroExclusao = signal<string | null>(null);
  protected readonly tipoMovimentacaoSelecionadoId = signal<number | null>(null);
  protected readonly tiposDebito = computed(() =>
    this.tiposMovimentacao().filter((tipo) => tipo.icTipoMovimentacao === 'DEBITO'));
  protected readonly bancoContaSelecionada = computed(() =>
    this.bancosContasDisponiveis().find((conta) => conta.bancoContaId === this.bancoContaSelecionadaId()) ?? null);
  protected readonly competenciaSelecionada = computed(() => this.competencias().find((competencia) =>
    competencia.nrAno === this.anoSelecionado() && competencia.nrMes === this.mesSelecionado()) ?? null);
  protected readonly competenciasPorId = computed(() =>
    new Map(this.competencias().map((competencia) => [competencia.id, competencia])));
  protected readonly saldoAnterior = computed(() => {
    const ordinal = this.competenciaSelecionadaOrdinal();
    return ordinal === null ? 0 : this.totalPorPeriodo(ordinal - 1);
  });
  protected readonly saldoAtual = computed(() => this.totalPorPeriodo(this.competenciaSelecionadaOrdinal()));
  protected readonly saldoMesPosterior = computed(() => {
    const ordinal = this.competenciaSelecionadaOrdinal();
    return ordinal === null ? 0 : this.totalPorPeriodo(ordinal + 1);
  });
  protected readonly saldosFuturos = computed(() => {
    const ordinalAtual = this.competenciaSelecionadaOrdinal();
    if (ordinalAtual === null) {
      return 0;
    }

    const idsCompetenciasFuturas = new Set(this.competencias()
      .filter((competencia) => this.ordinal(competencia) >= ordinalAtual + 2)
      .map((competencia) => competencia.id));
    return this.lancamentosDaConta().reduce((total, lancamento) =>
      idsCompetenciasFuturas.has(lancamento.competenciaId) && lancamento.icSituacao === 'SIM'
        ? total + lancamento.vlCompra
        : total, 0);
  });
  protected readonly linhasLancamentos = computed(() => {
    const competenciaAtual = this.competenciaSelecionada();
    if (!competenciaAtual) {
      return [];
    }

    const competenciaId = competenciaAtual.id;
    const tipos = new Map(this.tiposMovimentacao().map((tipo) => [tipo.id, tipo.dsTipoMovimentacao]));
    const contas = new Map(this.bancosContasDisponiveis().map((conta) =>
      [conta.bancoContaId, `${conta.nomeBanco} — ${conta.nomeConta}`]));
    const lancamentosDaConta = this.lancamentosDaConta();
    return lancamentosDaConta
      .filter((lancamento) => lancamento.competenciaId === competenciaId)
      .map((lancamento): LinhaLancamentoCartao => ({
        ...lancamento,
        competencia: competenciaAtual,
        descricao: lancamento.dsObservacao || 'Compra no cartão',
        tipoMovimentacao: tipos.get(lancamento.tipoMovimentacaoId) ?? 'Despesa',
        conta: contas.get(lancamento.bancoContaId) ?? `Conta #${lancamento.bancoContaId}`,
        possuiParcelasVinculadas: this.lancamentos().some((parcela) => parcela.vinculoId === lancamento.id),
      }))
      .sort((a, b) => (b.dtMovimentacao ?? '').localeCompare(a.dtMovimentacao ?? '') || b.id - a.id);
  });
  protected readonly meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  protected dataMovimentacao = this.obterDataAtual();
  protected valorCompra: number | null = null;
  protected observacao = '';
  protected numeroParcelas = 1;

  ngOnInit(): void {
    this.carregarLancamentos();
    this.carregarCompetencias();
    this.carregarBancosContas();
    this.carregarTiposMovimentacao();
  }

  ngOnDestroy(): void {
    this.requisicaoLancamentos?.unsubscribe();
    this.requisicaoCompetencias?.unsubscribe();
    this.requisicaoBancosContas?.unsubscribe();
    this.requisicaoTiposMovimentacao?.unsubscribe();
    this.requisicaoLancamento?.unsubscribe();
    this.requisicaoAtualizacao?.unsubscribe();
    this.requisicaoExclusao?.unsubscribe();
  }

  protected alterarMes(mes: number): void {
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return;
    }
    this.mesSelecionado.set(mes);
    this.carregarBancosContas();
  }

  protected alterarAno(ano: number): void {
    if (!Number.isInteger(ano) || ano < 1900 || ano > 9999) {
      return;
    }
    this.anoSelecionado.set(ano);
    this.carregarBancosContas();
  }

  protected abrirModalNovoLancamento(): void {
    this.lancamentoEditando.set(null);
    this.erroSalvamento.set(null);
    this.valorCompra = null;
    this.observacao = '';
    this.numeroParcelas = 1;
    this.dataMovimentacao = this.obterDataInicialCompra();
    this.modalNovoLancamento().nativeElement.showModal();
  }

  protected abrirEdicaoLancamento(lancamento: LancamentoCartaoCredito): void {
    this.lancamentoEditando.set(lancamento);
    this.erroSalvamento.set(null);
    this.tipoMovimentacaoSelecionadoId.set(lancamento.tipoMovimentacaoId);
    this.dataMovimentacao = this.converterDataParaInput(lancamento.dtMovimentacao);
    this.valorCompra = lancamento.vlCompra;
    this.observacao = this.observacaoDaParcela(lancamento);
    this.numeroParcelas = lancamento.nrParcelas;
    this.modalNovoLancamento().nativeElement.showModal();
  }

  protected fecharModalNovoLancamento(): void {
    if (!this.salvandoLancamento()) {
      this.modalNovoLancamento().nativeElement.close();
      this.lancamentoEditando.set(null);
    }
  }

  protected fecharModalAoClicarFora(evento: MouseEvent): void {
    if (evento.target === this.modalNovoLancamento().nativeElement) {
      this.fecharModalNovoLancamento();
    }
  }

  protected abrirConfirmacaoExclusao(lancamento: LinhaLancamentoCartao): void {
    if (lancamento.possuiParcelasVinculadas) {
      return;
    }
    this.lancamentoExcluindo.set(lancamento);
    this.erroExclusao.set(null);
    this.modalConfirmacaoExclusao().nativeElement.showModal();
  }

  protected fecharConfirmacaoExclusao(): void {
    if (this.excluindoLancamento()) {
      return;
    }
    this.modalConfirmacaoExclusao().nativeElement.close();
    this.lancamentoExcluindo.set(null);
    this.erroExclusao.set(null);
  }

  protected confirmarExclusaoLancamento(): void {
    const lancamento = this.lancamentoExcluindo();
    if (!lancamento || this.excluindoLancamento()) {
      return;
    }
    this.erroExclusao.set(null);
    this.excluindoLancamento.set(true);
    this.requisicaoExclusao?.unsubscribe();
    this.requisicaoExclusao = this.servicoCartoesCredito.excluir(lancamento.id).subscribe({
      next: () => {
        this.excluindoLancamento.set(false);
        this.modalConfirmacaoExclusao().nativeElement.close();
        this.lancamentoExcluindo.set(null);
        this.carregarLancamentos();
      },
      error: (erro: unknown) => {
        console.error('Erro ao excluir lançamento do cartão:', erro);
        this.erroExclusao.set(erro instanceof Error ? erro.message : 'Erro ao excluir o lançamento do cartão.');
        this.excluindoLancamento.set(false);
      },
    });
  }

  protected salvarLancamento(): void {
    const competencia = this.competenciaSelecionada();
    const bancoContaId = this.bancoContaSelecionadaId();
    const tipo = this.tiposDebito().find((item) => item.id === this.tipoMovimentacaoSelecionadoId());
    const lancamentoEditando = this.lancamentoEditando();
    const dataMovimentacao = this.dataMovimentacao;
    const valorCompra = this.valorCompra;
    if (this.salvandoLancamento()
      || !dataMovimentacao || valorCompra === null
      || !Number.isFinite(valorCompra) || valorCompra <= 0
      || (lancamentoEditando === null && (
        !competencia || bancoContaId === null || !tipo
        || !Number.isInteger(this.numeroParcelas) || this.numeroParcelas < 1
      ))) {
      return;
    }

    if (lancamentoEditando) {
      this.atualizarLancamento(lancamentoEditando, dataMovimentacao, valorCompra);
      return;
    }

    if (!competencia || bancoContaId === null || !tipo) {
      return;
    }

    const lancamento: NovoLancamentoCartaoCredito = {
      dtMovimentacao: dataMovimentacao,
      vlDebito: valorCompra,
      dsObservacao: this.observacao.trim(),
      icSituacao: 'SIM',
      bancoContaId,
      competenciaId: competencia.id,
      tipoMovimentacaoId: tipo.id,
      nrParcelas: this.numeroParcelas,
    };

    this.erroSalvamento.set(null);
    this.salvandoLancamento.set(true);
    this.requisicaoLancamento?.unsubscribe();
    this.requisicaoLancamento = this.servicoCartoesCredito.lancar(lancamento).subscribe({
      next: () => {
        this.salvandoLancamento.set(false);
        this.modalNovoLancamento().nativeElement.close();
        this.carregarLancamentos();
      },
      error: (erro: unknown) => {
        console.error('Erro ao registrar lançamento no cartão de crédito:', erro);
        this.erroSalvamento.set(erro instanceof Error ? erro.message : 'Erro ao registrar o lançamento no cartão.');
        this.salvandoLancamento.set(false);
      },
    });
  }

  protected recarregarLancamentos(): void {
    this.carregarLancamentos();
  }

  protected recarregarCompetencias(): void {
    this.carregarCompetencias();
  }

  protected recarregarBancosContas(): void {
    this.carregarBancosContas();
  }

  protected recarregarTiposMovimentacao(): void {
    this.carregarTiposMovimentacao();
  }

  private carregarLancamentos(): void {
    this.requisicaoLancamentos?.unsubscribe();
    this.carregandoLancamentos.set(true);
    this.erroLancamentos.set(null);
    this.requisicaoLancamentos = this.servicoCartoesCredito.listarLancamentos().subscribe({
      next: (lancamentos) => {
        this.lancamentos.set(lancamentos);
        this.carregandoLancamentos.set(false);
      },
      error: (erro: unknown) => {
        console.error('Erro ao carregar lançamentos de cartão:', erro);
        this.erroLancamentos.set(erro instanceof Error ? erro.message : 'Erro ao carregar lançamentos de cartão.');
        this.carregandoLancamentos.set(false);
      },
    });
  }

  private atualizarLancamento(original: LancamentoCartaoCredito, data: string, valor: number): void {
    const observacao = this.observacao.trim();
    const sufixoParcela = /\s\[\d+\s\/\s\d+\]$/.exec(original.dsObservacao ?? '')?.[0] ?? '';
    const dados: AtualizacaoLancamentoCartaoCredito = {
      ...original,
      nrDia: data.slice(8, 10),
      dtMovimentacao: `${data}T00:00:00.000Z`,
      vlCompra: valor,
      dsObservacao: observacao ? `${observacao}${sufixoParcela}` : sufixoParcela || null,
    };
    this.erroSalvamento.set(null);
    this.salvandoLancamento.set(true);
    this.requisicaoAtualizacao?.unsubscribe();
    this.requisicaoAtualizacao = this.servicoCartoesCredito.atualizar(original.id, dados).subscribe({
      next: () => {
        this.salvandoLancamento.set(false);
        this.modalNovoLancamento().nativeElement.close();
        this.lancamentoEditando.set(null);
        this.carregarLancamentos();
      },
      error: (erro: unknown) => {
        console.error('Erro ao atualizar lançamento do cartão:', erro);
        this.erroSalvamento.set(erro instanceof Error ? erro.message : 'Erro ao atualizar o lançamento do cartão.');
        this.salvandoLancamento.set(false);
      },
    });
  }

  private carregarCompetencias(): void {
    this.requisicaoCompetencias?.unsubscribe();
    this.carregandoCompetencias.set(true);
    this.erroCompetencias.set(null);
    this.requisicaoCompetencias = this.servicoCartoesCredito.listarCompetencias().subscribe({
      next: (competencias) => {
        this.competencias.set(competencias);
        this.carregandoCompetencias.set(false);
      },
      error: (erro: unknown) => {
        console.error('Erro ao carregar competências:', erro);
        this.erroCompetencias.set(erro instanceof Error ? erro.message : 'Erro ao carregar competências.');
        this.carregandoCompetencias.set(false);
      },
    });
  }

  private carregarBancosContas(): void {
    this.requisicaoBancosContas?.unsubscribe();
    this.carregandoBancosContas.set(true);
    this.erroBancosContas.set(null);
    this.bancosContasDisponiveis.set([]);
    this.requisicaoBancosContas = this.servicoBancosContas
      .listarDisponiveis(this.mesSelecionado(), this.anoSelecionado())
      .subscribe({
        next: (bancosContas) => {
          this.bancosContasDisponiveis.set(bancosContas);
          const contaAtualDisponivel = bancosContas.some((conta) =>
            conta.bancoContaId === this.bancoContaSelecionadaId());
          this.bancoContaSelecionadaId.set(contaAtualDisponivel
            ? this.bancoContaSelecionadaId()
            : bancosContas[0]?.bancoContaId ?? null);
          this.carregandoBancosContas.set(false);
        },
        error: (erro: unknown) => {
          console.error('Erro ao carregar bancos e contas para cartão:', erro);
          this.erroBancosContas.set(erro instanceof Error ? erro.message : 'Erro ao carregar bancos e contas.');
          this.carregandoBancosContas.set(false);
        },
      });
  }

  private carregarTiposMovimentacao(): void {
    this.requisicaoTiposMovimentacao?.unsubscribe();
    this.carregandoTiposMovimentacao.set(true);
    this.erroTiposMovimentacao.set(null);
    this.requisicaoTiposMovimentacao = this.servicoTiposMovimentacao.listarAtivos().subscribe({
      next: (tipos) => {
        this.tiposMovimentacao.set(tipos);
        const tiposDebito = tipos.filter((tipo) => tipo.icTipoMovimentacao === 'DEBITO');
        if (!tiposDebito.some((tipo) => tipo.id === this.tipoMovimentacaoSelecionadoId())) {
          this.tipoMovimentacaoSelecionadoId.set(tiposDebito[0]?.id ?? null);
        }
        this.carregandoTiposMovimentacao.set(false);
      },
      error: (erro: unknown) => {
        console.error('Erro ao carregar tipos de movimentação:', erro);
        this.erroTiposMovimentacao.set(erro instanceof Error ? erro.message : 'Erro ao carregar tipos de movimentação.');
        this.carregandoTiposMovimentacao.set(false);
      },
    });
  }

  private lancamentosDaConta(): LancamentoCartaoCredito[] {
    const bancoContaId = this.bancoContaSelecionadaId();
    return this.lancamentos().filter((lancamento) =>
      (bancoContaId === null || lancamento.bancoContaId === bancoContaId)
      && lancamento.icSituacao === 'SIM');
  }

  private totalPorPeriodo(ordinal: number | null): number {
    if (ordinal === null) {
      return 0;
    }
    const competencia = this.competencias().find((item) => this.ordinal(item) === ordinal);
    if (!competencia) {
      return 0;
    }
    return this.lancamentosDaConta().reduce((total, lancamento) =>
      lancamento.competenciaId === competencia.id ? total + lancamento.vlCompra : total, 0);
  }

  private competenciaSelecionadaOrdinal(): number | null {
    const competencia = this.competenciaSelecionada();
    return competencia ? this.ordinal(competencia) : null;
  }

  private ordinal(competencia: Competencia): number {
    return competencia.nrAno * 12 + competencia.nrMes - 1;
  }

  private obterDataInicialCompra(): string {
    const hoje = this.obterDataAtual();
    return hoje.slice(0, 7) === `${this.anoSelecionado()}-${String(this.mesSelecionado()).padStart(2, '0')}`
      ? hoje
      : `${this.anoSelecionado()}-${String(this.mesSelecionado()).padStart(2, '0')}-01`;
  }

  private obterDataAtual(): string {
    const agora = new Date();
    return new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }

  private converterDataParaInput(data: string | null): string {
    if (!data) {
      return '';
    }
    const dataIso = /^(\d{4}-\d{2}-\d{2})/.exec(data);
    if (dataIso) {
      return dataIso[1];
    }
    const dataConvertida = new Date(data);
    return Number.isNaN(dataConvertida.getTime()) ? '' : dataConvertida.toISOString().slice(0, 10);
  }

  private observacaoDaParcela(lancamento: LancamentoCartaoCredito): string {
    const observacao = lancamento.dsObservacao ?? '';
    const sufixoParcela = /\s\[\d+\s\/\s\d+\]$/.exec(observacao);
    return sufixoParcela ? observacao.slice(0, sufixoParcela.index) : observacao;
  }
}
