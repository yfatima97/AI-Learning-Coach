import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, AskResult, errorMessage } from '../../core/api.service';
import { MarkdownPipe } from '../../core/markdown.pipe';

@Component({
  selector: 'app-ask',
  imports: [FormsModule, MarkdownPipe],
  templateUrl: './ask.html',
  styleUrl: './ask.css',
})
export class Ask {
  private api = inject(ApiService);
  protected question = '';
  protected result = signal<AskResult | null>(null);
  protected busy = signal(false);
  protected error = signal('');

  async run() {
    this.busy.set(true);
    this.error.set('');
    try {
      this.result.set(await this.api.ask(this.question));
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
