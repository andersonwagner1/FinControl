import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { VinculoService } from '../../core/services/vinculo.service';
import { BancoService } from '../../core/services/banco.service';
import { ContaBaseService } from '../../core/services/conta-base.service';
import { Vinculo } from '../../core/models/vinculo.model';
import { Banco } from '../../core/models/banco.model';
import { ContaBase } from '../../core/models/conta-base.model';

@Component({
  selector: 'app-vinculos',
  templateUrl: './vinculos.component.html',
  styleUrls: ['./vinculos.component.scss']
})
export class VinculosComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  vinculos: Vinculo[] = [];
  bancos: Banco[] = [];
  contasBase: ContaBase[] = [];

  showModal = false;
  form!: FormGroup;
  isEditando = false;

  constructor(
    private vinculoService: VinculoService,
    private bancoService: BancoService,
    private contaBaseService: ContaBaseService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.subs.add(
      this.vinculoService.getVinculos().subscribe(v => { this.vinculos = v; })
    );
    this.subs.add(
      this.bancoService.getBancos().subscribe(b => { this.bancos = b; })
    );
    this.subs.add(
      this.contaBaseService.getContasBase().subscribe(c => { this.contasBase = c; })
    );
  }

  initForm(): void {
    this.form = this.fb.group({
      id: [''],
      bancoId: ['', Validators.required],
      contaBaseId: ['', Validators.required],
      saldo: [0, [Validators.required, Validators.min(0)]],
      dataInicio: [new Date().toISOString().split('T')[0], Validators.required],
      dataFim: [''],
      rentabilidade: [null],
      vencimento: [''],
      ativa: [true]
    });
  }

  abrirModalParaAdicionar(): void {
    this.isEditando = false;
    this.form.reset({
      saldo: 0,
      dataInicio: new Date().toISOString().split('T')[0],
      ativa: true
    });
    this.showModal = true;
  }

  abrirModalParaEditar(vinculo: Vinculo): void {
    this.isEditando = true;
    this.form.patchValue(vinculo);
    this.showModal = true;
  }

  fecharModal(): void {
    this.showModal = false;
  }

  salvarVinculo(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    const vinculoObj: Vinculo = {
      id: this.isEditando ? val.id : 'v-' + Date.now(),
      bancoId: val.bancoId,
      contaBaseId: val.contaBaseId,
      saldo: +val.saldo,
      dataInicio: val.dataInicio,
      dataFim: val.dataFim || undefined,
      rentabilidade: val.rentabilidade || undefined,
      vencimento: val.vencimento || undefined,
      ativa: val.ativa
    };

    if (this.isEditando) {
      this.vinculoService.atualizarVinculo(vinculoObj);
    } else {
      this.vinculoService.adicionarVinculo(vinculoObj);
    }
    this.fecharModal();
  }

  getBancoNome(bancoId: number): string {
    return this.bancos.find(b => b.id === bancoId)?.nome || bancoId + "-";
  }

  getContaNome(contaId: number): string {
    return this.contasBase.find(c => c.id === contaId)?.descricao || contaId + "-";
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
