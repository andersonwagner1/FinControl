import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, EMPTY, Observable, expand, reduce, throwError, tap } from 'rxjs';
import { Lancamento } from '../models/lancamento.model';
import { ContaService } from './conta.service';
import { VinculoService } from './vinculo.service';

export interface PaginaLancamentos {
  content: Lancamento[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class LancamentoService {
  private readonly apiUrl = 'http://localhost:8080/api/lancamentos';
  private readonly apiBaseUrl = 'http://localhost:8080/api';
  private lancamentos$ = new BehaviorSubject<Lancamento[]>([]);

  constructor(private vinculoService: VinculoService,  private contaService: ContaService, private http: HttpClient) {
    
  }


  getListarLancamento(){
    const { dataInicio, dataFim } = this.periodoMesVigente();
    this.buscarPagina(dataInicio, dataFim).subscribe({ error: () => undefined });
  }




  getLancamentos() {
    return this.lancamentos$.asObservable();
  }

    buscarLancamentosFinal(dataInicio: string,contaId?: number ){
      let params = new HttpParams()
      .set('dataInicial', dataInicio)
      .set('sort', 'data,desc');

      if (contaId) {
        params = params.set('contaId', contaId);
      }
      return this.http.get<any[]>(`${this.apiUrl}/saldo`, { params });
    }

  atualizarMovimentacaoFinal(bancoContaId: number, dataInicial: string): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiBaseUrl}/movimentacao-final/atualizar/${bancoContaId}/${dataInicial}`,
      null
    );
  }

  atualizarSaldo(bancoContaId: number, dataInicial: string, saldoFinal: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiBaseUrl}/movimentacao-final/atualizar-saldo/${bancoContaId}/${dataInicial}`,
      saldoFinal
    );
  }

  buscarPagina(dataInicio: string, dataFim: string, page = 0, size = 50, contaId?: number): Observable<Lancamento[]> {
    if (!dataInicio || !dataFim) {
      throw new Error('dataInicio e dataFim são obrigatórios para consultar lançamentos.');
    }

    let params = new HttpParams()
      .set('dataInicial', dataInicio)
      .set('dataFinal', dataFim)
      .set('page', page)
      .set('size', size)
      .set('sort', 'data,desc');

    if (contaId) {
      params = params.set('contaId', contaId);
    }
   
    return this.http.get<Lancamento[]>(`${this.apiUrl}/lista`, { params }).pipe(
      tap(resultado => {

        this.lancamentos$.next(resultado);

      })
    );
  }

  buscarPeriodoDashboard(dataInicio: string, dataFim: string): Observable<Lancamento[]> {
    const params = new HttpParams()
      .set('dataInicial', dataInicio)
      .set('dataFinal', dataFim)
      .set('page', 0)
      .set('size', 500);

    return this.http.get<Lancamento[]>(`${this.apiUrl}/lista`, { params });
  }

  buscarPeriodoCompleto(dataInicio: string, dataFim: string, contaId?: number): Observable<Lancamento[]> {
    const tamanhoPagina = 500;
    const buscarPagina = (pagina: number): Observable<Lancamento[]> => {
      let params = new HttpParams()
        .set('dataInicial', dataInicio)
        .set('dataFinal', dataFim)
        .set('page', pagina)
        .set('size', tamanhoPagina)
        .set('sort', 'data,desc');

      if (contaId) {
        params = params.set('contaId', contaId);
      }

      return this.http.get<Lancamento[]>(`${this.apiUrl}/lista`, { params });
    };

    return buscarPagina(0).pipe(
      expand((lancamentos, pagina) => lancamentos.length < tamanhoPagina ? EMPTY : buscarPagina(pagina + 1)),
      reduce((todos, lancamentos) => todos.concat(lancamentos), [] as Lancamento[])
    );
  }

  buscarSaldoCompetencia(contaId: number, dataCompetencia: string): Observable<{ saldoFinal: number | null }> {
    const params = new HttpParams()
      .set('contaId', contaId)
      .set('dataInicial', dataCompetencia);

    return this.http.get<{ saldoFinal: number | null }>(`${this.apiUrl}/saldo`, { params });
  }

  periodoMesVigente(dataReferencia = new Date()): { dataInicio: string; dataFim: string } {
    const ano = dataReferencia.getFullYear();
    const mes = dataReferencia.getMonth();
    return {
      dataInicio: this.formatarData(new Date(ano, mes, 1)),
      dataFim: this.formatarData(new Date(ano, mes + 1, 0))
    };
  }

  getLancamentosSnapshot(): Lancamento[] {
    return this.lancamentos$.getValue();
  }

  getLancamentosByConta(bancoContaId: number): Lancamento[] {
    return this.lancamentos$.getValue().filter(l => l.bancoContaId === bancoContaId);
  }

  adicionarLancamento(lancamento: Omit<Lancamento, 'id' | 'saldoApos'>): Observable<Lancamento> {
    const conta = this.vinculoService.getVinculoById(lancamento.bancoContaId);
    if (!conta) return throwError(() => new Error('Conta de origem não encontrada.'));

    const novoSaldo = lancamento.tipo === 'CREDITO'
      ? conta.saldo + lancamento.valor
      : conta.saldo - lancamento.valor;

    const novoLancamento: Lancamento = {
      ...lancamento,
      
      saldo: novoSaldo,
    };

    return this.http.post<Lancamento>(this.apiUrl, novoLancamento).pipe(
      tap(salvo => {
        this.lancamentos$.next([salvo, ...this.lancamentos$.getValue()]);
        this.contaService.atualizarSaldo(lancamento.bancoContaId, novoSaldo);
      })
    );
  }

  atualizarLancamento(lancamento: Lancamento): Observable<Lancamento> {
    const oldLancamento = this.getLancamentosSnapshot().find(l => l.id === lancamento.id);
    if (!oldLancamento) return throwError(() => new Error('Lançamento não encontrado.'));

    const conta = this.contaService.getContaById(lancamento.bancoContaId);
    if (!conta) return throwError(() => new Error('Conta do lançamento não encontrada.'));

    let saldoTemp = oldLancamento.tipo === 'CREDITO' ? conta!.saldo - oldLancamento.valor : conta!.saldo + oldLancamento.valor;
    let novoSaldo = lancamento.tipo === 'CREDITO' ? saldoTemp + lancamento.valor : saldoTemp - lancamento.valor;

    const atualizado = { ...lancamento, saldoApos: novoSaldo };
    const lancamentos = this.getLancamentosSnapshot().map(l => l.id === lancamento.id ? atualizado : l);
    return this.http.put<Lancamento>(`${this.apiUrl}/${lancamento.id}`, atualizado).pipe(
      tap(salvo => {
        this.lancamentos$.next(lancamentos.map(item => item.id === salvo.id ? salvo : item));
        this.contaService.atualizarSaldo(lancamento.bancoContaId, novoSaldo);
      })
    );
  }

  removerLancamento(id?: number): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({ next: () => this.lancamentos$.next(this.getLancamentosSnapshot().filter(l => l.id !== id)) });
  }

  getTotalCreditoMes(mes: number, ano: number): number {
    return this.lancamentos$.getValue()
      .filter(l => {
        const d = new Date(l.data);
        return l.tipo === 'CREDITO' && d.getMonth() + 1 === mes && d.getFullYear() === ano;
      })
      .reduce((acc, l) => acc + l.valor, 0);
  }

  getTotalDebitoMes(mes: number, ano: number): number {
    return this.lancamentos$.getValue()
      .filter(l => {
        const d = new Date(l.data);
        return l.tipo === 'DEBITO' && d.getMonth() + 1 === mes && d.getFullYear() === ano;
      })
      .reduce((acc, l) => acc + l.valor, 0);
  }

  getTransferencias(): Observable<any[]> {
    return new Observable<any[]>(subscriber => {
      this.lancamentos$.subscribe(lancamentos => {
        const transferenciasMap = new Map<number, any>();
        for (const l of lancamentos) {
          if (l.transferenciaId) {
            if (!transferenciasMap.has(l.transferenciaId)) {
              transferenciasMap.set(l.transferenciaId, {
                id: l.transferenciaId,
                valor: l.valor,
                data: l.data,
                observacao: l.observacao
              });
            }
            if (l.tipo === 'DEBITO') {
              transferenciasMap.get(l.transferenciaId).contaOrigemId = l.bancoContaId;
            } else {
              transferenciasMap.get(l.transferenciaId).contaDestinoId = l.bancoContaId;
            }
          }
        }
        subscriber.next(Array.from(transferenciasMap.values()));
      });
    });
  }

  realizarTransferencia(transferencia: any): Observable<any> {
   // const origem = this.contaService.getContaById(transferencia.contaOrigemId);
   // const destino = this.contaService.getContaById(transferencia.contaDestinoId);

    //if (!origem || !destino) return false;
    //if (origem.saldo < transferencia.valor) return false;


    return this.http.post<any>('http://localhost:8080/api/transferencias',  transferencia ).pipe(
      tap(() => {
        
        //const valor = transferencia.valor;
        //const debito: Lancamento = {  bancoContaId: transferencia.contaOrigemId, tipo: 'DEBITO', observacao: transferencia.observacao, categoria: 'Transferência Enviada', valor, data: transferencia.data,  transferenciaId: salvo.id };
        //const credito: Lancamento = {  bancoContaId: transferencia.contaDestinoId, tipo: 'CREDITO', observacao: transferencia.observacao, categoria: 'Transferência Recebida', valor, data: transferencia.data, transferenciaId: salvo.id };
       // this.lancamentos$.next([debito, credito, ...this.getLancamentosSnapshot()]);
        //this.contaService.atualizarSaldo(transferencia.contaOrigemId, transferencia.saldoOrigem - valor);
        //this.contaService.atualizarSaldo(transferencia.contaDestinoId, transferencia.saldoDestino + valor);
      })
    );
  }

  private formatarData(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }


  registrarTransferencia(): Observable<any[]> {   
   return  this.http.get<Lancamento[]>('http://localhost:8080/api/lancamentos/registrar')
  }

}
