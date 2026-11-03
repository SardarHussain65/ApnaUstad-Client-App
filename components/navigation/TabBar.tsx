import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
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
import { Home, ClipboardList, Wallet, User, Compass } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsRTL } from '../../context/LanguageContext';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = useIsRTL();
  const { width: screenWidth } = useWindowDimensions();

  const visibleRoutes = state.routes.filter((route) => {
    const opts = descriptors[route.key]?.options as any;
    return opts?.href !== null && opts?.tabBarItemStyle?.display !== 'none';
  });

  const numTabs = visibleRoutes.length || 4;
  const tabBarWidth = screenWidth - 40;
  const tabWidth = tabBarWidth / numTabs;
  const activeRoute = state.routes[state.index];
  const activeVisibleIndex = visibleRoutes.findIndex((r) => r.key === activeRoute?.key);

  const INDICATOR_WIDTH = Math.min(tabWidth - 8, 44);
  const INDICATOR_HEIGHT = 36;
  const indicatorOffset = (tabWidth - INDICATOR_WIDTH) / 2;

  const getTargetX = (index: number) => {
    const safeIndex = Math.max(0, index);
    const visualIndex = isRTL ? numTabs - 1 - safeIndex : safeIndex;
    return visualIndex * tabWidth + indicatorOffset;
  };

  const translateX = useSharedValue(getTargetX(activeVisibleIndex));

  useEffect(() => {
    translateX.value = withSpring(getTargetX(activeVisibleIndex), {
      damping: 20,
      stiffness: 150,
      mass: 0.8
    });
  }, [activeVisibleIndex, tabWidth, isRTL]);

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
      <BlurView
        intensity={theme.id === 'current' ? 60 : 18}
        tint={theme.blurTint}
        style={styles.blurContainer}
      >
        {/* Active Indicator on Icon (Glowing Pill around the active tab's icon) */}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              width: INDICATOR_WIDTH,
              height: INDICATOR_HEIGHT,
              borderRadius: INDICATOR_HEIGHT / 2,
              backgroundColor: theme.colors.tabBar.activeBackground,
              borderColor: theme.colors.tabBar.activeBorder,
            },
            indicatorStyle,
          ]}
        />

        <View style={styles.tabsRow}>
          {visibleRoutes.map((route) => {
            const isFocused = activeRoute?.key === route.key;

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
        </View>
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
    prog.value = withTiming(isFocused ? 1 : 0, { duration: 220 });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isFocused ? 1.12 : 1, { damping: 12 }) }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: prog.value,
      transform: [{ translateY: withSpring(isFocused ? 0 : 4, { damping: 14 }) }],
      color: interpolateColor(prog.value, [0, 1], [inactiveColor, activeColor])
    };
  });

  const Icon = ({ color }: { color: string }) => {
    const size = 20;
    switch (routeName) {
      case 'index': return <Home size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'jobs': return <Compass size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'bookings': return <ClipboardList size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'wallet': return <Wallet size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'profile': return <User size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      default: return <Home size={size} color={color} />;
    }
  };

  const getLabel = () => {
    switch (routeName) {
      case 'index': return t('tabs.home');
      case 'jobs': return t('tabs.jobs', 'Find Jobs');
      case 'bookings': return t('tabs.bookings');
      case 'wallet': return t('tabs.wallet');
      case 'profile': return t('tabs.profile');
      default: return '';
    }
  }

  const iconColor = isFocused ? activeColor : inactiveColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
    >
      <View style={styles.tabInner}>
        <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
          <Icon color={iconColor} />
        </Animated.View>
        <Animated.Text style={[styles.tabLabel, animatedTextStyle]} numberOfLines={1}>
          {getLabel()}
        </Animated.Text>
      </View>
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
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    left: 0,
    borderWidth: 1.5,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  iconWrapper: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  }
});
