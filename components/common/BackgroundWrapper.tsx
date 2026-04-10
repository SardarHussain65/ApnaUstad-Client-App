import React from 'react';
import { StyleSheet, ImageBackground, View, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Theme';

const { width, height } = Dimensions.get('window');

interface BackgroundWrapperProps {
  children: React.ReactNode;
  blur?: number;
}

export function BackgroundWrapper({ children, blur = 0 }: BackgroundWrapperProps) {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/cosmic_bg.png')}
        style={styles.imageBg}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        {blur > 0 && (
          <BlurView intensity={blur} tint="dark" style={StyleSheet.absoluteFill} />
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
    backgroundColor: Colors.background,
  },
  imageBg: {
    width: width,
    height: height,
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 16, 0.7)', // Dark cosmic overlay for readability
  },
  content: {
    flex: 1,
  }
});
