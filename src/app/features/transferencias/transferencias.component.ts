import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LancamentoService } from '../../core/services/lancamento.service';
import { ContaService } from '../../core/services/conta.service';
import { BancoService } from '../../core/services/banco.service';
import { Transferencia } from '../../core/models/transferencia.model';
import { Conta, TIPOS_CONTA } from '../../core/models/conta.model';
import { Banco } from '../../core/models/banco.model';

@Component({
  selector: 'app-transferencias',
  templateUrl: './transferencias.component.html',
  styleUrls: ['./transferencias.component.scss']
})
export class TransferenciasComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  transferencias: Transferencia[] = [];
  contas: Conta[] = [];
  bancos: Banco[] = [];
  tiposConta = TIPOS_CONTA;

  showModal = false;
  form!: FormGroup;
  erroTransferencia = '';
  sucessoTransferencia = '';

  constructor(
    private lancamentoService: LancamentoService,
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
      this.contaService.getContas().subscribe(c => { this.contas = c; })
    );
    this.subs.add(
      this.lancamentoService.getTransferencias().subscribe(t => {
        this.transferencias = [...t].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        );
      })
    );
  }

  initForm(): void {
    this.form = this.fb.group({
      contaOrigemId: ['', Validators.required],
      contaDestinoId: ['', Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      data: [new Date().toISOString().split('T')[0], Validators.required],
      descricao: ['', [Validators.required, Validators.minLength(3)]],
    }, { validators: this.validarContasDiferentes });
  }

  validarContasDiferentes(group: FormGroup): { [key: string]: boolean } | null {
    const origem = group.get('contaOrigemId')?.value;
    const destino = group.get('contaDestinoId')?.value;
    if (origem && destino && origem === destino) {
      return { mesmaConta: true };
    }
    return null;
  }

  get saldoOrigem(): number {
    const id = this.form.get('contaOrigemId')?.value;
    return this.contas.find(c => c.id === id)?.saldo ?? 0;
  }

  get valorValido(): boolean {
    const valor = this.form.get('valor')?.value;
    return valor > 0 && valor <= this.saldoOrigem;
  }

  abrirModal(): void {
    this.form.reset({ data: new Date().toISOString().split('T')[0] });
    this.erroTransferencia = '';
    this.sucessoTransferencia = '';
    this.showModal = true;
  }

  fecharModal(): void {
    this.showModal = false;
  }

  realizarTransferencia(): void {
    console.log("realizarTransferencia");
    if (this.form.invalid) return;
    const val = this.form.value;
console.log("realizarTransferencia");
    
    console.log(val);
    const sucesso = this.lancamentoService.realizarTransferencia({
      bancoContaId: val.contaOrigemId,
      bancoContaDestinoId: val.contaDestinoId,
      valor: +val.valor,
      data: val.data,
      observacao: val.descricao,
      tipoTransferencia: val.tipo
    });

    if (sucesso) {
      this.fecharModal();
    } else {
      this.erroTransferencia = 'Saldo insuficiente ou contas inválidas.';
    }
  }

  getContaNome(id: number): string {
    return this.contas.find(c => c.id === id)?.descricao ?? id + "-";
  }

  getBancoNome(contaId: number): string {
    const conta = this.contas.find(c => c.id === contaId);
    if (!conta) return '';
    return this.bancos.find(b => b.id === conta.bancoId)?.nome ?? '';
  }

  getContaTipo(id: number): string {
    return this.contas.find(c => c.id === id)?.tipo ?? '';
  }

  getBancoCor(contaId: number): string {
    const conta = this.contas.find(c => c.id === contaId);
    if (!conta) return '#888';
    return this.bancos.find(b => b.id === conta.bancoId)?.cor ?? '#888';
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
