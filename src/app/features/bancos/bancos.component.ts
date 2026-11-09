import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BancoService } from '../../core/services/banco.service';
import { Banco } from '../../core/models/banco.model';

@Component({
  selector: 'app-bancos',
  templateUrl: './bancos.component.html',
  styleUrls: ['./bancos.component.scss']
})
export class BancosComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  bancos: Banco[] = [];
  showModal = false;
  form!: FormGroup;
  isEditando = false;
  mensagemErro = '';

  constructor(
    private bancoService: BancoService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.subs.add(
      this.bancoService.getBancos().subscribe(b => { this.bancos = b; })
    );
    this.subs.add(
      this.bancoService.listarBancos().subscribe({ error: () => {
        this.mensagemErro = 'Não foi possível carregar os bancos.';
      }})
    );
  }

  initForm(): void {
    this.form = this.fb.group({
      id: [''],
      nome: ['', Validators.required],
      logo: ['', Validators.required],
      cor: ['#000000', Validators.required],
      corSecundaria: ['#444444', Validators.required],
    });
  }

  abrirModalParaAdicionar(): void {
    this.isEditando = false;
    this.mensagemErro = '';
    this.form.reset({ cor: '#000000', corSecundaria: '#444444' });
    this.showModal = true;
  }

  abrirModalParaEditar(banco: Banco): void {
    this.isEditando = true;
    this.mensagemErro = '';
    this.showModal = true;
    this.subs.add(
      this.bancoService.consultarBanco(banco.id).subscribe({
        next: bancoConsultado => this.form.patchValue(bancoConsultado),
        error: () => {
          this.mensagemErro = 'Não foi possível consultar o banco.';
          this.showModal = false;
        }
      })
    );
  }

  fecharModal(): void {
    this.showModal = false;
  }

  salvarBanco(): void {
    if (this.form.invalid) return;
    this.mensagemErro = '';
    const val = this.form.value;
    const bancoObj: Banco = {
      id: this.isEditando ? val.id : val.nome.toLowerCase().replace(/\s+/g, '-'),
      nome: val.nome,
      logo: val.logo,
      cor: val.cor,
      corSecundaria: val.corSecundaria,
    };

    const requisicao = this.isEditando
      ? this.bancoService.atualizarBanco(bancoObj)
      : this.bancoService.adicionarBanco(bancoObj);

    this.subs.add(
      requisicao.subscribe({
        next: () => this.fecharModal(),
        error: () => {
          this.mensagemErro = 'Não foi possível salvar o banco.';
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
