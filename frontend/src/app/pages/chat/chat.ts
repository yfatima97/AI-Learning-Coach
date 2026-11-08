import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, ChatMessage, errorMessage } from '../../core/api.service';
import { MarkdownPipe } from '../../core/markdown.pipe';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, MarkdownPipe],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {
  private api = inject(ApiService);
  private log = viewChild<ElementRef<HTMLElement>>('log');

  protected messages = signal<ChatMessage[]>([]);
  protected draft = '';
  protected busy = signal(false);
  protected error = signal('');
  protected readonly suggestions = [
    'I want to become an AI Engineer in 12 months. Where do I start?',
    'Look at my progress and tell me what to focus on next.',
    'I just learned Python basics. Give me a project and a short quiz.',
    'Schedule a 2-week study plan for Python, Mon/Wed/Fri at 7pm.',
    'Explain RAG vs fine-tuning using my notes.',
  ];

  async send(text = this.draft) {
    const content = text.trim();
    if (!content || this.busy()) return;
    this.draft = '';
    this.error.set('');
    this.messages.update((m) => [...m, { role: 'user', content }]);
    this.busy.set(true);
    this.scroll();
    try {
      const { reply } = await this.api.chat(this.messages());
      this.messages.update((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
      this.scroll();
    }
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  private scroll() {
    setTimeout(() => this.log()?.nativeElement.scrollTo({ top: 1e9, behavior: 'smooth' }));
  }
}
