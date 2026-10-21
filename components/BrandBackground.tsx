import type { ReactNode } from 'react';
import {
  ImageBackground,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Soft branded watermark used behind auth and main screens.
 * The logo is contained so the whole emblem stays centered, and kept at a
 * low-ish opacity so text and cards remain easy to read.
 */
export default function BrandBackground({ children, style }: Props) {
  return (
    <ImageBackground
      source={require('../assets/images/qr-app-logo.png')}
      style={[styles.root, style]}
      imageStyle={styles.image}
      resizeMode="contain"
      blurRadius={2}
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.background,
  },
  image: {
    opacity: 0.3,
  },
});
