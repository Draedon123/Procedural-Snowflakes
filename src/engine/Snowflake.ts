import { BufferWriter } from "../utils/BufferWriter";

class Snowflake {
  public static readonly MAX_RADIUS: number = 256;

  private static readonly CELL_BYTE_LENGTH: number = 5 * 4;
  private static readonly BYTE_LENGTH: number =
    2 * 4 +
    4 *
      Snowflake.MAX_RADIUS *
      Snowflake.MAX_RADIUS *
      Snowflake.CELL_BYTE_LENGTH;

  public radius: number;
  public buffer!: GPUBuffer;
  private state: 0 | 1;
  private device!: GPUDevice;

  constructor(radius: number) {
    this.radius = radius;
    this.state = 0;
  }

  public initialise(device: GPUDevice): this {
    if (this.initialised) {
      return this;
    }

    this.device = device;

    this.buffer = device.createBuffer({
      label: "Snowflake Buffer",
      size: Snowflake.BYTE_LENGTH,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    return this;
  }

  public update(alpha: number, beta: number): void {
    if (!this.initialised) {
      return;
    }

    const bufferWriter = new BufferWriter(Snowflake.BYTE_LENGTH);

    bufferWriter.writeUint32(this.radius);
    bufferWriter.writeUint32(this.state);

    const neighbourWeight = alpha / 12;
    const firstRingDiffusion = beta * neighbourWeight * 3;
    const secondRingDiffusion = beta * neighbourWeight * 5;

    const upperBound = 4 * (this.radius + 1) * (this.radius + 1);
    for (let i = 0; i < upperBound; i++) {
      const q = (i % (2 * this.radius)) - this.radius;
      const r = Math.floor(i / (2 * this.radius)) - this.radius;

      const radius = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
      const isSeedCell = q === 0 && r === 0;
      const isFirstRing = radius === 1;
      const isSecondRing = radius === 2;
      const isInBounds = radius <= this.radius;

      if (!isInBounds) {
        bufferWriter.pad(Snowflake.CELL_BYTE_LENGTH);
        continue;
      }

      const value = isSeedCell ? 1 : beta;
      const receptive = isSeedCell || isFirstRing ? 1 : 0;
      const diffusion = isSeedCell
        ? 0
        : isFirstRing
          ? firstRingDiffusion
          : isSecondRing
            ? secondRingDiffusion
            : beta;

      bufferWriter.writeFloat32(value);
      bufferWriter.writeFloat32(value);
      bufferWriter.writeFloat32(diffusion);
      bufferWriter.writeFloat32(diffusion);
      bufferWriter.writeUint32(receptive);
    }

    this.device.queue.writeBuffer(this.buffer, 0, bufferWriter.buffer);
  }

  public get initialised(): boolean {
    return this.buffer !== undefined;
  }

  public nextState(): void {
    this.state = this.state === 0 ? 1 : 0;

    if (this.initialised) {
      this.device.queue.writeBuffer(
        this.buffer,
        4,
        new Uint32Array([this.state])
      );
    }
  }
}

export { Snowflake };
