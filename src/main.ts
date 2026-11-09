<<<<<<< HEAD
import { bootstrapApplication } from '@angular/platform-browser';
import { configuracao } from './app/configuracao';
import { Aplicacao } from './app/aplicacao';

bootstrapApplication(Aplicacao, configuracao).catch((erro) => console.error(erro));
=======
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
>>>>>>> 1d887224bf98157575a37a4f0d18df1c0dd26c86
