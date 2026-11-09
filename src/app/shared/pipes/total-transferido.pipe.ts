import { Pipe, PipeTransform } from '@angular/core';
import { Transferencia } from '../../core/models/transferencia.model';

@Pipe({ name: 'totalTransferido' })
export class TotalTransferidoPipe implements PipeTransform {
  transform(transferencias: Transferencia[]): number {
    return transferencias.reduce((acc, t) => acc + t.valor, 0);
  }
}
