import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Review, errorMessage } from '../../core/api.service';

@Component({
  selector: 'app-review',
  imports: [FormsModule],
  templateUrl: './review.html',
  styleUrl: './review.css',
})
export class ReviewPage {
  private api = inject(ApiService);
  protected mode = signal<'code' | 'github'>('code');
  protected code = '';
  protected context = '';
  protected url = '';
  protected result = signal<Review | null>(null);
  protected busy = signal(false);
  protected error = signal('');

  async run() {
    this.busy.set(true);
    this.error.set('');
    this.result.set(null);
    try {
      this.result.set(
        this.mode() === 'code' ? await this.api.review(this.code, this.context || undefined) : await this.api.reviewRepo(this.url),
      );
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  ratingClass(r: number) {
    return r >= 8 ? 'good' : r >= 6 ? 'warn' : 'bad';
  }
}
