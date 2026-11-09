import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ContaBaseService } from '../../core/services/conta-base.service';
import { ContaBase } from '../../core/models/conta-base.model';
import { TipoConta, TIPOS_CONTA } from '../../core/models/conta.model';

@Component({
  selector: 'app-contas-base',
  templateUrl: './contas-base.component.html',
  styleUrls: ['./contas-base.component.scss']
})
export class ContasBaseComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  contasBase: ContaBase[] = [];
  showModal = false;
  form!: FormGroup;
  isEditando = false;
  tiposConta = TIPOS_CONTA;
  tiposDisponiveis = Object.keys(TIPOS_CONTA) as TipoConta[];

  constructor(
    private contaBaseService: ContaBaseService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.subs.add(
      this.contaBaseService.getContasBase().subscribe(c => { 
        this.contasBase = c; 
      })
    );
  }

  initForm(): void {
    this.form = this.fb.group({
      id: [''],
      descricao: ['', Validators.required],
      tipo: ['CC', Validators.required]
    });
  }

  abrirModalParaAdicionar(): void {
    this.isEditando = false;
    this.form.reset({ tipo: 'CC' });
    this.showModal = true;
  }

  abrirModalParaEditar(conta: ContaBase): void {
    this.isEditando = true;
    this.form.patchValue(conta);
    this.showModal = true;
  }

  fecharModal(): void {
    this.showModal = false;
  }

  salvarContaBase(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    const contaObj: ContaBase = {
      id: this.isEditando ? val.id : 'cb-' + Date.now(),
      descricao: val.descricao,
      tipo: val.tipo
    };

    if (this.isEditando) {
      this.contaBaseService.atualizarContaBase(contaObj);
    } else {
      this.contaBaseService.adicionarContaBase(contaObj);
    }
    this.fecharModal();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
