import { useEffect, useState } from "react";
import { Image, type ImageProps } from "react-native";
import { keepsakePhotoSource } from "./keepsake-photo-storage";

/** Decoded bytes live in memory only. Stale owner resolutions never render. */
export function KeepsakePhoto({ owner, uri, picked = false, ...props }: Omit<ImageProps, "source"> & { owner: string; uri: string; picked?: boolean }) {
  const key = `${owner}:${uri}`;
  const [resolved, setResolved] = useState<{ key: string; uri: string } | null>(null);
  useEffect(() => {
    let live = true;
    if (!picked) void keepsakePhotoSource(owner, uri).then(value => { if (live) setResolved({ key, uri: value }); }).catch(() => { if (live) setResolved(null); });
    return () => { live = false; };
  }, [key, owner, uri, picked]);
  const source = picked ? uri : resolved?.key === key ? resolved.uri : null;
  return source ? <Image {...props} accessibilityLabel={props.accessibilityLabel ?? "Ảnh kỷ vật"} source={{ uri: source }} /> : null;
}
