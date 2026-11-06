import { File, Paths } from "expo-file-system";
import { renderReceiptThumbnail } from "./receipt-thumbnail-render";

/** Full images stay available to the viewer; day cells get bounded previews. */
export async function createReceiptThumbnail(uri: string): Promise<string> {
  const { ImageManipulator, SaveFormat } = await import("expo-image-manipulator");
  const context = ImageManipulator.manipulate(uri);
  return renderReceiptThumbnail({
    render: () => context.renderAsync(), resize: size => { context.resize(size); }, release: () => context.release(),
  }, image => image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true }), output => {
    if (output.startsWith("blob:")) { URL.revokeObjectURL(output); return; }
    if (output !== uri && output.startsWith(Paths.cache.uri.replace(/\/$/, "") + "/")) {
      const file = new File(output); if (file.exists) file.delete();
    }
  });
}
