import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
import {
  LinhaTabelaMensal,
  montarFluxoSankey,
  MovimentacaoFinanceira,
} from '../../modelos/movimentacao-financeira';

@Component({
  selector: 'app-sankey-financeiro',
  imports: [CurrencyPipe, NgxEchartsModule],
  templateUrl: './sankey-financeiro.html',
  styleUrl: './sankey-financeiro.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponenteSankeyFinanceiro {
  readonly movimentacoes = input<readonly MovimentacaoFinanceira[]>([]);
  readonly linhasMensais = input<readonly LinhaTabelaMensal[]>([]);
  readonly saldoAnterior = input(0);
  readonly temaEscuro = input(false);
  protected readonly anoFiltro = signal<number | null>(new Date().getFullYear());

  protected readonly fluxo = computed(() => montarFluxoSankey(this.movimentacoes(), this.saldoAnterior()));
  protected readonly linhasMensaisFiltradas = computed(() => {
    const ano = this.anoFiltro();
    return this.linhasMensais().filter((linha) => ano === null || linha.ano === ano);
  });
  protected readonly opcoes = computed<EChartsOption>(() => {
    const fluxo = this.fluxo();
    const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const rotulos = new Map(fluxo.nodes.map((no) => [no.name, no.label]));

    return {
      aria: { enabled: true, description: 'Fluxo das entradas, saídas e saldo da conta corrente no período.' },
      tooltip: {
        trigger: 'item',
        formatter: (parametros) => {
          if (Array.isArray(parametros)) {
            return '';
          }
          const item = parametros as {
            dataType?: string;
            name?: string;
            value?: number;
            data?: { source?: string; target?: string; value?: number };
          };
          if (item.dataType === 'edge' && item.data) {
            const origem = rotulos.get(item.data.source ?? '') ?? item.data.source ?? '';
            const destino = rotulos.get(item.data.target ?? '') ?? item.data.target ?? '';
            return `${origem} → ${destino}<br/>${moeda.format(item.data.value ?? 0)}`;
          }
          return `${rotulos.get(item.name ?? '') ?? item.name ?? 'Movimentação'}<br/>${moeda.format(item.value ?? 0)}`;
        },
      },
      series: [{
        type: 'sankey',
        orient: 'horizontal',
        data: fluxo.nodes.map(({ name }) => ({ name })),
        links: fluxo.links,
        nodeAlign: 'justify',
        nodeGap: 18,
        nodeWidth: 18,
        layoutIterations: 32,
        emphasis: { focus: 'adjacency' },
        label: {
          color: this.temaEscuro() ? '#e6edf0' : '#33434c',
          fontSize: 12,
          formatter: (parametro) => rotulos.get(parametro.name ?? '') ?? parametro.name ?? '',
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
          opacity: 0.48,
        },
        itemStyle: {
          borderWidth: 0,
          borderRadius: 4,
        },
        levels: [
          { depth: 0, itemStyle: { color: '#39a985' } },
          { depth: 1, itemStyle: { color: '#518fc3' } },
          { depth: 2, itemStyle: { color: '#df9068' } },
          { depth: 3, itemStyle: { color: '#8b78bc' } },
        ],
      }],
    };
  });

  protected readonly valorDoDeficit = computed(() => this.fluxo().deficit);

  protected alterarAno(evento: Event): void {
    const campo = evento.currentTarget;
    if (!(campo instanceof HTMLInputElement)) {
      return;
    }

    const valor = campo.value.trim();
    if (!valor) {
      this.anoFiltro.set(null);
      return;
    }

    const ano = Number(valor);
    if (Number.isInteger(ano) && ano >= 1 && ano <= 9999) {
      this.anoFiltro.set(ano);
    }
  }

  protected nomeCompetencia(linha: LinhaTabelaMensal): string {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      new Date(linha.ano, linha.mes - 1, 1, 12),
    );
  }
}
