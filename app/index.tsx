import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import DockIcon from '@/components/DockIcon';
import type { GenieControls } from '@/components/GenieEffect';
import GenieEffect from '@/components/GenieEffect';

const CARD_WIDTH = 320;
const CARD_HEIGHT = 420;

export default function Index() {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [controls, setControls] = useState<GenieControls | null>(null);

  const dockX = useSharedValue(screenW / 2);
  const dockY = useSharedValue(screenH - 80);
  const fallbackMinimized = useSharedValue(false);

  const handleReady = useCallback((c: GenieControls) => {
    setControls(c);
  }, []);

  const handleDockTap = useCallback(() => {
    controls?.restore();
  }, [controls]);

  const handleMinimize = useCallback(() => {
    controls?.minimize();
  }, [controls]);

  return (
    <GestureHandlerRootView style={styles.screen}>
      <GenieEffect
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        canvasWidth={screenW}
        canvasHeight={screenH}
        cardY={100}
        dockX={dockX}
        dockY={dockY}
        duration={700}
        onReady={handleReady}
      >
        <WindowCard onMinimize={handleMinimize} />
      </GenieEffect>


      <DockIcon
        dockX={dockX}
        dockY={dockY}
        isMinimized={controls?.isMinimized ?? fallbackMinimized}
        onTap={handleDockTap}
      />
    </GestureHandlerRootView>
  );
}


function WindowCard({ onMinimize }: { onMinimize?: () => void }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.titleBar}>
        <View style={cardStyles.trafficLights}>
          <View style={[cardStyles.dot, { backgroundColor: '#FF5F57' }]} />
          <Pressable
            onPress={() => onMinimize?.()}
            hitSlop={12}
            style={cardStyles.dotPressable}
          >
            <View style={[cardStyles.dot, { backgroundColor: '#FEBC2E' }]} />
          </Pressable>
          <View style={[cardStyles.dot, { backgroundColor: '#28C840' }]} />
        </View>
        <Text style={cardStyles.titleText}>GenieEffect.tsx</Text>
      </View>

      <View style={cardStyles.body}>
        <Text style={cardStyles.codeLine}>
          <Text style={cardStyles.keyword}>import </Text>
          <Text style={cardStyles.string}>React</Text>
          <Text style={cardStyles.keyword}> from </Text>
          <Text style={cardStyles.string}>&apos;react&apos;</Text>;
        </Text>
        <Text style={cardStyles.codeLine}>
          <Text style={cardStyles.keyword}>import </Text>
          {'{ '}
          <Text style={cardStyles.identifier}>Canvas</Text>
          {', '}
          <Text style={cardStyles.identifier}>Vertices</Text>
          {' }'};
        </Text>
        <Text style={cardStyles.codeLine} />
        <Text style={cardStyles.codeLine}>
          <Text style={cardStyles.comment}>
            {'// macOS genie effect ✨'}
          </Text>
        </Text>
        <Text style={cardStyles.codeLine}>
          <Text style={cardStyles.keyword}>export default function </Text>
          <Text style={cardStyles.fn}>GenieEffect</Text>
          {'() {'}
        </Text>
        <Text style={cardStyles.codeLine}>
          {'  '}
          <Text style={cardStyles.keyword}>return </Text>
          {'<'}
          <Text style={cardStyles.identifier}>Canvas</Text>
          {' />;'}
        </Text>
        <Text style={cardStyles.codeLine}>{'}'}</Text>

        <View style={cardStyles.gradientBand}>
          {['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'].map(
            (color) => (
              <View
                key={color}
                style={[cardStyles.gradientSlice, { backgroundColor: color }]}
              />
            ),
          )}
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e1e2e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  titleBar: {
    height: 38,
    backgroundColor: '#2a2a3e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  trafficLights: {
    flexDirection: 'row',
    gap: 7,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotPressable: {
    padding: 1,
  },
  titleText: {
    marginLeft: 14,
    color: '#cdd6f4',
    fontSize: 13,
    fontWeight: '500',
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  codeLine: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: '#cdd6f4',
    lineHeight: 22,
  },
  keyword: { color: '#cba6f7' },
  string: { color: '#a6e3a1' },
  identifier: { color: '#89b4fa' },
  fn: { color: '#f9e2af' },
  comment: { color: '#6c7086', fontStyle: 'italic' },
  gradientBand: {
    flexDirection: 'row',
    height: 100,
    marginTop: 24,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientSlice: {
    flex: 1,
  },
});
