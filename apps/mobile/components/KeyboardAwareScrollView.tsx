import { useEffect, useRef, useState, type ReactElement, type ReactNode, type RefObject } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, View, type KeyboardEvent } from 'react-native';

// Keeps the focused input above the keyboard on iOS and on Android
// edge-to-edge (SDK 55), where the window no longer resizes for the keyboard.
// Built-in APIs only:
//  1. pad the bottom by however much the keyboard overlaps this view, so the
//     scroll viewport ends at the keyboard's top edge;
//  2. scroll the focused input into view once the keyboard is up.
// iOS re-fires keyboardWillShow on every focus change; on Android the
// now-shrunken ScrollView scrolls later-focused inputs into view natively.

const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
const FOCUS_MARGIN = 24;

export function useKeyboardOverlap(): { overlap: number; containerRef: RefObject<View | null> } {
  const containerRef = useRef<View | null>(null);
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(SHOW, (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;
      container.measureInWindow((_x, y, _w, height) => {
        setOverlap(Math.max(0, y + height - event.endCoordinates.screenY));
      });
    });
    const hide = Keyboard.addListener(HIDE, () => setOverlap(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { overlap, containerRef };
}

interface KeyboardAwareScrollViewProps {
  children: ReactNode;
  contentContainerClassName?: string;
  className?: string;
  showsVerticalScrollIndicator?: boolean;
}

export function KeyboardAwareScrollView({
  children,
  contentContainerClassName,
  className = 'flex-1',
  showsVerticalScrollIndicator = false,
}: KeyboardAwareScrollViewProps): ReactElement {
  const { overlap, containerRef } = useKeyboardOverlap();
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(0);

  // After the padding is applied, bring the focused input into view.
  useEffect(() => {
    if (overlap === 0) return;
    const frame = requestAnimationFrame(() => {
      const input = TextInput.State.currentlyFocusedInput();
      const scroll = scrollRef.current;
      if (!input || !scroll) return;
      input.measureInWindow((_ix, inputY, _iw, inputHeight) => {
        containerRef.current?.measureInWindow((_cx, containerY, _cw, containerHeight) => {
          // The bottom padding equals the overlap, so the viewport ends here.
          const visibleBottom = containerY + containerHeight - overlap;
          const inputBottom = inputY + inputHeight + FOCUS_MARGIN;
          if (inputBottom > visibleBottom) {
            scroll.scrollTo({ y: scrollY.current + (inputBottom - visibleBottom), animated: true });
          }
        });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [overlap, containerRef]);

  return (
    <View ref={containerRef} className={className} style={{ paddingBottom: overlap }}>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName={contentContainerClassName}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
