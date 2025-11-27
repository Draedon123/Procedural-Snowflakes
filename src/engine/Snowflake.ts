import { BufferWriter } from "../utils/BufferWriter";
import { clamp } from "../utils/clamp";

class Snowflake {
  public static readonly MAX_RADIUS: number = 256;

  private static readonly CELL_BYTE_LENGTH: number = 5 * 4;
  private static readonly BYTE_LENGTH: number =
    2 * 4 +
    4 *
      Snowflake.MAX_RADIUS *
      Snowflake.MAX_RADIUS *
      Snowflake.CELL_BYTE_LENGTH;

  private state: 0 | 1;
  private _radius!: number;
  private _backgroundLevel!: number;
  private device!: GPUDevice;
  public buffer!: GPUBuffer;

  constructor(radius: number) {
    this.radius = radius;
    this.backgroundLevel = 0;
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

    this.update();

    return this;
  }

  private update(): void {
    if (!this.initialised) {
      return;
    }

    const bufferWriter = new BufferWriter(Snowflake.BYTE_LENGTH);
    bufferWriter.writeUint32(this.radius);
    bufferWriter.writeUint32(this.state);

    for (let i = 0; i < 4 * this.radius * this.radius; i++) {
      const q = (i % (2 * this.radius)) - this.radius;
      const r = Math.floor(i / (2 * this.radius)) - this.radius;

      const value = q === 0 && r === 0 ? 1 : this.backgroundLevel;

      bufferWriter.writeFloat32(value);
      bufferWriter.writeFloat32(value);
      bufferWriter.writeFloat32(0);
      bufferWriter.writeFloat32(0);
      bufferWriter.writeUint32(0);
    }

    this.device.queue.writeBuffer(this.buffer, 0, bufferWriter.buffer);
  }

  public reset(): void {
    this.update();
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

  public get radius(): number {
    return this._radius;
  }

  public set radius(radius: number) {
    this._radius = clamp(radius, 1, Snowflake.MAX_RADIUS);
    this.update();
  }

  public get backgroundLevel(): number {
    return this._backgroundLevel;
  }

  // no checks
  public set backgroundLevel(backgroundLevel: number) {
    this._backgroundLevel = backgroundLevel;
    this.update();
  }
}

export { Snowflake };
