import React from 'react';
import { StyleSheet, ImageBackground, View, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../constants/Theme';

const { width, height } = Dimensions.get('window');

interface BackgroundWrapperProps {
  children: React.ReactNode;
  blur?: number;
}

export function BackgroundWrapper({ children, blur = 0 }: BackgroundWrapperProps) {
  const theme = useTheme();

  if (!theme.useImageBackground) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.screen }]}>
        {blur > 0 && (
          <BlurView intensity={blur} tint={theme.blurTint} style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.app }]}>
      <ImageBackground
        source={require('../../assets/images/cosmic_bg.png')}
        style={styles.imageBg}
        resizeMode="cover"
      >
        <View style={[styles.overlay, { backgroundColor: theme.colors.background.imageOverlay }]} />
        {blur > 0 && (
          <BlurView intensity={blur} tint={theme.blurTint} style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.content}>
          {children}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageBg: {
    width: width,
    height: height,
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  }
});
