import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Keyboard, TextInput, type NativeSyntheticEvent, type NativeScrollEvent, type ScrollView } from "react-native";

const margin = 24;

/**
 * Edge-to-edge Android does not resize the window for the keyboard, so a scroll container pads its own bottom by the part of
 * itself the keyboard covers and scrolls the focused field above the keyboard. Works the same when the window does resize.
 */
export function useKeyboardAvoidingScroll(ref: RefObject<ScrollView | null>) {
  const [inset, setInset] = useState(0);
  const offset = useRef(0);
  const keyboardTop = useRef<number | null>(null);

  const reveal = useCallback(() => {
    const top = keyboardTop.current;
    const field = TextInput.State.currentlyFocusedInput?.();
    if (top == null || !field) return;
    field.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + margin - top;
      if (overlap > 0) ref.current?.scrollTo({ y: offset.current + overlap, animated: true });
    });
  }, [ref]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      const scroller = ref.current as unknown as { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null;
      scroller?.measureInWindow?.((_x, y, _w, h) => {
        setInset(Math.max(0, y + h - event.endCoordinates.screenY));
        setTimeout(reveal, 60);
      });
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => { keyboardTop.current = null; setInset(0); });
    return () => { show.remove(); hide.remove(); };
  }, [ref, reveal]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => { offset.current = event.nativeEvent.contentOffset.y; }, []);
  return { inset, onScroll, reveal };
}

/** Height of the visible keyboard (0 when hidden); lifts bottom sheets in modal windows. */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return height;
}
