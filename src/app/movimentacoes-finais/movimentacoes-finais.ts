import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BancoContaDisponivel } from '../modelos/banco-conta-disponivel';
import { MovimentacaoFinalMensal } from '../modelos/resumo-movimentacao-final';
import { ServicoBancosContas } from '../servicos/bancos-contas';
import { ServicoMovimentacoesFinais } from '../servicos/movimentacoes-finais';

@Component({ selector: 'app-movimentacoes-finais', imports: [CurrencyPipe, FormsModule], templateUrl: './movimentacoes-finais.html', styleUrl: './movimentacoes-finais.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class ComponenteMovimentacoesFinais implements OnInit, OnDestroy {
  private readonly servico = inject(ServicoMovimentacoesFinais);
  private readonly servicoBancosContas = inject(ServicoBancosContas);
  private requisicao?: Subscription;
  private requisicaoBancosContas?: Subscription;
  protected ano = new Date().getFullYear();
  protected bancoId: number | null = null;
  protected contaId: number | null = null;
  protected readonly bancosContas = signal<BancoContaDisponivel[]>([]);
  protected readonly registros = signal<MovimentacaoFinalMensal[]>([]);
  protected readonly carregando = signal(false);
  protected readonly carregandoFiltros = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  ngOnInit(): void { this.carregarFiltros(); }
  ngOnDestroy(): void { this.requisicao?.unsubscribe(); this.requisicaoBancosContas?.unsubscribe(); }

  protected filtrar(): void {
    if (!Number.isInteger(this.ano) || this.ano < 1900 || this.ano > 9999) return;
    if (this.bancoId === null || this.contaId === null) {
      this.registros.set([]);
      this.erro.set(null);
      return;
    }
    this.requisicao?.unsubscribe(); this.carregando.set(true); this.erro.set(null);
    this.requisicao = this.servico.listar(this.ano, this.bancoId, this.contaId).subscribe({
      next: registros => { this.registros.set([...registros].sort((a, b) => this.mesDoRegistro(a) - this.mesDoRegistro(b))); this.carregando.set(false); },
      error: erro => { this.registros.set([]); this.erro.set(erro instanceof Error ? erro.message : 'Erro ao carregar as movimentações finais.'); this.carregando.set(false); },
    });
  }

  protected alterarBanco(id: number | null): void { this.bancoId = id; this.contaId = this.contasDisponiveis()[0]?.contaId ?? null; this.filtrar(); }
  protected alterarConta(id: number | null): void { this.contaId = id; this.filtrar(); }
  protected contasDisponiveis(): BancoContaDisponivel[] { return this.bancoId === null ? this.bancosContas() : this.bancosContas().filter(item => item.bancoId === this.bancoId); }
  protected nomeMes(registro: MovimentacaoFinalMensal): string { const mes = this.mesDoRegistro(registro); return this.meses[mes - 1] ?? `Mês ${mes}`; }
  protected valor(valor: number | null | undefined): number { return valor ?? 0; }
  private mesDoRegistro(registro: MovimentacaoFinalMensal): number { return registro.nrMes ?? registro.mes ?? 0; }

  protected carregarFiltros(): void {
    this.carregandoFiltros.set(true);
    this.requisicaoBancosContas = this.servicoBancosContas.listarDisponiveis(1, this.ano).subscribe({
      next: bancosContas => { this.bancosContas.set(bancosContas); this.carregandoFiltros.set(false); this.filtrar(); },
      error: erro => { this.erro.set(erro instanceof Error ? erro.message : 'Erro ao carregar bancos e contas.'); this.carregandoFiltros.set(false); this.registros.set([]); },
    });
  }
}
