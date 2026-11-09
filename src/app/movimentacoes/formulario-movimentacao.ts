import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { BancoContaDisponivel } from '../modelos/banco-conta-disponivel';
import { DadosMovimentacao, TipoMovimentacao } from '../modelos/movimentacao';
import { ServicoBancosContas } from '../servicos/bancos-contas';
import { ServicoMovimentacoes } from '../servicos/movimentacoes';

@Component({
  selector: 'app-formulario-movimentacao',
  imports: [FormsModule, RouterLink],
  templateUrl: './formulario-movimentacao.html',
  styleUrl: './formulario-movimentacao.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponenteFormularioMovimentacao implements OnInit, OnDestroy {
  private readonly servicoMovimentacoes = inject(ServicoMovimentacoes);
  private readonly servicoBancosContas = inject(ServicoBancosContas);
  private readonly roteador = inject(Router);
  private requisicaoBancosContas?: Subscription;
  private periodoCarregado?: string;

  protected readonly bancosContasDisponiveis = signal<BancoContaDisponivel[]>([]);
  protected readonly carregandoBancosContas = signal(false);
  protected readonly erroBancosContas = signal<string | null>(null);
  protected readonly categorias = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Contas', 'Salário', 'Renda extra', 'Outros'];
  protected readonly hoje = this.obterDataAtual();
  protected readonly meses = [
    { numero: 1, nome: 'Janeiro' },
    { numero: 2, nome: 'Fevereiro' },
    { numero: 3, nome: 'Março' },
    { numero: 4, nome: 'Abril' },
    { numero: 5, nome: 'Maio' },
    { numero: 6, nome: 'Junho' },
    { numero: 7, nome: 'Julho' },
    { numero: 8, nome: 'Agosto' },
    { numero: 9, nome: 'Setembro' },
    { numero: 10, nome: 'Outubro' },
    { numero: 11, nome: 'Novembro' },
    { numero: 12, nome: 'Dezembro' },
  ];
  protected readonly bancosDisponiveis = computed(() => {
    const unicos = new Map<number, string>();
    for (const bancoConta of this.bancosContasDisponiveis()) {
      unicos.set(bancoConta.bancoId, bancoConta.nomeBanco);
    }
    return [...unicos].map(([id, nome]) => ({ id, nome }));
  });
  protected readonly contasDisponiveis = computed(() => this.bancosContasDisponiveis()
    .filter((bancoConta) => bancoConta.bancoId === this.bancoSelecionado()));
  protected tipo: TipoMovimentacao = 'saida';
  protected descricao = '';
  protected categoria = 'Alimentação';
  protected valor: number | null = null;
  protected data = this.hoje;
  protected readonly mesSelecionado = signal(Number(this.hoje.slice(5, 7)));
  protected readonly anoSelecionado = signal(Number(this.hoje.slice(0, 4)));
  protected readonly bancoSelecionado = signal<number | null>(null);
  protected readonly contaSelecionada = signal<number | null>(null);

  ngOnInit(): void {
    this.carregarBancosContas();
  }

  ngOnDestroy(): void {
    this.requisicaoBancosContas?.unsubscribe();
  }

  protected alterarData(data: string): void {
    this.data = data;
    const correspondenciaData = /^(\d{4})-(\d{2})-\d{2}$/.exec(data);
    if (correspondenciaData) {
      this.anoSelecionado.set(Number(correspondenciaData[1]));
      this.mesSelecionado.set(Number(correspondenciaData[2]));
    }
    this.carregarBancosContas();
  }

  protected alterarMes(mes: number): void {
    console.log('Alterando mês para:', mes);

    if (mes < 1 || mes > 12) {
      return;
    }
    this.mesSelecionado.set(mes);
    this.atualizarDataDoPeriodo();
  }

  protected alterarAno(ano: number): void {
    console.log('Alterando ano para:', ano);

    if (!Number.isInteger(ano) || ano < 1900 || ano > 9999) {
      return;
    }
    this.anoSelecionado.set(ano);
    this.atualizarDataDoPeriodo();
  }

  protected alterarBanco(bancoId: number | null): void {
    this.bancoSelecionado.set(bancoId);
    this.contaSelecionada.set(this.contasDisponiveis()[0]?.bancoContaId ?? null);
  }

  protected recarregarBancosContas(): void {
    this.periodoCarregado = undefined;
    this.carregarBancosContas();
  }

  protected salvar(): void {
    const bancoConta = this.bancosContasDisponiveis()
      .find((item) => item.bancoContaId === this.contaSelecionada());
    if (!this.descricao.trim() || !this.categoria || !this.valor || this.valor <= 0 || !this.data || !bancoConta) {
      return;
    }

    const dados: DadosMovimentacao = {
      descricao: this.descricao.trim(),
      categoria: this.categoria,
      tipo: this.tipo,
      valor: this.valor,
      data: this.data,
      banco: bancoConta.nomeBanco,
      conta: bancoConta.nomeConta,
    };
    this.servicoMovimentacoes.adicionar(dados);
    void this.roteador.navigateByUrl('/');
  }

  private carregarBancosContas(): void {
    const ano = this.anoSelecionado();
    const mes = this.mesSelecionado();
    const periodo = `${ano}-${mes}`;
    if (periodo === this.periodoCarregado) {
      return;
    }

    this.periodoCarregado = periodo;
    this.requisicaoBancosContas?.unsubscribe();
    this.carregandoBancosContas.set(true);
    this.erroBancosContas.set(null);
    this.bancosContasDisponiveis.set([]);
    this.bancoSelecionado.set(null);
    this.contaSelecionada.set(null);

    this.requisicaoBancosContas = this.servicoBancosContas.listarDisponiveis(mes, ano).subscribe({
      next: (bancosContas) => {
        this.bancosContasDisponiveis.set(bancosContas);
        this.bancoSelecionado.set(this.bancosDisponiveis()[0]?.id ?? null);
        this.contaSelecionada.set(this.contasDisponiveis()[0]?.bancoContaId ?? null);
        this.carregandoBancosContas.set(false);
      },
      error: (erro: unknown) => {
        this.periodoCarregado = undefined;
        this.erroBancosContas.set(erro instanceof Error ? erro.message : 'Erro ao carregar bancos e contas.');
        this.carregandoBancosContas.set(false);
      },
    });
  }

  private atualizarDataDoPeriodo(): void {
    const diaAtual = Number(this.data.slice(8, 10)) || 1;
    const ultimoDiaDoMes = new Date(this.anoSelecionado(), this.mesSelecionado(), 0).getDate();
    const dia = String(Math.min(diaAtual, ultimoDiaDoMes)).padStart(2, '0');
    this.data = `${this.anoSelecionado()}-${String(this.mesSelecionado()).padStart(2, '0')}-${dia}`;
    this.carregarBancosContas();
  }

  private obterDataAtual(): string {
    const agora = new Date();
    return new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }
}
