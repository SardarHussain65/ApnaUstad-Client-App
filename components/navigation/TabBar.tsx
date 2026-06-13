import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolateColor,
  withTiming
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Home, ClipboardList, Wallet, User } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 40; 
const TAB_WIDTH = TAB_BAR_WIDTH / 4;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const translateX = useSharedValue(state.index * TAB_WIDTH);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    translateX.value = withSpring(state.index * TAB_WIDTH, {
       damping: 20,
       stiffness: 150,
       mass: 0.8
    });
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePress = (route: any, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate(route.name);
    }
  };

  const bottomMargin = Platform.OS === 'ios'
    ? (insets.bottom > 0 ? insets.bottom : 16)
    : (insets.bottom > 0 ? insets.bottom + 12 : 16);

  return (
    <View
      style={[
        styles.container,
        {
          bottom: bottomMargin,
          backgroundColor: theme.colors.tabBar.background,
          borderColor: theme.colors.tabBar.border,
          shadowColor: theme.colors.tabBar.shadow,
        },
      ]}
    >
      <BlurView intensity={theme.id === 'current' ? 60 : 18} tint={theme.blurTint} style={styles.blurContainer}>
        {/* Active Indicator (Glowing Pill) */}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              backgroundColor: theme.colors.tabBar.activeBackground,
              borderColor: theme.colors.tabBar.activeBorder,
            },
            indicatorStyle,
          ]}
        />

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          
          return (
            <TabItem 
              key={route.key}
              isFocused={isFocused}
              onPress={() => handlePress(route, isFocused)}
              routeName={route.name}
              activeColor={theme.colors.tabBar.activeIcon}
              inactiveColor={theme.colors.tabBar.inactiveIcon}
            />
          );
        })}
      </BlurView>
    </View>
  );
}

function TabItem({
  isFocused,
  onPress,
  routeName,
  activeColor,
  inactiveColor,
}: {
  isFocused: boolean,
  onPress: () => void,
  routeName: string,
  activeColor: string,
  inactiveColor: string,
}) {
  const { t } = useTranslation();
  const prog = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    prog.value = withTiming(isFocused ? 1 : 0, { duration: 250 });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isFocused ? 1.1 : 1, { damping: 10 }) }],
      // Note: Reanimated v3 doesn't support color interpolation directly in styles for line-based icons 
      // as easily as specialized SVG components, so we will pass color to the icon component itself.
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: prog.value,
      transform: [{ translateY: withSpring(isFocused ? 0 : 5, { damping: 12 }) }],
      color: interpolateColor(prog.value, [0, 1], [inactiveColor, activeColor])
    };
  });

  const Icon = ({ color }: { color: string }) => {
    const size = 20;
    switch (routeName) {
      case 'index': return <Home size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'bookings': return <ClipboardList size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'wallet': return <Wallet size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'profile': return <User size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      default: return <Home size={size} color={color} />;
    }
  };

  const getLabel = () => {
     switch (routeName) {
       case 'index': return t('tabs.home');
       case 'bookings': return t('tabs.bookings');
       case 'wallet': return t('tabs.wallet');
       case 'profile': return t('tabs.profile');
       default: return '';
     }
  }

  // We manually handle color transition for the icon component since it's not a native property reanimated interpolates on non-SVG components directly
  const iconColor = isFocused ? activeColor : inactiveColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <Icon color={iconColor} />
        <Animated.Text style={[styles.tabLabel, animatedTextStyle]}>
          {getLabel()}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  blurContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    width: TAB_WIDTH - 12,
    height: 52,
    borderRadius: 26,
    left: 6,
    borderWidth: 1.5,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  }
});
