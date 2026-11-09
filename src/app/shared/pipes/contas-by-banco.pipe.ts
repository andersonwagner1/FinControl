import { Pipe, PipeTransform } from '@angular/core';
import { Conta } from '../../core/models/conta.model';

@Pipe({ name: 'contasByBanco', pure: false })
export class ContasByBancoPipe implements PipeTransform {
  transform(contas: Conta[], bancoId: number): Conta[] {
    return contas.filter(c => c.bancoId === bancoId);
  }
}
