import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Aplicacao } from './aplicacao';

describe('Aplicacao', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Aplicacao],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('deve criar a estrutura principal do aplicativo', () => {
    const fixture = TestBed.createComponent(Aplicacao);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir a marca Finora', async () => {
    const fixture = TestBed.createComponent(Aplicacao);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.brand')?.textContent).toContain('finora');
  });
});
