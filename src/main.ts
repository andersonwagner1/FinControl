import { bootstrapApplication } from '@angular/platform-browser';
import { configuracao } from './app/configuracao';
import { Aplicacao } from './app/aplicacao';

bootstrapApplication(Aplicacao, configuracao).catch((erro) => console.error(erro));
