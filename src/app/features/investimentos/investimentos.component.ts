import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { Investimento } from '../../core/models/investimento.model';
import { InvestimentoContaVinculada } from '../../core/models/investimento-conta-vinculada.model';
import { InvestimentoService } from '../../core/services/investimento.service';

@Component({
  selector: 'app-investimentos',
  templateUrl: './investimentos.component.html',
  styleUrls: ['./investimentos.component.scss']
})
export class InvestimentosComponent implements OnInit, OnDestroy {
  private readonly subs = new Subscription();

  contasVinculadas: InvestimentoContaVinculada[] = [];
  investimentos: Investimento[] = [];
  investimentoEditando: Investimento | null = null;
  form!: FormGroup;
  carregando = true;
  carregandoContas = true;
  salvando = false;
  mensagemErro = '';
  mensagemSucesso = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly investimentoService: InvestimentoService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      contaId: ['', Validators.required]
    });




    this.subs.add(this.investimentoService.getInvestimentos().subscribe(investimentos => {
      this.investimentos = investimentos;
    }));
    
    
    this.carregarInvestimentos();
    this.listarBancosContas();
  }


  

  listarBancosContas(): void {
    this.carregandoContas = true;
    /*this.subs.add(this.investimentoService.listarContasVinculadas().subscribe({
      next: contas => {
        
        this.contasVinculadas = contas;
        this.carregandoContas = false;
      },
      error: () => {
        this.contasVinculadas = [];
        this.carregandoContas = false;
        this.mensagemErro = 'Não foi possível carregar os bancos e contas vinculados.';
      }
    }));*/
  }

  carregarInvestimentos(): void {
    this.carregando = true;
    this.mensagemErro = '';
    this.subs.add(this.investimentoService.listarInvestimentos().subscribe({
      next: () => this.carregando = false,
      error: (erro: HttpErrorResponse) => {
        this.carregando = false;
        this.mensagemErro = this.obterMensagemErro(erro, 'Não foi possível carregar os investimentos.');
      }
    }));
  }

  salvar(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    const valor = this.form.getRawValue();
    const requisicao = this.investimentoEditando
      ? this.investimentoService.atualizarInvestimento({
          ...this.investimentoEditando,
          nome: valor.nome.trim(),
          contaId: valor.contaId
        })
      : this.investimentoService.adicionarInvestimento(valor.nome, valor.contaId);

    this.subs.add(requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.mensagemSucesso = this.investimentoEditando
          ? 'Investimento atualizado com sucesso.'
          : 'Investimento cadastrado com sucesso.';
        this.cancelarEdicao();
      },
      error: (erro: HttpErrorResponse) => {
        this.salvando = false;
        this.mensagemErro = this.obterMensagemErro(
          erro,
          this.investimentoEditando
            ? 'Não foi possível atualizar o investimento.'
            : 'Não foi possível cadastrar o investimento.'
        );
      }
    }));
  }

  editar(investimento: Investimento): void {
    this.investimentoEditando = investimento;
    this.form.reset({ nome: investimento.nome, contaId: investimento.contaId || '' });
    this.mensagemErro = '';
    this.mensagemSucesso = '';
  }

  cancelarEdicao(): void {
    this.investimentoEditando = null;
    this.form.reset({ nome: '', contaId: '' });
  }

  getContaVinculada(contaId: number): InvestimentoContaVinculada | undefined {
    return this.contasVinculadas.find(conta => conta.contaId === contaId);
  }

  excluir(investimento: Investimento): void {
    if (!confirm(`Excluir o investimento "${investimento.nome}"?`)) return;

    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.subs.add(this.investimentoService.atualizarInvestimento({ ...investimento, ativo: false }).subscribe({
      next: () => {
        this.mensagemSucesso = 'Investimento excluído com sucesso.';
        if (this.investimentoEditando?.id === investimento.id) this.cancelarEdicao();
      },
      error: (erro: HttpErrorResponse) => {
        this.mensagemErro = this.obterMensagemErro(erro, 'Não foi possível excluir o investimento.');
      }
    }));
  }

  private obterMensagemErro(erro: HttpErrorResponse, mensagemPadrao: string): string {
    const mensagem = typeof erro.error === 'string'
      ? erro.error
      : erro.error?.message || erro.error?.mensagem;

    return mensagem || mensagemPadrao;
  }

  get investimentosAtivos(): Investimento[] {
    return this.investimentos.filter(investimento => investimento.ativo !== false);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
