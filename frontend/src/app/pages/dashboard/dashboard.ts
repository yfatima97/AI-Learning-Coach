import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, Progress, ProjectStatus, errorMessage } from '../../core/api.service';
import { ICONS, IconName } from '../../app';

interface NextStep { title: string; detail: string; cta: string; link: string; }

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);
  protected readonly icons = ICONS;
  protected progress = signal<Progress | null>(null);
  protected error = signal('');
  protected readonly statuses: ProjectStatus[] = ['todo', 'in_progress', 'submitted', 'done'];
  protected readonly statusLabel: Record<ProjectStatus, string> = {
    todo: 'To do', in_progress: 'In progress', submitted: 'Submitted', done: 'Done',
  };
  protected readonly ringCircumference = 2 * Math.PI * 34;

  protected readonly greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();
  protected readonly today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  protected readonly actions: { label: string; detail: string; icon: IconName; link: string; tone: string }[] = [
    { label: 'Learning path', detail: 'Start a new goal', icon: 'route', link: '/path', tone: 'indigo' },
    { label: 'Chat with coach', detail: 'Plan your week', icon: 'coach', link: '/chat', tone: 'violet' },
    { label: 'Take a quiz', detail: 'Test a topic', icon: 'quiz', link: '/quiz', tone: 'emerald' },
    { label: 'Review my code', detail: 'Paste code or a repo', icon: 'review', link: '/review', tone: 'amber' },
    { label: 'Ask my notes', detail: 'Search your docs', icon: 'notes', link: '/ask', tone: 'rose' },
    { label: 'Plan & projects', detail: 'Roadmap or project', icon: 'plan', link: '/plan', tone: 'sky' },
  ];

  protected readonly nextStep = computed<NextStep | null>(() => {
    const p = this.progress();
    if (!p) return null;
    if (!p.currentGoal)
      return { title: 'Start a learning path', detail: 'Tell the coach what you want to learn. Its agents build a roadmap, a starter project and a quiz for you.', cta: 'Start now', link: '/path' };
    if (p.quizzes.weakTopics.length)
      return { title: `Strengthen ${p.quizzes.weakTopics[0]}`, detail: 'Your quiz average here is under 70%. Another short quiz will lock it in.', cta: 'Retake quiz', link: '/quiz' };
    if (!p.projects.queue.length)
      return { title: 'Build something', detail: 'A hands-on project is the fastest way to apply what you have learned.', cta: 'Generate a project', link: '/plan' };
    if (p.quizzes.attempts === 0)
      return { title: 'Check your understanding', detail: 'Take a quick quiz so the coach can find your weak spots.', cta: 'Take a quiz', link: '/quiz' };
    return { title: `Keep going on ${p.projects.queue[0].title}`, detail: 'Finish it and submit it for a review.', cta: 'Ask the coach', link: '/chat' };
  });

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

  ringOffset(percent: number | null) {
    return this.ringCircumference * (1 - (percent ?? 0) / 100);
  }
}
