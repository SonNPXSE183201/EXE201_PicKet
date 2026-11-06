import { useState } from "react";
import { Button, View } from "react-native";
import { requireNativeModule, requireOptionalNativeModule } from "expo";
import { Directory, File, Paths } from "expo-file-system";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { canAttachParsedReceipt, canAttachReceipt } from "@/core/ocr/receipt-eligibility";
import { scanReceiptSession, type OcrSample, type ReceiptOcrSession } from "@/core/ocr/receipt-scan-session";
import { qaEnabled, runCorpus, validManifest } from "@/core/qa/ocr-corpus";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

type Native = {
  open(uri: string): ReturnType<ReceiptOcrSession["open"]>;
  direction(id: string, timeout: number): Promise<OcrSample>;
  inspect(id: string, timeout: number): Promise<OcrSample>;
  select(id: string, angle: number): ReturnType<ReceiptOcrSession["select"]>;
  crop(id: string, x: number, y: number, w: number, h: number, timeout: number): Promise<OcrSample>;
  close(id: string): Promise<void>;
};

export default function QaOcrCorpus() {
  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const app = requireOptionalNativeModule<{ applicationId: string; nativeApplicationVersion: string; nativeBuildVersion: string }>("ExpoApplication");
  const enabled = qaEnabled(process.env.EXPO_PUBLIC_QA_OCR_CORPUS === "true", app?.applicationId, Paths.document.uri);
  async function run() {
    if (!enabled || running) return;
    setRunning(true);
    try {
      const root = new Directory(Paths.document, "qa-ocr");
      const input = new Directory(root, "inputs");
      const output = new Directory(root, "results");
      output.create({ intermediates: true, idempotent: true });
      const entries: unknown = JSON.parse(await new File(root, "manifest.json").text());
      if (!validManifest(entries)) throw new Error("Invalid 40-file manifest");
      const module = requireNativeModule<Native>("PicketReceiptOcr");
      let completed = 0;
      await runCorpus(entries, async entry => {
        const file = new File(input, entry.file);
        const hash = bytesToHex(sha256(await file.bytes()));
        if (hash !== entry.sha256) throw new Error(`SHA256 mismatch: ${hash}`);
        const samples: { operation: string; args: unknown[]; sample: OcrSample }[] = [];
        const sample = async (operation: string, args: unknown[], fn: () => Promise<OcrSample>) => {
          const result = await fn(); samples.push({ operation, args, sample: result }); return result;
        };
        const native: ReceiptOcrSession = {
          open: uri => module.open(uri),
          direction: (id, timeout) => sample("direction", [timeout], () => module.direction(id, timeout)),
          inspect: (id, timeout) => sample("inspect", [timeout], () => module.inspect(id, timeout)),
          select: (id, angle) => module.select(id, angle),
          crop: (id, region, timeout) => sample("crop", [region, timeout], () => module.crop(id, region.originX, region.originY, region.width, region.height, timeout)),
          close: id => module.close(id),
        };
        try {
          const result = await scanReceiptSession(file.uri, native);
          return { inputSha256: hash, samples, result, parsedEligible: canAttachParsedReceipt(result.draft), rawEligible: canAttachReceipt(result.draft) };
        } catch (error) { return { inputSha256: hash, samples, error: String(error) }; }
      }, result => {
        new File(output, result.file + ".json").write(JSON.stringify({ ...result, appVersion: app?.nativeApplicationVersion, buildVersion: app?.nativeBuildVersion }));
        completed++; setStatus(`${completed}/40 ${result.name}`);
      });
      setStatus("Complete: 40/40. Results saved privately.");
    } catch (error) { setStatus(`Stopped: ${String(error)}`); }
    finally { setRunning(false); }
  }
  if (!enabled) return <View><Text>Unavailable</Text></View>;
  return <ScrollView contentContainerStyle={{ padding: 32, gap: 20 }}><Text>QA OCR corpus (no transaction save)</Text><Text>{status}</Text><Button title="Run 40 images" onPress={run} disabled={running} /></ScrollView>;
}
