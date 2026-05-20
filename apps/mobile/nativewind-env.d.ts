// NativeWind v4 className type augmentation for React Native core components.
// Inlined from react-native-css-interop/types because moduleResolution:bundler
// does not resolve the nativewind/types sub-path through the empty exports field.
// `export {}` makes this a module file so `declare module` augments rather than replaces.
export {};

declare module 'react-native' {
  interface ViewProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TextProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface ImagePropsBase {
    className?: string;
    cssInterop?: boolean;
  }
  interface ImageBackgroundProps {
    imageClassName?: string;
  }
  interface TextInputProps {
    placeholderClassName?: string;
  }
  interface SwitchProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TouchableWithoutFeedbackProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface ScrollViewProps {
    contentContainerClassName?: string;
    indicatorClassName?: string;
  }
  interface KeyboardAvoidingViewProps {
    contentContainerClassName?: string;
  }
  interface StatusBarProps {
    className?: string;
    cssInterop?: boolean;
  }
}
