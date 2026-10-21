export type ThumbnailImage = { width: number; height: number; release(): void };
export async function renderReceiptThumbnail<T extends ThumbnailImage>(context: {
  render(): Promise<T>; resize(size: { width: number; height: number }): void; release(): void;
}, save: (image: T) => Promise<{ uri: string; base64?: string }>, discard: (uri: string) => void): Promise<string> {
  void context; void save; void discard;
  throw new Error("Thumbnail render not implemented");
}
