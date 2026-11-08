import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { MarkdownPipe } from '../../core/markdown.pipe';

@Component({
  selector: 'app-plan',
  imports: [FormsModule, MarkdownPipe, RouterLink],
  templateUrl: './plan.html',
  styleUrl: './plan.css',
})
export class Plan {
  private api = inject(ApiService);
  protected skill = 'AI Engineering';
  protected months = 12;
  protected level = 'beginner';
  protected learned = '';
  protected output = signal('');
  protected kind = signal<'roadmap' | 'project' | ''>('');
  protected busy = signal(false);
  protected error = signal('');

  async roadmap() {
    await this.run('roadmap', async () => (await this.api.roadmap(this.skill, this.months, this.level)).roadmap);
  }

  async project() {
    await this.run('project', async () => (await this.api.project(this.learned, this.level)).project);
  }

  private async run(kind: 'roadmap' | 'project', fn: () => Promise<string>) {
    this.busy.set(true);
    this.error.set('');
    this.kind.set(kind);
    this.output.set('');
    try {
      this.output.set(await fn());
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
