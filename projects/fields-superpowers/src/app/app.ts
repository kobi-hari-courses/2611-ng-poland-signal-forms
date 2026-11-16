import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AiDownloadDialog } from './components/ai-download-dialog/ai-download-dialog';
import { Navbar } from './components/navbar/navbar';
import { NotificationsHost } from './components/notifications-host/notifications-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, NotificationsHost, AiDownloadDialog],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
