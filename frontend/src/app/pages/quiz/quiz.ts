import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Quiz, QuizResult, errorMessage } from '../../core/api.service';

@Component({
  selector: 'app-quiz',
  imports: [FormsModule],
  templateUrl: './quiz.html',
  styleUrl: './quiz.css',
})
export class QuizPage {
  private api = inject(ApiService);
  protected topic = 'Python';
  protected difficulty = 'beginner';
  protected count = 5;
  protected quiz = signal<Quiz | null>(null);
  protected answers = signal<(number | null)[]>([]);
  protected result = signal<QuizResult | null>(null);
  protected busy = signal(false);
  protected error = signal('');

  /** Options come back as "A. text"; show the letter separately. */
  protected label = (opt: string) => opt.replace(/^[A-D][.)]\s*/, '');
  protected letter = (i: number) => 'ABCD'[i] ?? String(i + 1);
  protected allAnswered = () => this.answers().length > 0 && this.answers().every((a) => a !== null);

  async generate() {
    this.busy.set(true);
    this.error.set('');
    this.result.set(null);
    try {
      const q = await this.api.quiz(this.topic, this.difficulty, this.count);
      this.quiz.set(q);
      this.answers.set(q.questions.map(() => null));
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  pick(q: number, option: number) {
    if (this.result()) return;
    this.answers.update((a) => a.map((v, i) => (i === q ? option : v)));
  }

  async submit() {
    const quiz = this.quiz();
    if (!quiz) return;
    this.busy.set(true);
    try {
      this.result.set(await this.api.submitQuiz(quiz.quizId, this.answers() as number[]));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  optionState(q: number, o: number) {
    const r = this.result()?.results[q];
    if (!r) return this.answers()[q] === o ? 'selected' : '';
    if (o === r.correctIndex) return 'correct';
    if (o === r.yourAnswer) return 'wrong';
    return '';
  }
}
