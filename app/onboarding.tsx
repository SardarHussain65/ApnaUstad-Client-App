import React, { useRef } from 'react';
import { StyleSheet, View, FlatList, Dimensions, Text, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useAnimatedScrollHandler, 
  useSharedValue, 
  useAnimatedStyle,
  interpolate,
  withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingSlide } from '../components/OnboardingSlide';
import { AnimatedButton } from '../components/AnimatedButton';
import { Colors, Spacing, Typography, Animation } from '../constants/Theme';

const { width } = Dimensions.get('window');

const DATA = [
  {
    id: '1',
    title: 'Find the Best Experts',
    description: 'Connect with skilled professionals for any task, from home repairs to digital services.',
    image: require('../assets/images/onboarding1.png'),
  },
  {
    id: '2',
    title: 'Showcase Your Craft',
    description: 'Build your profile, share your skills, and get hired by clients in your area.',
    image: require('../assets/images/onboarding2.png'),
  },
  {
    id: '3',
    title: 'Secure & Seamless',
    description: 'Enjoy peace of mind with secure payments and verified user profiles.',
    image: require('../assets/images/onboarding3.png'),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const handleNext = async () => {
    if (currentIndex < DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/role-selection');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/role-selection');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.FlatList
        ref={flatListRef as any}
        data={DATA}
        renderItem={({ item, index }) => (
          <OnboardingSlide item={item} index={index} scrollX={scrollX} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {DATA.map((_, i) => {
            const dotStyle = useAnimatedStyle(() => {
              const dotWidth = interpolate(
                scrollX.value,
                [(i - 1) * width, i * width, (i + 1) * width],
                [10, 24, 10],
                'clamp'
              );
              const opacity = interpolate(
                scrollX.value,
                [(i - 1) * width, i * width, (i + 1) * width],
                [0.3, 1, 0.3],
                'clamp'
              );
              return {
                width: dotWidth,
                opacity,
              };
            });
            return <Animated.View key={i} style={[styles.dot, dotStyle]} />;
          })}
        </View>

        <View style={styles.buttonContainer}>
          {currentIndex < DATA.length - 1 ? (
            <View style={styles.row}>
              <AnimatedButton 
                title="Skip" 
                variant="ghost" 
                onPress={handleSkip} 
                style={styles.skipBtn}
              />
              <AnimatedButton 
                title="Next" 
                variant="cyan" 
                onPress={handleNext} 
                style={styles.nextBtn}
              />
            </View>
          ) : (
            <AnimatedButton 
              title="Get Started" 
              variant="cyan" 
              onPress={handleNext} 
              style={styles.startBtn}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  footer: {
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.cyan,
    marginHorizontal: 4,
  },
  buttonContainer: {
    marginTop: Spacing.l,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.m,
  },
  skipBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
  },
  startBtn: {
    width: '100%',
  }
});
