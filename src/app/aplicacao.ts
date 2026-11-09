import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './aplicacao.html',
  styleUrl: './aplicacao.css',
})
export class Aplicacao {
  protected readonly anoAtual = new Date().getFullYear();
}
