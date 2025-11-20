import cliProgress from 'cli-progress';

export class ProgressTracker {
  private bar: cliProgress.SingleBar | null = null;
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  start(total: number, message: string = 'Processing'): void {
    if (!this.enabled) {
      return;
    }

    this.bar = new cliProgress.SingleBar({
      format: `${message} [{bar}] {percentage}% | {value}/{total} directories`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    this.bar.start(total, 0);
  }

  update(current: number, message?: string): void {
    if (!this.enabled || !this.bar) {
      return;
    }

    this.bar.update(current);
  }

  stop(): void {
    if (!this.enabled || !this.bar) {
      return;
    }

    this.bar.stop();
    this.bar = null;
  }

  log(message: string): void {
    if (this.bar) {
      // Stop bar temporarily to log
      this.bar.stop();
      console.log(message);
      // Don't restart - let the caller handle that
    } else {
      console.log(message);
    }
  }
}
