class BufferWriter {
  public readonly buffer: ArrayBuffer;
  private readonly dataview: DataView;
  public readonly littleEndian: boolean;
  private offset: number;

  constructor(
    byteLength: number,
    littleEndian: boolean = true,
    offset: number = 0
  ) {
    this.buffer = new ArrayBuffer(byteLength);
    this.dataview = new DataView(this.buffer);
    this.littleEndian = littleEndian;
    this.offset = offset;
  }

  public writeFloat32(float32: number): void {
    this.dataview.setFloat32(this.offset, float32, this.littleEndian);
    this.offset += 4;
  }

  public writeUint32(uint32: number): void {
    this.dataview.setUint32(this.offset, uint32, this.littleEndian);
    this.offset += 4;
  }

  public pad(bytes: number): void {
    this.offset += bytes;
  }
}

export { BufferWriter };
