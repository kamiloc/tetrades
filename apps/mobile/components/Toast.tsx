import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Animated, Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Feather } from '../lib/icons';
import { colors, shadow, TAB_BAR_HEIGHT_ABOVE_INSET } from '../lib/theme';

// Transient save feedback. Context + useState only (AGENTS.md: no global
// state library). One toast at a time; a new one replaces the current one.

type ToastTone = 'success' | 'error';

interface ToastMessage {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

interface ToastContextValue extends ToastApi {
  current: ToastMessage | null;
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS: Record<ToastTone, number> = { success: 2500, error: 4500 };

export function ToastProvider({ children }: { children: ReactNode }): ReactElement {
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);

  const show = useCallback((tone: ToastTone, message: string) => {
    nextId.current += 1;
    setCurrent({ id: nextId.current, tone, message });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), DURATION_MS[current.tone]);
    return () => clearTimeout(timer);
  }, [current]);

  const value = useMemo<ToastContextValue>(
    () => ({
      current,
      dismiss: () => setCurrent(null),
      success: (message) => show('success', message),
      error: (message) => show('error', message),
    }),
    [current, show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport aboveTabBar />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return { success: context.success, error: context.error };
}

const TONES: Record<ToastTone, { bg: string; fg: string; border: string; icon: 'check' | 'alert-circle' }> = {
  success: { bg: colors.ink, fg: colors.onInk, border: colors.ink, icon: 'check' },
  error: { bg: colors.dangerTint, fg: colors.danger, border: colors.dangerLine, icon: 'alert-circle' },
};

const GAP = 12;
const KEYBOARD_SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const KEYBOARD_HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

// Renders the current toast at the bottom of the screen: above the tab bar by
// default, and above the keyboard while it is open. ToastProvider mounts one
// (aboveTabBar). React Native modals and native modal screens render in their
// own layer, so a sheet that can show a toast mounts another with
// aboveTabBar={false}.
export function ToastViewport({ aboveTabBar = false }: { aboveTabBar?: boolean }): ReactElement | null {
  const context = useContext(ToastContext);
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const current = context?.current ?? null;

  useEffect(() => {
    const show = Keyboard.addListener(KEYBOARD_SHOW, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(KEYBOARD_HIDE, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [current, opacity]);

  if (!context || !current) return null;
  const tone = TONES[current.tone];
  const base = insets.bottom + (aboveTabBar ? TAB_BAR_HEIGHT_ABOVE_INSET : 0) + GAP;
  const bottom = keyboardHeight > 0 ? keyboardHeight + GAP : base;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', bottom, left: 16, right: 16, zIndex: 1000 }}>
      <Animated.View
        style={[
          shadow.ink,
          {
            opacity,
            transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          },
        ]}
      >
        <Pressable
          onPress={context.dismiss}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityHint="Dismisses the notification"
          className="min-h-[48px] flex-row items-center gap-2.5 rounded-lg border px-4 py-3"
          style={{ backgroundColor: tone.bg, borderColor: tone.border }}
        >
          <Feather name={tone.icon} size={18} color={tone.fg} />
          <Text className="flex-1 text-footnote font-semibold" style={{ color: tone.fg }}>
            {current.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
