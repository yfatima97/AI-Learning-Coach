import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly nav = [
    { path: '/', label: 'Dashboard', icon: '◧', exact: true },
    { path: '/chat', label: 'Coach', icon: '✦', exact: false },
    { path: '/plan', label: 'Plan', icon: '◷', exact: false },
    { path: '/quiz', label: 'Quiz', icon: '✓', exact: false },
    { path: '/review', label: 'Review', icon: '★', exact: false },
    { path: '/ask', label: 'Ask my notes', icon: '❝', exact: false },
  ];
}
