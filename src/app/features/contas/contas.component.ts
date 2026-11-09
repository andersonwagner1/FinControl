import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ContaService } from '../../core/services/conta.service';
import { BancoService } from '../../core/services/banco.service';
import { Conta, TipoConta, TIPOS_CONTA } from '../../core/models/conta.model';
import { Banco } from '../../core/models/banco.model';

type FiltroCategoria = 'todos' | 'bancaria' | 'investimento';

@Component({
  selector: 'app-contas',
  templateUrl: './contas.component.html',
  styleUrls: ['./contas.component.scss']
})
export class ContasComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  contas: Conta[] = [];
  contasFiltradas: Conta[] = [];
  bancos: Banco[] = [];
  tiposConta = TIPOS_CONTA;

  filtroCategoria: FiltroCategoria = 'todos';
  filtroBanco = 'todos';
  filtroTipo = 'todos';

  showModal = false;
  form!: FormGroup;
  tiposDisponiveis = Object.keys(TIPOS_CONTA) as TipoConta[];

  constructor(
    private contaService: ContaService,
    private bancoService: BancoService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.bancoService.getBancos().subscribe(b => { this.bancos = b; })
    );
    this.initForm();

    this.subs.add(
      this.contaService.getContas().subscribe(contas => {
        console.log(contas);
        this.contas = contas;
        this.aplicarFiltros();
      })
    );
  }

  initForm(): void {
    this.form = this.fb.group({
      bancoId: ['', Validators.required],
      tipo: ['CC', Validators.required],
      descricao: ['', [Validators.required, Validators.minLength(3)]],
      saldo: [0, [Validators.required, Validators.min(0)]],
      rentabilidade: [null],
      vencimento: [null],
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.contas];

    if (this.filtroCategoria === 'bancaria') {
      resultado = resultado.filter(c => c.tipo === 'CC' || c.tipo === 'CP');
    } else if (this.filtroCategoria === 'investimento') {
      resultado = resultado.filter(c => c.tipo !== 'CC' && c.tipo !== 'CP');
    }

    if (this.filtroBanco !== 'todos') {
      resultado = resultado.filter(c => c.bancoId + "" === this.filtroBanco);
    }

    if (this.filtroTipo !== 'todos') {
      resultado = resultado.filter(c => c.tipo === this.filtroTipo);
    }

    this.contasFiltradas = resultado;
  }

  setFiltroCategoria(cat: FiltroCategoria): void {
    this.filtroCategoria = cat;
    this.filtroTipo = 'todos';
    this.aplicarFiltros();
  }

  getSaldoTotal(): number {
    return this.contasFiltradas.reduce((acc, c) => acc + c.saldo, 0);
  }

  getBanco(id?: number): Banco | undefined {
    return this.bancos.find(b => b.id === id);
  }

  isInvestimento(tipo: TipoConta): boolean {
    return tipo !== 'CC' && tipo !== 'CP';
  }

  abrirModal(): void {
    this.form.reset({ tipo: 'CC', saldo: 0 });
    this.showModal = true;
  }

  fecharModal(): void {
    this.showModal = false;
  }

  salvarConta(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    const novaConta: Conta = {

      bancoId: val.bancoId,
      tipo: val.tipo,
      descricao: val.descricao,
      saldo: +val.saldo,
      ativa: true,
      rentabilidade: val.rentabilidade ?? undefined,
      vencimento: val.vencimento ?? undefined,
      dataAbertura: new Date().toISOString().split('T')[0],
    };
    this.contaService.adicionarConta(novaConta);
    this.fecharModal();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
