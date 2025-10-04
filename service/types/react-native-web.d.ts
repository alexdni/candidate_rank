declare module 'react-native-web' {
  import * as React from 'react';

  export interface ViewStyle {
    [key: string]: any;
  }

  export interface TextStyle {
    [key: string]: any;
  }

  export interface ViewProps {
    style?: ViewStyle | ViewStyle[];
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface TextProps {
    style?: TextStyle | TextStyle[];
    children?: React.ReactNode;
    numberOfLines?: number;
    [key: string]: any;
  }

  export interface TextInputProps {
    style?: TextStyle | TextStyle[];
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    multiline?: boolean;
    numberOfLines?: number;
    [key: string]: any;
  }

  export interface TouchableOpacityProps {
    style?: ViewStyle | ViewStyle[];
    onPress?: () => void;
    disabled?: boolean;
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface ScrollViewProps {
    style?: ViewStyle | ViewStyle[];
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface ActivityIndicatorProps {
    size?: 'small' | 'large' | number;
    color?: string;
    [key: string]: any;
  }

  export const View: React.ComponentType<ViewProps>;
  export const Text: React.ComponentType<TextProps>;
  export const TextInput: React.ComponentType<TextInputProps>;
  export const TouchableOpacity: React.ComponentType<TouchableOpacityProps>;
  export const ScrollView: React.ComponentType<ScrollViewProps>;
  export const ActivityIndicator: React.ComponentType<ActivityIndicatorProps>;
}
