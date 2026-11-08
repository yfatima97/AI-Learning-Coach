import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, StepId, WorkflowEvent, WorkflowResult, WorkflowStep } from '../../core/api.service';
import { MarkdownPipe } from '../../core/markdown.pipe';
import { ICONS, IconName } from '../../app';

type Status = 'pending' | 'running' | 'done' | 'error';
interface StepState extends WorkflowStep { status: Status; summary?: string; startedAt?: number; seconds?: number; }

const DEFAULT_STEPS: WorkflowStep[] = [
  { id: 'intake', agent: 'Coach', label: 'Understand your goal' },
  { id: 'roadmap', agent: 'Roadmap Agent', label: 'Build your roadmap' },
  { id: 'project', agent: 'Project Agent', label: 'Design a starter project' },
  { id: 'quiz', agent: 'Quiz Agent', label: 'Write a skills check' },
  { id: 'review', agent: 'Review Agent', label: 'Check the plan fits you' },
  { id: 'progress', agent: 'Progress Tracker', label: 'Update your progress' },
];

const STEP_ICON: Record<StepId, IconName> = {
  intake: 'user', roadmap: 'route', project: 'folder', quiz: 'quiz', review: 'star', progress: 'trend',
};

@Component({
  selector: 'app-path',
  imports: [FormsModule, RouterLink, MarkdownPipe, NgTemplateOutlet],
  templateUrl: './path.html',
  styleUrl: './path.css',
})
export class LearningPath {
  private api = inject(ApiService);
  protected readonly icons = ICONS;
  protected readonly suggestions = ['Teach me AI Engineering', 'I want to become a data analyst', 'Learn web development with Angular', 'Get job-ready in machine learning'];

  protected goal = '';
  protected months: number | null = null;
  protected level = '';

  protected steps = signal<StepState[]>(DEFAULT_STEPS.map((s) => ({ ...s, status: 'pending' })));
  protected running = signal(false);
  protected started = signal(false);
  protected error = signal('');
  protected result = signal<WorkflowResult | null>(null);
  protected roadmap = signal('');
  protected projectBrief = signal('');
  protected open = signal<'roadmap' | 'project' | null>(null);

  protected readonly doneCount = computed(() => this.steps().filter((s) => s.status === 'done').length);
  protected readonly percent = computed(() => Math.round((this.doneCount() / this.steps().length) * 100));

  step = (id: StepId) => this.steps().find((s) => s.id === id)!;
  iconFor = (id: StepId) => ICONS[STEP_ICON[id]];

  async start(goal = this.goal) {
    goal = goal.trim();
    if (!goal || this.running()) return;
    this.goal = goal;
    this.running.set(true);
    this.started.set(true);
    this.error.set('');
    this.result.set(null);
    this.roadmap.set('');
    this.projectBrief.set('');
    this.open.set(null);
    this.steps.set(DEFAULT_STEPS.map((s) => ({ ...s, status: 'pending' })));
    try {
      await this.api.workflow(
        { goal, durationMonths: this.months ?? undefined, level: this.level || undefined },
        (e) => this.onEvent(e),
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.running.set(false);
    }
  }

  private onEvent(e: WorkflowEvent) {
    switch (e.type) {
      case 'steps':
        this.steps.set(e.steps.map((s) => ({ ...s, status: 'pending' })));
        break;
      case 'step': {
        const now = Date.now();
        this.steps.update((all) =>
          all.map((s) =>
            s.id !== e.step
              ? s
              : {
                  ...s,
                  status: e.status,
                  summary: e.summary,
                  startedAt: e.status === 'running' ? now : s.startedAt,
                  seconds: e.status !== 'running' && s.startedAt ? Math.max(1, Math.round((now - s.startedAt) / 1000)) : undefined,
                },
          ),
        );
        if (e.status === 'done' && e.step === 'roadmap') this.roadmap.set(e.data?.roadmap ?? '');
        if (e.status === 'done' && e.step === 'project') this.projectBrief.set(e.data?.project ?? '');
        break;
      }
      case 'complete':
        this.result.set(e.result);
        break;
      case 'error':
        this.error.set(e.message);
        break;
    }
  }

  toggle(panel: 'roadmap' | 'project') {
    this.open.update((p) => (p === panel ? null : panel));
  }
}
