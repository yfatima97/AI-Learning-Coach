import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, Progress, ProjectStatus, errorMessage } from '../../core/api.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);
  protected progress = signal<Progress | null>(null);
  protected error = signal('');
  protected readonly statuses: ProjectStatus[] = ['todo', 'in_progress', 'submitted', 'done'];
  protected readonly statusLabel: Record<ProjectStatus, string> = {
    todo: 'To do', in_progress: 'In progress', submitted: 'Submitted', done: 'Done',
  };

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      this.progress.set(await this.api.progress());
      this.error.set('');
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  async setStatus(id: string, status: string) {
    await this.api.setProjectStatus(id, status as ProjectStatus);
    await this.load();
  }

  scoreClass(p: number | null) {
    if (p === null) return '';
    return p >= 80 ? 'good' : p >= 70 ? 'warn' : 'bad';
  }
}
