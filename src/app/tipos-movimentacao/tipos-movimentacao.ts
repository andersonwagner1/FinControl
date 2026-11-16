import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CategoriaMovimentacao, IndicadorTipoMovimentacao, TipoMovimentacaoAtiva } from '../modelos/tipo-movimentacao-ativa';
import { ServicoTiposMovimentacao } from '../servicos/tipos-movimentacao';

@Component({ selector: 'app-tipos-movimentacao', imports: [FormsModule], templateUrl: './tipos-movimentacao.html', styleUrl: './tipos-movimentacao.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class ComponenteTiposMovimentacao implements OnInit, OnDestroy {
  private readonly servico = inject(ServicoTiposMovimentacao);
  private requisicao?: Subscription;
  private requisicaoSalvamento?: Subscription;
  private requisicaoCategorias?: Subscription;
  protected readonly tipos = signal<TipoMovimentacaoAtiva[]>([]);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly carregandoCategorias = signal(false);
  protected readonly categorias = signal<CategoriaMovimentacao[]>([]);
  protected readonly erro = signal<string | null>(null);
  protected readonly modalAberto = signal(false);
  protected readonly editando = signal<TipoMovimentacaoAtiva | null>(null);
  protected nome = '';
  protected categoriaId: number | null = null;
  protected indicador: IndicadorTipoMovimentacao = 'DEBITO';
  protected readonly indicadores: IndicadorTipoMovimentacao[] = ['CREDITO', 'DEBITO', 'APLICACAO', 'TRANSFERENCIA', 'RESGATE'];

  ngOnInit(): void { this.carregar(); this.carregarCategorias(); }
  ngOnDestroy(): void { this.requisicao?.unsubscribe(); this.requisicaoSalvamento?.unsubscribe(); this.requisicaoCategorias?.unsubscribe(); }

  protected carregar(): void {
    this.requisicao?.unsubscribe(); this.carregando.set(true); this.erro.set(null);
    this.requisicao = this.servico.listar().subscribe({ next: tipos => { this.tipos.set(tipos); this.carregando.set(false); }, error: erro => { this.erro.set(erro instanceof Error ? erro.message : 'Erro ao carregar os tipos.'); this.carregando.set(false); } });
  }

  private carregarCategorias(): void {
    this.carregandoCategorias.set(true);
    this.requisicaoCategorias = this.servico.listarCategorias().subscribe({
      next: categorias => { this.categorias.set(categorias); this.carregandoCategorias.set(false); },
      error: erro => { this.erro.set(erro instanceof Error ? erro.message : 'Erro ao carregar as categorias.'); this.carregandoCategorias.set(false); },
    });
  }

  protected abrirNovo(): void { this.editando.set(null); this.nome = ''; this.categoriaId = null; this.indicador = 'DEBITO'; this.erro.set(null); this.modalAberto.set(true); }
  protected abrirEdicao(tipo: TipoMovimentacaoAtiva): void { this.editando.set(tipo); this.nome = tipo.dsTipoMovimentacao; this.categoriaId = tipo.categoriaId ?? this.categorias().find(categoria => categoria.dsCategoria === tipo.dsCategoria)?.id ?? null; this.indicador = tipo.icTipoMovimentacao; this.erro.set(null); this.modalAberto.set(true); }
  protected fecharModal(): void { if (!this.salvando()) this.modalAberto.set(false); }

  protected salvar(): void {
    const nome = this.nome.trim();
    if (!nome || this.categoriaId === null || this.salvando()) return;
    const dados = { dsTipoMovimentacao: nome, categoriaId: this.categoriaId, icTipoMovimentacao: this.indicador };
    this.salvando.set(true); this.erro.set(null); this.requisicaoSalvamento?.unsubscribe();
    const request = this.editando() ? this.servico.atualizar(this.editando()!.id, dados) : this.servico.salvar(dados);
    this.requisicaoSalvamento = request.subscribe({ next: () => { this.salvando.set(false); this.modalAberto.set(false); this.carregar(); }, error: erro => { this.erro.set(erro instanceof Error ? erro.message : 'Erro ao salvar o tipo.'); this.salvando.set(false); } });
  }
}
