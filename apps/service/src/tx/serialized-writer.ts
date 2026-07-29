export class SerializedWriter {
  #tail: Promise<void> = Promise.resolve();
  #pending = 0;

  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    this.#pending += 1;
    const run = this.#tail.then(operation, operation);
    this.#tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run.finally(() => {
      this.#pending -= 1;
    });
  }

  async idle(): Promise<void> {
    await this.#tail;
  }

  get pending(): number {
    return this.#pending;
  }
}
