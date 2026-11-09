import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { Conta, TipoConta } from '../models/conta.model';
import { VinculoService } from './vinculo.service';
import { ContaBaseService } from './conta-base.service';

@Injectable({ providedIn: 'root' })
export class ContaService {
  constructor(
    private vinculoService: VinculoService,
    private contaBaseService: ContaBaseService
  ) {}

  getContas(): Observable<Conta[]> {
    return combineLatest([
      this.vinculoService.getVinculos(),
      this.contaBaseService.getContasBase()
    ]).pipe(
      map(([vinculos, contasBase]) => {
        return vinculos.map(v => {
          const cb = contasBase.find(c => c.id === v.contaBaseId);
          return {
            id: v.id,
            bancoId: v.bancoId,
            tipo: cb?.tipo || 'CC',
            descricao: v.descricao || cb?.descricao || 'Conta Desconhecida',
            saldo: v.saldo,
            ativa: v.ativa,
            rentabilidade: v.rentabilidade,
            vencimento: v.vencimento,
            limite: v.limite,
            diaFechamento: v.diaFechamento,
            diaVencimento: v.diaVencimento,
            dataAbertura: v.dataInicio,
            dataFechamento: v.dataFim
          } as Conta;
        });
      })
    );
  }

  getContasSnapshot(): Conta[] {
    const vinculos = this.vinculoService.getVinculosSnapshot();
    const contasBase = this.contaBaseService.getContasBaseSnapshot();
    return vinculos.map(v => {
      const cb = contasBase.find(c => c.id === v.contaBaseId);
      return {
        id: v.id,
        bancoId: v.bancoId,
        tipo: cb?.tipo || 'CC',
        descricao: v.descricao || cb?.descricao || 'Conta Desconhecida',
        saldo: v.saldo,
        ativa: v.ativa,
        rentabilidade: v.rentabilidade,
        vencimento: v.vencimento,
        limite: v.limite,
        diaFechamento: v.diaFechamento,
        diaVencimento: v.diaVencimento,
        dataAbertura: v.dataInicio,
        dataFechamento: v.dataFim
      } as Conta;
    });
  }

  getContaById(id: number): Conta | undefined {
    return this.getContasSnapshot().find(c => c.id === id);
  }

  getContasByBanco(bancoId: number): Conta[] {
    return this.getContasSnapshot().filter(c => c.bancoId === bancoId);
  }

  getContasByTipo(tipo: TipoConta): Conta[] {
    return this.getContasSnapshot().filter(c => c.tipo === tipo);
  }

  atualizarSaldo(contaId: number, novoSaldo: number): void {
    // contaId é na verdade o vinculoId nesta refatoração
    this.vinculoService.atualizarSaldo(contaId, novoSaldo);
  }

  adicionarConta(conta: Conta): void {
    // Este método agora só cria um vínculo. A conta base deve existir ou criamos uma dummy.
    // Como a UI antiga não sabe de ContaBase, criamos um vínculo com a contaBaseId default do tipo.
    const contasBase = this.contaBaseService.getContasBaseSnapshot();
    let cb = contasBase.find(c => c.tipo === conta.tipo);
    if (!cb) {
       cb = contasBase[0];
    }

    this.vinculoService.adicionarVinculo({
      id: conta.id!,
      bancoId: conta.bancoId!,
      contaBaseId: cb.id,
      saldo: conta.saldo,
      dataInicio: conta.dataAbertura,
      rentabilidade: conta.rentabilidade,
      vencimento: conta.vencimento,
      descricao: conta.descricao,
      limite: conta.limite,
      diaFechamento: conta.diaFechamento,
      diaVencimento: conta.diaVencimento,
      ativa: conta.ativa
    });
  }

  atualizarConta(conta: Conta): void {
    const vinculo = this.vinculoService.getVinculoById(conta.id!);
    if (!vinculo) return;

    this.vinculoService.atualizarVinculo({
      ...vinculo,
      bancoId: conta.bancoId!,
      descricao: conta.descricao,
      saldo: conta.saldo,
      dataInicio: conta.dataAbertura,
      dataFim: conta.dataFechamento,
      limite: conta.limite,
      diaFechamento: conta.diaFechamento,
      diaVencimento: conta.diaVencimento,
      ativa: conta.ativa
    });
  }

  getSaldoTotalBancario(): number {
    return this.getContasSnapshot()
      .filter(c => c.tipo === 'CC' || c.tipo === 'CP')
      .reduce((acc, c) => acc + c.saldo, 0);
  }

  getSaldoTotalInvestimentos(): number {
    return this.getContasSnapshot()
      .filter(c => c.tipo !== 'CC' && c.tipo !== 'CP')
      .reduce((acc, c) => acc + c.saldo, 0);
  }
}
