import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Competencia } from '../modelos/cartao-credito';
import { ServicoCompetencias } from '../servicos/competencias';

@Component({
  selector: 'app-competencias',
  imports: [FormsModule],
  templateUrl: './competencias.html',
  styleUrl: './competencias.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponenteCompetencias implements OnInit, OnDestroy {
  private readonly servicoCompetencias = inject(ServicoCompetencias);
  private requisicao?: Subscription;
  private requisicaoAdicao?: Subscription;
  protected ano = new Date().getFullYear();
  protected readonly competencias = signal<Competencia[]>([]);
  protected readonly carregando = signal(false);
  protected readonly adicionando = signal(false);
  protected readonly erro = signal<string | null>(null);

  ngOnInit(): void { this.filtrar(); }

  ngOnDestroy(): void {
    this.requisicao?.unsubscribe();
    this.requisicaoAdicao?.unsubscribe();
  }

  protected filtrar(): void {
    if (!this.anoValido() || this.carregando()) return;
    this.requisicao?.unsubscribe();
    this.carregando.set(true);
    this.erro.set(null);
    this.requisicao = this.servicoCompetencias.listarPorAno(this.ano).subscribe({
      next: (competencias) => {
        this.competencias.set([...competencias].sort((a, b) => a.nrMes - b.nrMes));
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.erro.set(erro instanceof Error ? erro.message : 'Erro ao consultar as competências.');
        this.competencias.set([]);
        this.carregando.set(false);
      },
    });
  }

  protected adicionar(): void {
    if (!this.anoValido() || this.adicionando()) return;
    this.requisicaoAdicao?.unsubscribe();
    this.adicionando.set(true);
    this.erro.set(null);
    this.requisicaoAdicao = this.servicoCompetencias.adicionarAno(this.ano).subscribe({
      next: () => { this.adicionando.set(false); this.filtrar(); },
      error: (erro: unknown) => {
        this.erro.set(erro instanceof Error ? erro.message : 'Erro ao adicionar as competências.');
        this.adicionando.set(false);
      },
    });
  }

  private anoValido(): boolean { return Number.isInteger(this.ano) && this.ano >= 1900 && this.ano <= 9999; }
}
