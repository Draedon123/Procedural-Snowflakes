class RollingAverage {
  private readonly samples: number[];
  private readonly maxSamples: number;
  constructor(maxSamples: number) {
    this.samples = [];
    this.maxSamples = maxSamples;
  }

  public get average(): number {
    return this.samples.length === 0
      ? 0
      : this.samples.reduce((total, current) => total + current, 0) /
          this.samples.length;
  }

  public addSample(value: number): void {
    if (this.samples.length === this.maxSamples) {
      this.samples.shift();
    }

    this.samples.push(value);
  }

  public reset(): void {
    this.samples.splice(0, this.samples.length);
  }
}

export { RollingAverage };
