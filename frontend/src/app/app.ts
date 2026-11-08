import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// Outline icons (24x24, stroke). Each is one SVG path string.
export const ICONS = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  coach: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 9h8M8 13h5',
  plan: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 15l2 2 4-4',
  quiz: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  review: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  notes: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  spark: 'M12 3l1.9 5.8L20 10.7l-5.8 1.9L12 18.5l-1.9-5.9L4 10.7l6.1-1.9zM19 3v4M21 5h-4',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 13l2 2 4-4',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  trend: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
} as const;
export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly icons = ICONS;
  protected readonly nav: { path: string; label: string; icon: IconName; exact: boolean }[] = [
    { path: '/', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/chat', label: 'Coach', icon: 'coach', exact: false },
    { path: '/plan', label: 'Plan', icon: 'plan', exact: false },
    { path: '/quiz', label: 'Quiz', icon: 'quiz', exact: false },
    { path: '/review', label: 'Review', icon: 'review', exact: false },
    { path: '/ask', label: 'Ask my notes', icon: 'notes', exact: false },
  ];
}
