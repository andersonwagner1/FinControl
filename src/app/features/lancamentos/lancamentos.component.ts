import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { LancamentoService} from '../../core/services/lancamento.service';
import { ContaService } from '../../core/services/conta.service';
import { BancoService } from '../../core/services/banco.service';

import { Conta, TIPOS_CONTA } from '../../core/models/conta.model';
import { Banco } from '../../core/models/banco.model';
import { CategoriaService } from '../../core/services/categoria.service';
import { Investimento } from '../../core/models/investimento.model';
import { InvestimentoService } from '../../core/services/investimento.service';
import { Lancamento } from '../../core/models/lancamento.model';
import { Categoria } from '../../core/models/categoria.model';

@Component({
  selector: 'app-lancamentos',
  templateUrl: './lancamentos.component.html',
  styleUrls: ['./lancamentos.component.scss']
})
export class LancamentosComponent implements OnInit {
  lancamentosFiltrados: Lancamento[] = [];
  contas: Conta[] = [];
  bancos: Banco[] = [];
  tiposConta = TIPOS_CONTA;
  categoriasCredito: Categoria[] = [];
  categoriasDebito: Categoria[] = [];
  investimentos: Investimento[] = [];

  filtroTipo = 'todos';
  filtroConta = 'todas';
  filtroCompetencia = new Date().toISOString().substring(0, 7); // YYYY-MM
  //categoriasDisponiveis: string[] = [];
  paginaAtual = 0;
  totalPaginas = 0;
  totalLancamentos = 0;


  valorInicial = 1000;


  saldoInicial = 1000;
  totalCreditos = 0;
  totalDebitos = 0;

  saldoFinal = 0;
  readonly tamanhoPagina = 50;

  showModal = false;
  tipoModal: 'RESGATE'| 'APLICACAO' |'CREDITO' | 'DEBITO' | 'TRANSFERENCIA' = 'CREDITO';
  isEditando = false;
  lancamentoIdEditando: number | null = null;
  form!: FormGroup;
  erroTransferencia = '';
  mensagemErro = '';
  mensagemSucesso = '';
  salvando = false;
  showConfirmacaoExclusao = false;
  lancamentoParaExcluir: Lancamento | null = null;
  showSaldoModal = false;
  saldoFinalInformado: number | null = null;
  processandoAcao = false;
  mensagemAcaoSucesso = '';
  mensagemAcaoErro = '';
  ngOnInit(): void {
    this.bancoService.getBancos().subscribe(b=>{
      this.bancos = b
    });

    this.categoriaService.getCategorias().subscribe(categorias =>{
      
      this.categoriasCredito = categorias
          .filter(t => t.tipo === 'CREDITO')
          .map(t => ({
            nome: t.nome,
            id: t.id,
            tipo: 'CREDITO',
            ativo: 'SIM'
          }));
          
      this.categoriasDebito = categorias
          .filter(t => t.tipo === 'DEBITO')
          .map(t => (
            {
               nome: t.nome,
            id: t.id,
            tipo: 'DEBITO',
            ativo: 'SIM'
            }
          ));
          });

    this.contaService.getContas().subscribe(c => { this.contas = c; })
    
     this.form = this.fb.group({
      bancoContaId: ['', Validators.required],
      bancoContaDestinoId: [''], // Only used for transfers
      tipoTransferencia: ['TRANSFERENCIA'],
      investimento: [{ value: '', disabled: true }],
      
      tipoMovimentacaoId: [''], // Will be dynamically validated if not transfer
      valor: [null, [Validators.required, Validators.min(0.01)]],
     // data: [new Date().toISOString().split('T')[0], Validators.required],
     data: '2026/09/25',
     
      observacao: [''],
    });/*, { validators: this.validarContasDiferentes })*/


     this.carregarPagina();
    
  }

   constructor(
    private lancamentoService: LancamentoService,
    private contaService: ContaService,
    private bancoService: BancoService,
    private categoriaService: CategoriaService,
    private investimentoService: InvestimentoService,
    private fb: FormBuilder,
  ) {}

  abrirModal(tipo: 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA' | 'APLICACAO' | 'RESGATE'): void {
    this.isEditando = false;
    this.lancamentoIdEditando = null;
    this.tipoModal = tipo;
    this.erroTransferencia = '';
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.form.reset({
      data: new Date().toISOString().split('T')[0],
      competencia: this.filtroCompetencia,
      bancoContaDestinoId: '',
      tipoTransferencia: 'TRANSFERENCIA',
      investimento: ''
    });
    this.alterarAplicacao();

    if (tipo === 'TRANSFERENCIA') {
      this.form.get('tipoMovimentacaoId')?.clearValidators();
      this.form.get('bancoContaDestinoId')?.setValidators(Validators.required);
    } else {
      this.form.get('tipoMovimentacaoId')?.setValidators(Validators.required);
      this.form.get('bancoContaDestinoId')?.clearValidators();
    }
    this.form.get('tipoMovimentacaoId')?.updateValueAndValidity();
    this.form.get('bancoContaDestinoId')?.updateValueAndValidity();

    this.showModal = true;



  }


  fecharModal(): void {
      this.showModal = false;
  }

  atualizarMovimentacao(): void {
    const bancoContaId = this.obterContaSelecionada();
    if (!bancoContaId || this.processandoAcao) return;

    this.limparMensagensAcao();
    this.processandoAcao = true;
    const dataInicial = this.periodoDaCompetencia().dataInicio;

    this.lancamentoService.atualizarMovimentacaoFinal(bancoContaId, dataInicial).subscribe({
      next: (resposta: unknown) => {
        this.processandoAcao = false;
        this.mensagemAcaoSucesso = this.obterMensagemResposta(resposta, 'Movimentações atualizadas com sucesso.');
        this.carregarPagina();
      },
      error: (erro: HttpErrorResponse) => {
        this.processandoAcao = false;
        this.mensagemAcaoErro = this.obterMensagemErro(erro, 'Não foi possível atualizar as movimentações.');
      }
    });
  }

  abrirModalSaldo(): void {
    if (!this.obterContaSelecionada()) return;
    this.saldoFinalInformado = null;
    this.limparMensagensAcao();
    this.showSaldoModal = true;
  }

  fecharModalSaldo(): void {
    if (this.processandoAcao) return;
    this.showSaldoModal = false;
  }

  salvarSaldoFinal(): void {
    const bancoContaId = this.obterContaSelecionada();
    if (!bancoContaId || this.saldoFinalInformado === null || !Number.isFinite(this.saldoFinalInformado) || this.processandoAcao) {
      return;
    }

    this.processandoAcao = true;
    const dataInicial = this.periodoDaCompetencia().dataInicio;

    this.lancamentoService.atualizarSaldo(bancoContaId, dataInicial, this.saldoFinalInformado).subscribe({
      next: (resposta: unknown) => {
        this.processandoAcao = false;
        this.showSaldoModal = false;
        this.mensagemAcaoSucesso = this.obterMensagemResposta(resposta, 'Saldo atualizado com sucesso.');
        this.carregarPagina();
      },
      error: (erro: HttpErrorResponse) => {
        this.processandoAcao = false;
        this.mensagemAcaoErro = this.obterMensagemErro(erro, 'Não foi possível atualizar o saldo.');
      }
    });
  }

  private obterContaSelecionada(): number | null {
    return this.filtroConta === 'todas' ? null : Number(this.filtroConta);
  }

  private limparMensagensAcao(): void {
    this.mensagemAcaoSucesso = '';
    this.mensagemAcaoErro = '';
  }

  private obterMensagemResposta(resposta: unknown, mensagemPadrao: string): string {
    if (typeof resposta === 'string' && resposta.trim()) return resposta;
    if (resposta && typeof resposta === 'object') {
      const respostaObj = resposta as { message?: string; mensagem?: string };
      return respostaObj.message || respostaObj.mensagem || mensagemPadrao;
    }
    return mensagemPadrao;
  }

  aplicarFiltros(): void {
  }

   alterarConta(): void {    
    this.carregarPagina();
  }

   private carregarPagina(): void {
    const { dataInicio, dataFim } = this.periodoDaCompetencia();
    const bancoContaId = this.filtroConta === 'todas' ? undefined : Number(this.filtroConta);
    //Adicionar metodo para buscar os lancamentos

    this.lancamentoService.buscarLancamentosFinal(dataInicio, bancoContaId).subscribe({
      next: (resultado : any) =>{        
        console.log("Resultado da busca de lançamentos:", resultado);
        this.valorInicial =  resultado.saldoInicial;
        this.totalCreditos=  resultado.totalCredito;
        this.totalDebitos = resultado.totalDebito;
        this.saldoFinal = resultado.saldoFinal;
      },
      error: () => {

      }
    })

    this.lancamentoService.buscarPagina(dataInicio, dataFim, this.paginaAtual, this.tamanhoPagina, bancoContaId)
      .subscribe({
        next: (resultado: Lancamento[]) => {
         
          this.lancamentosFiltrados = resultado;
          this.totalLancamentos = resultado.length;
        },
        error: () => {
          //this.lancamentos = [];
          this.lancamentosFiltrados = [];
          this.totalPaginas = 0;
          this.totalLancamentos = 0;
        }
      });
  }

  private periodoDaCompetencia(): { dataInicio: string; dataFim: string } {
    const [ano, mes] = this.filtroCompetencia.split('-').map(Number);
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0);
    const formatar = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    return { dataInicio: formatar(inicio), dataFim: formatar(fim) };
  }

  getContasDisponiveisPorBanco(bancoId: number): Conta[] {
    return this.contasDisponiveis.filter(conta => conta.bancoId === bancoId);
  }

    get contasDisponiveis(): Conta[] {
    if (!this.filtroCompetencia) return this.contas.filter(conta => conta.ativa);

    const [ano, mes] = this.filtroCompetencia.split('-').map(Number);
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

    return this.contas.filter(conta => {
      const abertaNaCompetencia = conta.dataAbertura <= fim;
      const naoFechadaNaCompetencia = !conta.dataFechamento || conta.dataFechamento >= inicio;
      return conta.ativa && abertaNaCompetencia && naoFechadaNaCompetencia;
    });
  }

    selecionarTipoTransferencia(tipo: 'TRANSFERENCIA' | 'APLICACAO' | 'RESGATE'): void {
      this.form.get('tipoTransferencia')?.setValue(tipo);
      this.alterarAplicacao();
    }

    alterarAplicacao(): void {
    const investimento = this.form.get('investimento');
    if (this.form.get('tipoTransferencia')?.value !== 'TRANSFERENCIA') {
      investimento?.enable();
    } else {
      investimento?.reset('');
      investimento?.disable();
    }
  }

    alterarMesCompetencia(offset: number): void {
      const [ano, mes] = this.filtroCompetencia.split('-').map(Number);
      const novaCompetencia = new Date(ano, mes - 1 + offset, 1);
      this.filtroCompetencia = `${novaCompetencia.getFullYear()}-${String(novaCompetencia.getMonth() + 1).padStart(2, '0')}`;
      this.alterarCompetencia();
    }


    listarAplicacoesPorBancoConta(){
      let val = this.form.value;

       this.investimentoService.getInvestimentosAtivos(val.bancoContaDestinoId).subscribe(investimentos => {
          this.investimentos = investimentos;
             console.log(investimentos);
        });
    }


  alterarPagina(offset: number): void {
    const pagina = this.paginaAtual + offset;
    if (pagina < 0 || pagina >= this.totalPaginas) return;
    this.paginaAtual = pagina;
    this.carregarPagina();
  }

  alterarCompetencia(): void {
    if (this.filtroConta !== 'todas' && !this.contasDisponiveis.some(conta => conta.id+"" === this.filtroConta)) {
      this.filtroConta = 'todas';
    }
    this.paginaAtual = 0;
    this.carregarPagina();
  }

   get periodoConsulta(): { dataInicio: string; dataFim: string } {
    return this.periodoDaCompetencia();
  }

  getContaNome(contaId: number): string {
    const conta = this.contas.find(c => c.id === contaId);
    return conta ? conta.descricao : contaId + "-";
  }

  
  getBancoCor(contaId: number): string {
    const conta = this.contas.find(c => c.id === contaId);
    if (!conta) return '#888';
    return this.bancos.find(b => b.id === conta.bancoId)?.cor ?? '#888';
  }

    getBancoNome(contaId: number): string {
    const conta = this.contas.find(c => c.id === contaId);
    if (!conta) return '';
    const banco = this.bancos.find(b => b.id === conta.bancoId);
    return banco ? banco.nome : '';
  }


    getContaTipo(contaId: number): string {
    return this.contas.find(c => c.id === contaId)?.tipo ?? '';
  }


  salvarLancamento(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    const val = this.form.value;

    let requisicao: Observable<unknown>;

    if (this.tipoModal === 'TRANSFERENCIA') {
      requisicao = this.lancamentoService.realizarTransferencia({
        bancoContaId: val.bancoContaId,
        bancoContaDestinoId: val.bancoContaDestinoId,
        valor: +val.valor,
        data: val.data,
        observacao: val.observacao,
        investimento: val.investimento || undefined,
        tipoTransferencia: val.tipoTransferencia
      });
    } else {
      if (this.isEditando && this.lancamentoIdEditando) {
        requisicao = this.lancamentoService.atualizarLancamento({
          id: this.lancamentoIdEditando,
          bancoContaId: val.bancoContaId,
          tipo: this.tipoModal,          
          tipoMovimentacaoId: val.tipoMovimentacaoId,
          valor: +val.valor,
          data: val.data  ,          
          observacao: val.observacao || undefined
        });
      } else {
        requisicao = this.lancamentoService.adicionarLancamento({
          bancoContaId: val.bancoContaId,
          tipo: this.tipoModal,
          tipoMovimentacaoId: val.tipoMovimentacaoId,
          valor: +val.valor,
          data: val.data,
          observacao: val.observacao || undefined,
        });
      }
    }

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.mensagemSucesso = this.isEditando
          ? 'Lançamento atualizado com sucesso.'
          : 'Lançamento salvo com sucesso.';
        this.carregarPagina();
      },
      error: (erro: HttpErrorResponse) => {
        this.salvando = false;
        this.mensagemErro = this.obterMensagemErro(erro, 'Não foi possível salvar o lançamento.');
      }
    });

    this.carregarPagina();
  }

  private obterMensagemErro(erro: HttpErrorResponse, mensagemPadrao: string): string {
    const mensagem = typeof erro.error === 'string'
      ? erro.error
      : erro.error?.message || erro.error?.mensagem;

    return mensagem || erro.message || mensagemPadrao;
  }

  get categoriasForm(): Categoria[] {
    return this.tipoModal == 'CREDITO' ? this.categoriasCredito : this.categoriasDebito;

  }


  editarLancamento(lancamento: Lancamento): void {
    
    this.isEditando = true;
    this.lancamentoIdEditando = lancamento.id == undefined ? 0  :lancamento.id;
    this.tipoModal = lancamento.tipo; // For edits, we only support credito/debito for now
    this.form.get('tipoMovimentacaoId')?.setValidators(Validators.required);
    this.form.get('bancoContaDestinoId')?.clearValidators();
    this.form.get('tipoMovimentacaoId')?.updateValueAndValidity();
    this.form.get('bancoContaDestinoId')?.updateValueAndValidity();

    this.form.patchValue({
      bancoContaId: lancamento.bancoContaId,      
      tipoMovimentacaoId: lancamento.tipoMovimentacaoId,
      valor: lancamento.valor,
      data: lancamento.data,
      
      observacao: lancamento.observacao
    });
    this.showModal = true;
  }

  excluirLancamento(lancamento: Lancamento): void {
    this.lancamentoParaExcluir = lancamento;
    this.showConfirmacaoExclusao = true;

  }

  cancelarExclusao(): void {
    this.showConfirmacaoExclusao = false;
    this.lancamentoParaExcluir = null;
  }

  confirmarExclusao(): void {
    if (!this.lancamentoParaExcluir) return;

    this.lancamentoService.removerLancamento(this.lancamentoParaExcluir.id);
    this.cancelarExclusao();
  }
}
