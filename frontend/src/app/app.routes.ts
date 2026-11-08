import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Dashboard · AI Learning Coach', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard) },
  { path: 'chat', title: 'Coach · AI Learning Coach', loadComponent: () => import('./pages/chat/chat').then((m) => m.Chat) },
  { path: 'quiz', title: 'Quiz · AI Learning Coach', loadComponent: () => import('./pages/quiz/quiz').then((m) => m.QuizPage) },
  { path: 'review', title: 'Review · AI Learning Coach', loadComponent: () => import('./pages/review/review').then((m) => m.ReviewPage) },
  { path: 'ask', title: 'Ask my notes · AI Learning Coach', loadComponent: () => import('./pages/ask/ask').then((m) => m.Ask) },
  { path: 'plan', title: 'Plan · AI Learning Coach', loadComponent: () => import('./pages/plan/plan').then((m) => m.Plan) },
  { path: '**', redirectTo: '' },
];
