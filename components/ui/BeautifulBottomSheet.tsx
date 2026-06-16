import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  TouchableOpacity,
  Modal,
  PanResponder,
  Dimensions,
  Animated as RNAnimated,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Spacing, useTheme, useThemeColors } from '../../constants/Theme';
import { ChevronDown } from 'lucide-react-native';
import { GlassCard } from '../home/GlassCard';

interface BeautifulBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number | string;
  showDragIndicator?: boolean;
  glowColor?: string;
  containerStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  snapPoints?: number[];
}

const { height: screenHeight } = Dimensions.get('window');

export function BeautifulBottomSheet({
  visible,
  onClose,
  title,
  children,
  height = '70%',
  showDragIndicator = true,
  glowColor,
  containerStyle,
  contentStyle,
  snapPoints,
}: BeautifulBottomSheetProps) {
  const theme = useTheme();
  const resolvedGlowColor = glowColor ?? theme.colors.brand.primary;
  const translateY = useSharedValue(screenHeight);
  const [snapIndex, setSnapIndex] = useState(0);

  const handleClose = useCallback(() => {
    translateY.value = withSpring(screenHeight, {
      damping: 12,
      mass: 1,
      stiffness: 100,
    });
    setTimeout(onClose, 300);
  }, [translateY, onClose]);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 10,
        mass: 1,
        stiffness: 100,
      });
    } else {
      translateY.value = withSpring(screenHeight);
    }
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleDragStart = (
    _event: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => {
    if (gestureState.dy > 50) {
      handleClose();
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 0,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.value = gestureState.dy;
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        handleClose();
      } else {
        translateY.value = withSpring(0, {
          damping: 10,
          mass: 1,
          stiffness: 100,
        });
      }
    },
  });

  const numHeight =
    typeof height === 'string'
      ? (parseInt(height) / 100) * screenHeight
      : height;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={[styles.backdrop, { backgroundColor: theme.colors.modal.backdrop }]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.bottomSheetContainer,
            { height: numHeight },
            containerStyle,
            animatedStyle,
          ]}
          {...panResponder.panHandlers}
        >
          <GlassCard
            intensity={90}
            glowColor={resolvedGlowColor}
            style={[styles.bottomSheetContent, contentStyle]}
          >
            {/* Drag Indicator */}
            {showDragIndicator && (
              <View style={styles.dragIndicatorContainer}>
                <View style={[styles.dragIndicator, { backgroundColor: theme.colors.text.dim }]} />
              </View>
            )}

            {/* Header */}
            {title && (
              <Animated.Text
                entering={FadeIn.delay(100).duration(300)}
                style={[
                  styles.bottomSheetTitle,
                  {
                    color: theme.colors.text.primary,
                    borderBottomColor: theme.colors.border.subtle,
                  },
                ]}
              >
                {title}
              </Animated.Text>
            )}

            {/* Content */}
            <Animated.View
              entering={FadeIn.delay(200).duration(300)}
              style={styles.bottomSheetBody}
            >
              {children}
            </Animated.View>
          </GlassCard>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

interface BottomMenuOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  color?: string;
  isDangerous?: boolean;
}

interface BeautifulBottomMenuProps {
  visible: boolean;
  onClose: () => void;
  options: BottomMenuOption[];
  title?: string;
}

export function BeautifulBottomMenu({
  visible,
  onClose,
  options,
  title,
}: BeautifulBottomMenuProps) {
  const theme = useTheme();
  const colors = useThemeColors();
  const numOptions = options.length;
  const sheetHeight = 60 + (title ? 50 : 0) + numOptions * 60 + Spacing.l;

  return (
    <BeautifulBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      height={Math.min(sheetHeight, screenHeight * 0.8)}
    >
      <View style={styles.menuContent}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.menuOption,
              {
                borderBottomColor: option === options[options.length - 1] ? 'transparent' : theme.colors.border.subtle,
              },
            ]}
            onPress={() => {
              option.onPress();
              onClose();
            }}
          >
            {option.icon && (
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.surface.subtle }]}>{option.icon}</View>
            )}
            <Animated.Text
              entering={FadeIn.delay(100).duration(300)}
              style={[
                styles.menuLabel,
                {
                  color: option.isDangerous ? colors.error : theme.colors.text.secondary,
                },
              ]}
            >
              {option.label}
            </Animated.Text>
          </TouchableOpacity>
        ))}
      </View>
    </BeautifulBottomSheet>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheetContainer: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    zIndex: 1000,
  },
  bottomSheetContent: {
    flex: 1,
    paddingBottom: Spacing.l,
    paddingHorizontal: Spacing.l,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.m,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.m,
    paddingBottom: Spacing.m,
    borderBottomWidth: 1,
  },
  bottomSheetBody: {
    flex: 1,
  },
  menuContent: {
    gap: 0,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.m,
    borderBottomWidth: 1,
    gap: Spacing.m,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
