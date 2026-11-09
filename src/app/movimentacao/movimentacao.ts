import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { BancoContaDisponivel } from '../modelos/banco-conta-disponivel';
import { LancamentoMovimentacao } from '../modelos/lancamento-movimentacao';
import { InvestimentoAtivo } from '../modelos/investimento-ativo';
import { TipoMovimentacaoAtiva } from '../modelos/tipo-movimentacao-ativa';
import { MovimentacaoConsulta } from '../modelos/movimentacao';
import { ResumoMovimentacaoFinal } from '../modelos/resumo-movimentacao-final';
import { ServicoBancosContas } from '../servicos/bancos-contas';
import { ServicoMovimentacoesFinais } from '../servicos/movimentacoes-finais';
import { ServicoMovimentacoes } from '../servicos/movimentacoes';
import { ServicoLancamentosMovimentacao } from '../servicos/lancamentos-movimentacao';
import { ServicoTiposMovimentacao } from '../servicos/tipos-movimentacao';
import { ServicoTransferencias } from '../servicos/transferencias';
import { ServicoInvestimentos } from '../servicos/investimentos';

@Component({
  selector: 'app-movimentacao',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  templateUrl: './movimentacao.html',
  styleUrls: ['./movimentacao.css', './movimentacao-modal.css', './movimentacao-modal-tipo.css', './movimentacao-acoes.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponentePainel implements OnInit, OnDestroy {
  private readonly servicoMovimentacoes = inject(ServicoMovimentacoes);
  private readonly servicoBancosContas = inject(ServicoBancosContas);
  private readonly servicoMovimentacoesFinais = inject(ServicoMovimentacoesFinais);
  private readonly servicoLancamentosMovimentacao = inject(ServicoLancamentosMovimentacao);
  private readonly servicoTiposMovimentacao = inject(ServicoTiposMovimentacao);
  private readonly servicoTransferencias = inject(ServicoTransferencias);
  private readonly servicoInvestimentos = inject(ServicoInvestimentos);
  private requisicaoBancosContas?: Subscription;
  private requisicaoMovimentacoes?: Subscription;
  private requisicaoResumo?: Subscription;
  private requisicaoTiposMovimentacao?: Subscription;
  private requisicaoLancamento?: Subscription;
  private requisicaoAtualizacao?: Subscription;
  private requisicaoExclusao?: Subscription;
  private requisicaoDestinosTransferencia?: Subscription;
  private requisicaoInvestimentos?: Subscription;
  private periodoCarregado?: string;
  private readonly modalNovoLancamento = viewChild.required<ElementRef<HTMLDialogElement>>('modalNovoLancamento');
  private readonly modalConfirmacaoExclusao = viewChild.required<ElementRef<HTMLDialogElement>>('modalConfirmacaoExclusao');

  protected readonly movimentacoesConsulta = signal<MovimentacaoConsulta[]>([]);
  protected readonly movimentacaoEditando = signal<MovimentacaoConsulta | null>(null);
  protected readonly movimentacaoExcluindo = signal<MovimentacaoConsulta | null>(null);
  protected readonly carregandoMovimentacoes = signal(false);
  protected readonly erroMovimentacoes = signal<string | null>(null);
  protected readonly mesSelecionado = signal(new Date().getMonth() + 1);
  protected readonly anoSelecionado = signal(new Date().getFullYear());
  protected readonly bancoSelecionado = signal<number | null>(null);
  protected readonly contaSelecionada = signal<number | null>(null);
  protected readonly bancosContasDisponiveis = signal<BancoContaDisponivel[]>([]);
  protected readonly carregandoBancosContas = signal(false);
  protected readonly erroBancosContas = signal<string | null>(null);
  protected readonly resumo = signal<ResumoMovimentacaoFinal | null>(null);
  protected readonly carregandoResumo = signal(false);
  protected readonly erroResumo = signal<string | null>(null);
  protected readonly tiposMovimentacao = signal<TipoMovimentacaoAtiva[]>([]);
  protected readonly carregandoTiposMovimentacao = signal(false);
  protected readonly erroTiposMovimentacao = signal<string | null>(null);
  protected readonly salvandoNovoLancamento = signal(false);
  protected readonly erroSalvamentoNovoLancamento = signal<string | null>(null);
  protected readonly excluindoMovimentacao = signal(false);
  protected readonly erroExclusaoMovimentacao = signal<string | null>(null);
  protected readonly destinosTransferencia = signal<BancoContaDisponivel[]>([]);
  protected readonly carregandoDestinosTransferencia = signal(false);
  protected readonly erroDestinosTransferencia = signal<string | null>(null);
  protected readonly transferirParaSelecionadoId = signal<number | null>(null);
  protected readonly investimentos = signal<InvestimentoAtivo[]>([]);
  protected readonly carregandoInvestimentos = signal(false);
  protected readonly erroInvestimentos = signal<string | null>(null);
  protected readonly investimentoSelecionadoId = signal<number | null>(null);
  protected readonly tipoMovimentacaoSelecionadoId = signal<number | null>(null);
  protected readonly filtroTipoMovimentacao = signal<'TODOS' | 'CREDITO' | 'DEBITO' | 'TRANSFERENCIA'>('TODOS');
  protected readonly tiposMovimentacaoFiltrados = computed(() => {
    const filtro = this.filtroTipoMovimentacao();
    return this.tiposMovimentacao().filter((tipo) => {
      if (filtro === 'TODOS') {
        return true;
      }
      if (filtro === 'TRANSFERENCIA') {
        return tipo.icTipoMovimentacao === 'RESGATE'
          || tipo.icTipoMovimentacao === 'APLICACAO'
          || tipo.icTipoMovimentacao === 'TRANSFERENCIA';
      }
      return tipo.icTipoMovimentacao === filtro;
    });
  });
  protected readonly tipoMovimentacaoSelecionado = computed(() => this.tiposMovimentacao()
    .find((tipo) => tipo.id === this.tipoMovimentacaoSelecionadoId()) ?? null);
  protected readonly tiposBasicosMovimentacao = computed(() => this.tiposMovimentacao()
    .filter((tipo) => tipo.icTipoMovimentacao === 'CREDITO' || tipo.icTipoMovimentacao === 'DEBITO'));
  protected readonly dataInicioPeriodo = computed(() =>
    `${this.anoSelecionado()}-${String(this.mesSelecionado()).padStart(2, '0')}-01`);
  protected readonly dataFimPeriodo = computed(() => {
    const ultimoDia = new Date(this.anoSelecionado(), this.mesSelecionado(), 0).getDate();
    return `${this.anoSelecionado()}-${String(this.mesSelecionado()).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  });
  protected readonly exigeDestinoTransferencia = computed(() => {
    const indicador = this.tipoMovimentacaoSelecionado()?.icTipoMovimentacao;
    return indicador === 'APLICACAO' || indicador === 'RESGATE' || indicador === 'TRANSFERENCIA';
  });
  protected readonly exigeInvestimento = computed(() => {
    const indicador = this.tipoMovimentacaoSelecionado()?.icTipoMovimentacao;
    return indicador === 'APLICACAO' || indicador === 'RESGATE';
  });
  protected dataNovoLancamento = '';
  protected valorNovoLancamento: number | null = null;
  protected observacaoNovoLancamento = '';
  protected readonly bancoContaSelecionada = computed(() => this.bancosContasDisponiveis().find((item) =>
    item.bancoId === this.bancoSelecionado() && item.contaId === this.contaSelecionada()) ?? null);
  protected readonly meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  protected readonly bancos = computed(() => {
    const unicos = new Map<number, string>();
    for (const bancoConta of this.bancosContasDisponiveis()) {
      unicos.set(bancoConta.bancoId, bancoConta.nomeBanco);
    }
    return [...unicos].map(([id, nome]) => ({ id, nome }));
  });
  protected readonly contas = computed(() => {
    const bancosContas = this.bancoSelecionado() === null
      ? this.bancosContasDisponiveis()
      : this.bancosContasDisponiveis().filter((bancoConta) => bancoConta.bancoId === this.bancoSelecionado());
    const unicas = new Map<number, string>();
    for (const bancoConta of bancosContas) {
      unicas.set(bancoConta.contaId, bancoConta.nomeConta);
    }
    return [...unicas].map(([id, nome]) => ({ id, nome }));
  });
  protected readonly movimentacoesFiltradas = computed(() => {
    const bancosContas = new Map(this.bancosContasDisponiveis()
      .map((bancoConta) => [bancoConta.bancoContaId, bancoConta]));
    const tipos = new Map(this.tiposMovimentacao().map((tipo) => [tipo.id, tipo]));

    return this.movimentacoesConsulta().map((movimentacao) => {
      const bancoConta = bancosContas.get(movimentacao.bancoContaId);
      const tipoMovimentacao = tipos.get(movimentacao.tipoMovimentacaoId);
      const entrada = tipoMovimentacao
        ? tipoMovimentacao.icTipoMovimentacao === 'CREDITO' || tipoMovimentacao.icTipoMovimentacao === 'RESGATE'
        : (movimentacao.vlDebito ?? 0) < (movimentacao.vlCredito ?? 0);

      return {
        identificador: movimentacao.id,
        data: movimentacao.dtMovimentacao,
        tipo: entrada ? 'entrada' as const : 'saida' as const,
        tipoMovimentacao: tipoMovimentacao?.dsTipoMovimentacao,
        categoria: tipoMovimentacao?.dsCategoria ?? 'Outros',
        banco: bancoConta?.nomeBanco ?? '—',
        conta: bancoConta?.nomeConta ?? '—',
        valor: Math.max(movimentacao.vlCredito ?? 0, movimentacao.vlDebito ?? 0),
        saldo: movimentacao.vlSaldo,
        vinculada: movimentacao.vinculadoId !== null,
      };
    });
  });

  ngOnInit(): void {
    this.carregarBancosContas();
    this.carregarTiposMovimentacao();
  }

  ngOnDestroy(): void {
    this.requisicaoBancosContas?.unsubscribe();
    this.requisicaoMovimentacoes?.unsubscribe();
    this.requisicaoResumo?.unsubscribe();
    this.requisicaoTiposMovimentacao?.unsubscribe();
    this.requisicaoLancamento?.unsubscribe();
    this.requisicaoAtualizacao?.unsubscribe();
    this.requisicaoExclusao?.unsubscribe();
    this.requisicaoDestinosTransferencia?.unsubscribe();
    this.requisicaoInvestimentos?.unsubscribe();
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

  protected alterarBanco(bancoId: number | null): void {
    this.bancoSelecionado.set(bancoId);
    this.contaSelecionada.set(this.contas()[0]?.id ?? null);
    this.consultarResumo();
    this.consultarMovimentacoes();
  }

  protected alterarConta(contaId: number | null): void {
    this.contaSelecionada.set(contaId);
    this.consultarResumo();
    this.consultarMovimentacoes();
  }

  protected recarregarBancosContas(): void {
    this.periodoCarregado = undefined;
    this.carregarBancosContas();
  }

  protected recarregarMovimentacoes(): void {
    this.consultarMovimentacoes();
  }

  protected abrirModalNovoLancamento(): void {
    if (!this.bancoContaSelecionada() || this.carregandoBancosContas()) {
      return;
    }

    this.movimentacaoEditando.set(null);
    this.dataNovoLancamento = this.obterDataInicialMovimentacao();
    this.valorNovoLancamento = null;
    this.observacaoNovoLancamento = '';
    this.erroSalvamentoNovoLancamento.set(null);
    this.destinosTransferencia.set([]);
    this.erroDestinosTransferencia.set(null);
    this.transferirParaSelecionadoId.set(null);
    this.investimentos.set([]);
    this.erroInvestimentos.set(null);
    this.investimentoSelecionadoId.set(null);
    this.filtroTipoMovimentacao.set('TODOS');
    this.tipoMovimentacaoSelecionadoId.set(null);
    this.modalNovoLancamento().nativeElement.showModal();
  }

  protected abrirEdicaoMovimentacao(id: number): void {
    const movimentacao = this.movimentacoesConsulta().find((item) => item.id === id);
    if (!movimentacao || movimentacao.vinculadoId !== null) {
      return;
    }

    this.movimentacaoEditando.set(movimentacao);
    this.dataNovoLancamento = this.converterDataParaInput(movimentacao.dtMovimentacao);
    this.valorNovoLancamento = Math.max(movimentacao.vlCredito ?? 0, movimentacao.vlDebito ?? 0);
    this.observacaoNovoLancamento = movimentacao.dsObservacao ?? '';
    this.tipoMovimentacaoSelecionadoId.set(movimentacao.tipoMovimentacaoId);
    this.erroSalvamentoNovoLancamento.set(null);
    this.modalNovoLancamento().nativeElement.showModal();
  }

  protected abrirConfirmacaoExclusao(id: number): void {
    const movimentacao = this.movimentacoesConsulta().find((item) => item.id === id);
    if (!movimentacao || movimentacao.vinculadoId !== null) {
      return;
    }

    this.movimentacaoExcluindo.set(movimentacao);
    this.erroExclusaoMovimentacao.set(null);
    this.modalConfirmacaoExclusao().nativeElement.showModal();
  }

  protected fecharConfirmacaoExclusao(): void {
    if (this.excluindoMovimentacao()) {
      return;
    }
    this.modalConfirmacaoExclusao().nativeElement.close();
    this.movimentacaoExcluindo.set(null);
    this.erroExclusaoMovimentacao.set(null);
  }

  protected confirmarExclusaoMovimentacao(): void {
    const movimentacao = this.movimentacaoExcluindo();
    if (!movimentacao || this.excluindoMovimentacao()) {
      return;
    }

    this.erroExclusaoMovimentacao.set(null);
    this.excluindoMovimentacao.set(true);
    this.requisicaoExclusao?.unsubscribe();
    this.requisicaoExclusao = this.servicoMovimentacoes.excluir(movimentacao.id).subscribe({
      next: () => {
        this.excluindoMovimentacao.set(false);
        this.modalConfirmacaoExclusao().nativeElement.close();
        this.movimentacaoExcluindo.set(null);
        this.consultarMovimentacoes();
        this.consultarResumo();
      },
      error: (erro: unknown) => {
        console.error('Erro ao excluir movimentação:', erro);
        this.erroExclusaoMovimentacao.set(erro instanceof Error ? erro.message : 'Erro ao excluir movimentação.');
        this.excluindoMovimentacao.set(false);
      },
    });
  }

  protected filtrarTiposMovimentacao(filtro: 'TODOS' | 'CREDITO' | 'DEBITO' | 'TRANSFERENCIA'): void {
    this.filtroTipoMovimentacao.set(filtro);
    if (!this.tiposMovimentacaoFiltrados().some((tipo) => tipo.id === this.tipoMovimentacaoSelecionadoId())) {
      this.tipoMovimentacaoSelecionadoId.set(null);
    }
  }

  protected alterarTipoMovimentacao(tipoId: number | null): void {
    this.tipoMovimentacaoSelecionadoId.set(tipoId);
    this.transferirParaSelecionadoId.set(null);
    this.destinosTransferencia.set([]);
    this.erroDestinosTransferencia.set(null);
    this.requisicaoDestinosTransferencia?.unsubscribe();
    this.requisicaoInvestimentos?.unsubscribe();
    this.investimentos.set([]);
    this.carregandoInvestimentos.set(false);
    this.erroInvestimentos.set(null);
    this.investimentoSelecionadoId.set(null);

    const bancoContaId = this.bancoContaSelecionada()?.bancoContaId;
    if (!this.exigeDestinoTransferencia() || bancoContaId === undefined) {
      this.carregandoDestinosTransferencia.set(false);
      return;
    }

    this.carregandoDestinosTransferencia.set(true);
    this.requisicaoDestinosTransferencia = this.servicoTransferencias
      .listarDestinosDisponiveis(bancoContaId)
      .subscribe({
        next: (destinos) => {
          this.destinosTransferencia.set(destinos);
          this.carregandoDestinosTransferencia.set(false);
          const destinoSelecionadoId = this.transferirParaSelecionadoId();
          if (destinoSelecionadoId !== null) {
            this.carregarInvestimentos(destinoSelecionadoId);
          }
        },
        error: (erro: unknown) => {
          console.error('Erro ao carregar destinos de transferência:', erro);
          this.erroDestinosTransferencia.set(erro instanceof Error ? erro.message : 'Erro ao carregar destinos de transferência.');
          this.carregandoDestinosTransferencia.set(false);
        },
      });
  }

  protected alterarDestinoTransferencia(bancoContaId: number | null): void {
    this.transferirParaSelecionadoId.set(bancoContaId);
    this.investimentos.set([]);
    this.investimentoSelecionadoId.set(null);
    this.erroInvestimentos.set(null);
    this.requisicaoInvestimentos?.unsubscribe();
    this.carregandoInvestimentos.set(false);
    if (this.exigeInvestimento() && bancoContaId !== null) {
      this.carregarInvestimentos(bancoContaId);
    }
  }

  protected fecharModalNovoLancamento(): void {
    this.modalNovoLancamento().nativeElement.close();
    this.movimentacaoEditando.set(null);
  }

  protected salvarNovoLancamento(): void {
    const tipoSelecionado = this.tipoMovimentacaoSelecionado();
    const observacao = this.observacaoNovoLancamento.trim();
    const valor = this.valorNovoLancamento;
    const dataMovimentacao = this.dataNovoLancamento;
    const movimentacaoEditando = this.movimentacaoEditando();
    if (this.salvandoNovoLancamento() || !tipoSelecionado || !this.dataNovoLancamento
      || valor === null || !Number.isFinite(valor) || valor <= 0) {
      return;
    }

    if (movimentacaoEditando) {
      this.atualizarMovimentacao(movimentacaoEditando, tipoSelecionado.id, dataMovimentacao, valor, observacao);
      return;
    }

    const bancoConta = this.bancoContaSelecionada();
    if (!bancoConta) {
      return;
    }

    const lancamento: LancamentoMovimentacao = {
      bancoContaId: bancoConta.bancoContaId,
      tipoMovimentacaoId: tipoSelecionado.id,
      nrPosicao: 1,
      dtMovimentacao: dataMovimentacao,
      valor,
      observacao,
      investimentoId: this.investimentoSelecionadoId(),
      transferenciaId: this.transferirParaSelecionadoId()
    };
    this.erroSalvamentoNovoLancamento.set(null);
    this.salvandoNovoLancamento.set(true);
    this.requisicaoLancamento?.unsubscribe();
    this.requisicaoLancamento = this.servicoLancamentosMovimentacao.lancar(lancamento).subscribe({
      next: () => {
        this.salvandoNovoLancamento.set(false);
        this.fecharModalNovoLancamento();
        this.consultarResumo();
        this.consultarMovimentacoes();
      },
      error: (erro: unknown) => {
        console.error('Erro ao registrar movimentação:', erro);
        this.erroSalvamentoNovoLancamento.set(erro instanceof Error ? erro.message : 'Erro ao registrar movimentação.');
        this.salvandoNovoLancamento.set(false);
      },
    });
  }

  protected recarregarTiposMovimentacao(): void {
    this.carregarTiposMovimentacao();
  }

  protected recarregarInvestimentos(): void {
    const bancoContaId = this.transferirParaSelecionadoId();
    if (bancoContaId !== null) {
      this.carregarInvestimentos(bancoContaId);
    }
  }

  protected fecharModalAoClicarFora(evento: MouseEvent): void {
    if (evento.target === this.modalNovoLancamento().nativeElement) {
      this.fecharModalNovoLancamento();
    }
  }

  private carregarBancosContas(): void {
    const mes = this.mesSelecionado();
    const ano = this.anoSelecionado();
    const periodo = `${ano}-${mes}`;
    if (periodo === this.periodoCarregado) {
      return;
    }

    this.periodoCarregado = periodo;
    this.requisicaoBancosContas?.unsubscribe();
    this.carregandoBancosContas.set(true);
    this.erroBancosContas.set(null);
    this.bancosContasDisponiveis.set([]);
    this.requisicaoMovimentacoes?.unsubscribe();
    this.movimentacoesConsulta.set([]);
    this.erroMovimentacoes.set(null);
    this.carregandoMovimentacoes.set(false);
    this.requisicaoResumo?.unsubscribe();
    this.resumo.set(null);
    this.erroResumo.set(null);
    this.carregandoResumo.set(false);
    this.bancoSelecionado.set(null);
    this.contaSelecionada.set(null);

    this.requisicaoBancosContas = this.servicoBancosContas.listarDisponiveis(mes, ano).subscribe({
      next: (bancosContas) => {
        this.bancosContasDisponiveis.set(bancosContas);
        this.carregandoBancosContas.set(false);
        this.bancoSelecionado.set(this.bancos()[0]?.id ?? null);
        this.contaSelecionada.set(this.contas()[0]?.id ?? null);
        this.consultarResumo();
        this.consultarMovimentacoes();
      },
      error: (erro: unknown) => {
        console.error('Erro ao carregar bancos e contas:', erro);
        this.periodoCarregado = undefined;
        this.erroBancosContas.set(erro instanceof Error ? erro.message : 'Erro ao carregar bancos e contas.');
        this.carregandoBancosContas.set(false);
      },
    });
  }

  private carregarTiposMovimentacao(): void {
    this.requisicaoTiposMovimentacao?.unsubscribe();
    this.requisicaoDestinosTransferencia?.unsubscribe();
    this.carregandoTiposMovimentacao.set(true);
    this.erroTiposMovimentacao.set(null);

    this.requisicaoTiposMovimentacao = this.servicoTiposMovimentacao.listarAtivos().subscribe({
      next: (tipos) => {
        console.log(tipos);
        this.tiposMovimentacao.set(tipos);
        this.carregandoTiposMovimentacao.set(false);
      },
      error: (erro: unknown) => {
        console.error('Erro ao carregar tipos de movimentação:', erro);
        this.erroTiposMovimentacao.set(erro instanceof Error ? erro.message : 'Erro ao carregar tipos de movimentação.');
        this.carregandoTiposMovimentacao.set(false);
      },
    });
  }

  private carregarInvestimentos(bancoContaId: number): void {
    this.requisicaoInvestimentos?.unsubscribe();
    this.carregandoInvestimentos.set(true);
    this.erroInvestimentos.set(null);
    this.investimentos.set([]);

    this.requisicaoInvestimentos = this.servicoInvestimentos
      .listarAtivosPorBancoConta(bancoContaId)
      .subscribe({
        next: (investimentos) => {
          this.investimentos.set(investimentos);
          this.carregandoInvestimentos.set(false);
        },
        error: (erro: unknown) => {
          console.error('Erro ao carregar investimentos:', erro);
          this.erroInvestimentos.set(erro instanceof Error ? erro.message : 'Erro ao carregar investimentos.');
          this.carregandoInvestimentos.set(false);
        },
      });
  }

  private consultarResumo(): void {
    const bancoId = this.bancoSelecionado();
    const contaId = this.contaSelecionada();
    if (bancoId === null || contaId === null) {
      this.requisicaoResumo?.unsubscribe();
      this.resumo.set(null);
      this.erroResumo.set(null);
      this.carregandoResumo.set(false);
      return;
    }

    this.requisicaoResumo?.unsubscribe();
    this.resumo.set(null);
    this.erroResumo.set(null);
    this.carregandoResumo.set(true);

    this.requisicaoResumo = this.servicoMovimentacoesFinais
      .consultar(this.anoSelecionado(), this.mesSelecionado(), bancoId, contaId)
      .subscribe({
        next: (resumo) => {
          this.resumo.set(resumo);
          this.carregandoResumo.set(false);
        },
        error: (erro: unknown) => {
          this.erroResumo.set(erro instanceof Error ? erro.message : 'Erro ao consultar o resumo financeiro.');
          this.carregandoResumo.set(false);
        },
      });
  }

  private consultarMovimentacoes(): void {
    const bancoId = this.bancoSelecionado();
    const contaId = this.contaSelecionada();
    if (bancoId === null || contaId === null) {
      this.requisicaoMovimentacoes?.unsubscribe();
      this.movimentacoesConsulta.set([]);
      this.erroMovimentacoes.set(null);
      this.carregandoMovimentacoes.set(false);
      return;
    }

    this.requisicaoMovimentacoes?.unsubscribe();
    this.movimentacoesConsulta.set([]);
    this.erroMovimentacoes.set(null);
    this.carregandoMovimentacoes.set(true);

    this.requisicaoMovimentacoes = this.servicoMovimentacoes
      .consultar(this.anoSelecionado(), this.mesSelecionado(), bancoId, contaId)
      .subscribe({
        next: (movimentacoes) => {
          this.movimentacoesConsulta.set(movimentacoes);
          this.carregandoMovimentacoes.set(false);
        },
        error: (erro: unknown) => {
          console.error('Erro ao carregar movimentações:', erro);
          this.erroMovimentacoes.set(erro instanceof Error ? erro.message : 'Erro ao carregar movimentações.');
          this.carregandoMovimentacoes.set(false);
        },
      });
  }

  private obterDataInicialMovimentacao(): string {
    const agora = new Date();
    const dataHoje = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const ano = this.anoSelecionado();
    const mes = String(this.mesSelecionado()).padStart(2, '0');
    return dataHoje.slice(0, 7) === `${ano}-${mes}` ? dataHoje : `${ano}-${mes}-01`;
  }

  private atualizarMovimentacao(
    original: MovimentacaoConsulta,
    tipoMovimentacaoId: number,
    data: string,
    valor: number,
    observacao: string,
  ): void {
    const tipo = this.tiposBasicosMovimentacao().find((item) => item.id === tipoMovimentacaoId);
    if (!tipo || data < this.dataInicioPeriodo() || data > this.dataFimPeriodo()) {
      this.erroSalvamentoNovoLancamento.set('Informe um tipo válido e uma data dentro do período selecionado.');
      return;
    }

    const credito = tipo.icTipoMovimentacao === 'CREDITO';
    const atualizada: MovimentacaoConsulta = {
      ...original,
      dtMovimentacao: new Date(`${data}T00:00:00`).toISOString(),
      nrDia: Number(data.slice(8, 10)),
      vlCredito: credito ? valor : 0,
      vlDebito: credito ? 0 : valor,
      dsObservacao: observacao || null,
      tipoMovimentacaoId: tipo.id,
    };

    this.erroSalvamentoNovoLancamento.set(null);
    this.salvandoNovoLancamento.set(true);
    this.requisicaoAtualizacao?.unsubscribe();
    this.requisicaoAtualizacao = this.servicoMovimentacoes.atualizar(original.id, atualizada).subscribe({
      next: () => {
        this.salvandoNovoLancamento.set(false);
        this.fecharModalNovoLancamento();
        this.consultarMovimentacoes();
        this.consultarResumo();
      },
      error: (erro: unknown) => {
        console.error('Erro ao atualizar movimentação:', erro);
        this.erroSalvamentoNovoLancamento.set(erro instanceof Error ? erro.message : 'Erro ao atualizar movimentação.');
        this.salvandoNovoLancamento.set(false);
      },
    });
  }

  private converterDataParaInput(data: string | number | null): string {
    if (typeof data === 'string') {
      const dataIso = /^(\d{4}-\d{2}-\d{2})/.exec(data);
      if (dataIso) {
        return dataIso[1];
      }
    }
    const dataConvertida = new Date(data ?? Number.NaN);
    return Number.isNaN(dataConvertida.getTime()) ? '' : dataConvertida.toISOString().slice(0, 10);
  }
}
