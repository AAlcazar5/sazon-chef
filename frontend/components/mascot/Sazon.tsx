// Sazon mascot — React Native port of claude-design/mascot/.
// 4 color variants × 11 motion presets × 8 FX overlays.
// Animations honor `prefers-reduced-motion` via AccessibilityInfo.

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, AccessibilityInfo } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { G, Text as SvgText, Path, Rect, Circle, Line, Ellipse } from 'react-native-svg';

export type SazonVariant = 'orange' | 'red' | 'green' | 'purple';

export type SazonMotion =
  | 'idle'
  | 'bounce'
  | 'wave'
  | 'spin'
  | 'wobble'
  | 'pulse'
  | 'sleep'
  | 'jiggle'
  | 'peek'
  | 'celebrate'
  | 'kiss';

export type SazonFx =
  | 'zees'
  | 'hearts'
  | 'sparkles'
  | 'confetti'
  | 'steam'
  | 'sweat'
  | 'question'
  | 'shine';

interface SazonProps {
  variant?: SazonVariant;
  motion?: SazonMotion;
  fx?: SazonFx[];
  size?: number;
  style?: ViewStyle;
}

const SAZON_VARIANTS = {
  orange: require('./sazon-orange.png') as number,
  red: require('./sazon-red.png') as number,
  green: require('./sazon-green.png') as number,
  purple: require('./sazon-purple.png') as number,
} as const;

// Bridge: legacy LogoMascotExpression → Sazon variant/motion/fx triple.
// Use this from any site that still passes an "expression" prop and wants Sazon.
export type SazonConfig = { variant: SazonVariant; motion: SazonMotion; fx: SazonFx[] };

export function expressionToSazon(expr: string): SazonConfig {
  switch (expr) {
    case 'sleepy':       return { variant: 'purple', motion: 'sleep', fx: ['zees'] };
    case 'curious':      return { variant: 'green', motion: 'wobble', fx: ['question'] };
    case 'thinking':     return { variant: 'green', motion: 'wobble', fx: ['question'] };
    case 'celebrating':  return { variant: 'orange', motion: 'celebrate', fx: ['confetti', 'hearts'] };
    case 'chef-kiss':    return { variant: 'orange', motion: 'kiss', fx: ['hearts'] };
    case 'excited':      return { variant: 'orange', motion: 'bounce', fx: ['sparkles'] };
    case 'proud':        return { variant: 'orange', motion: 'pulse', fx: ['shine'] };
    case 'supportive':   return { variant: 'green', motion: 'peek', fx: [] };
    case 'surprised':    return { variant: 'orange', motion: 'jiggle', fx: ['question'] };
    case 'winking':      return { variant: 'orange', motion: 'wave', fx: ['hearts'] };
    case 'focused':      return { variant: 'red', motion: 'pulse', fx: ['shine'] };
    case 'happy':
    default:             return { variant: 'orange', motion: 'idle', fx: [] };
  }
}

// Map legacy LogoMascotSize → Sazon pixel size
export const SAZON_SIZE_PX = {
  tiny: 24,
  xsmall: 36,
  small: 48,
  medium: 96,
  large: 192,
  hero: 256,
} as const;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (mounted) setReduced(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

// Body motion — animated wrapper around the PNG. Each preset returns the body's animated style.
function useBodyMotion(motion: SazonMotion, reduced: boolean) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced || motion === 'idle' && false) {
      t.value = 0;
      return;
    }
    const durations: Record<SazonMotion, number> = {
      idle: 3600,
      bounce: 1400,
      wave: 2400,
      spin: 1600,
      wobble: 2400,
      pulse: 1800,
      sleep: 3400,
      jiggle: 600,
      peek: 2800,
      celebrate: 1500,
      kiss: 2000,
    };
    const easing = motion === 'spin' ? Easing.linear : Easing.inOut(Easing.cubic);
    t.value = 0;
    t.value = withRepeat(
      withTiming(1, { duration: durations[motion], easing }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(t);
    };
  }, [motion, reduced, t]);

  return useAnimatedStyle(() => {
    if (reduced) return { transform: [{ scale: 1 }] };
    const v = t.value;
    switch (motion) {
      case 'idle': {
        // breathe: scale 1 ↔ 1.025, translateY 0 ↔ -1.5%
        const cycle = Math.sin(v * Math.PI * 2);
        return {
          transform: [
            { translateY: -1.5 * Math.max(0, cycle) },
            { scale: 1 + 0.025 * Math.max(0, cycle) },
          ],
        };
      }
      case 'bounce': {
        // peak around 35%
        const x = v;
        const ty =
          x < 0.15 ? -2 * (x / 0.15) :
          x < 0.35 ? -2 + (-22 + 2) * ((x - 0.15) / 0.2) :
          x < 0.55 ? -22 + (-2 + 22) * ((x - 0.35) / 0.2) :
          x < 0.7  ? -2 + 2 * ((x - 0.55) / 0.15) : 0;
        return { transform: [{ translateY: ty }] };
      }
      case 'wave': {
        // rotate -12 ↔ 10
        const angle = -12 * Math.cos(v * Math.PI * 2) + 0;
        return { transform: [{ rotate: `${angle}deg` }] };
      }
      case 'spin':
        return { transform: [{ rotate: `${v * 360}deg` }] };
      case 'wobble': {
        const angle = -6 + 12 * (0.5 - 0.5 * Math.cos(v * Math.PI * 2));
        return { transform: [{ rotate: `${angle}deg` }] };
      }
      case 'pulse': {
        const cycle = Math.sin(v * Math.PI * 2);
        return { transform: [{ scale: 1 + 0.08 * Math.max(0, cycle) }] };
      }
      case 'sleep': {
        const cycle = Math.sin(v * Math.PI * 2);
        return {
          transform: [
            { rotate: '-4deg' },
            { translateY: -3 * Math.max(0, cycle) },
          ],
        };
      }
      case 'jiggle': {
        const angle = 4 * Math.sin(v * Math.PI * 2);
        return { transform: [{ rotate: `${angle}deg` }] };
      }
      case 'peek': {
        // hold at -40% then 0 then back
        const ty =
          v < 0.2 ? -40 + 40 * (v / 0.2) :
          v < 0.8 ? 0 :
          -40 * ((v - 0.8) / 0.2);
        return { transform: [{ translateY: ty }] };
      }
      case 'celebrate': {
        const r = -3 + 7 * Math.sin(v * Math.PI * 2);
        const ty = -15 * Math.max(0, Math.sin(v * Math.PI * 4));
        const s = 1 + 0.05 * Math.max(0, Math.sin(v * Math.PI * 4));
        return { transform: [{ translateY: ty }, { rotate: `${r}deg` }, { scale: s }] };
      }
      case 'kiss': {
        const peak = v > 0.3 && v < 0.45 ? 1 : 0;
        return {
          transform: [
            { scale: 1 + 0.06 * peak },
            { translateY: -2 * peak },
          ],
        };
      }
      default:
        return { transform: [{ scale: 1 }] };
    }
  }, [motion, reduced]);
}

export default function Sazon({
  variant = 'orange',
  motion = 'idle',
  fx = [],
  size = 120,
  style,
}: SazonProps) {
  const reduced = useReducedMotion();
  const bodyStyle = useBodyMotion(motion, reduced);

  return (
    <View style={[{ width: size, height: size }, styles.container, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <Image
          source={SAZON_VARIANTS[variant]}
          style={styles.body}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </Animated.View>
      {fx.length > 0 && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {fx.map((f) => (
            <FxOverlay key={f} kind={f} reduced={reduced} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── FX overlays ─────────────────────────────────────────────────────────────

function FxOverlay({ kind, reduced }: { kind: SazonFx; reduced: boolean }) {
  switch (kind) {
    case 'zees': return <FxZees reduced={reduced} />;
    case 'hearts': return <FxHearts reduced={reduced} />;
    case 'sparkles': return <FxSparkles reduced={reduced} />;
    case 'confetti': return <FxConfetti reduced={reduced} />;
    case 'steam': return <FxSteam reduced={reduced} />;
    case 'sweat': return <FxSweat reduced={reduced} />;
    case 'question': return <FxQuestion reduced={reduced} />;
    case 'shine': return <FxShine reduced={reduced} />;
  }
}

function useLoop(durationMs: number, delayMs: number, reduced: boolean) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      t.value = 0;
      return;
    }
    t.value = 0;
    t.value = withDelay(
      delayMs,
      withRepeat(withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.cubic) }), -1, false),
    );
    return () => cancelAnimation(t);
  }, [durationMs, delayMs, reduced, t]);
  return t;
}

function FxZees({ reduced }: { reduced: boolean }) {
  // 3 Z's drifting up-right with staggered delays
  const items = [
    { delay: 0, x: 58, y: 32, fontSize: 11, char: 'z' },
    { delay: 1130, x: 65, y: 22, fontSize: 14, char: 'Z' },
    { delay: 2270, x: 74, y: 14, fontSize: 18, char: 'Z' },
  ];
  return (
    <SvgFx>
      {items.map((it, i) => (
        <ZeeOne key={i} {...it} reduced={reduced} />
      ))}
    </SvgFx>
  );
}

function ZeeOne({ delay, x, y, fontSize, char, reduced }: { delay: number; x: number; y: number; fontSize: number; char: string; reduced: boolean }) {
  const t = useLoop(3400, delay, reduced);
  const animatedProps = useAnimatedStyle(() => ({
    opacity: t.value < 0.2 ? t.value / 0.2 : 1 - (t.value - 0.2) / 0.8,
    transform: [{ translateX: t.value * 20 }, { translateY: -t.value * 90 }, { scale: 0.6 + t.value * 0.6 }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedProps]}>
      <SvgFx>
        <SvgText x={x} y={y} fontSize={fontSize} fontWeight="800" fill="#5A4534">
          {char}
        </SvgText>
      </SvgFx>
    </Animated.View>
  );
}

function FxHearts({ reduced }: { reduced: boolean }) {
  const heartPath = 'M5 2 C 6 0, 10 1, 5 6 C 0 1, 4 0, 5 2 Z';
  const items = [
    { delay: 0, x: 60, y: 30, scale: 1.2 },
    { delay: 400, x: 70, y: 35, scale: 0.9 },
    { delay: 800, x: 55, y: 38, scale: 1.0 },
  ];
  return (
    <>
      {items.map((it, i) => (
        <HeartOne key={i} d={heartPath} {...it} reduced={reduced} />
      ))}
    </>
  );
}

function HeartOne({ d, delay, x, y, scale, reduced }: { d: string; delay: number; x: number; y: number; scale: number; reduced: boolean }) {
  const t = useLoop(1600, delay, reduced);
  const animStyle = useAnimatedStyle(() => ({
    opacity: t.value < 0.2 ? t.value * 5 : 1 - (t.value - 0.2) / 0.8,
    transform: [
      { translateX: -t.value * 15 },
      { translateY: -t.value * 80 },
      { scale: 0.4 + t.value * 1 },
    ],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
      <SvgFx>
        <G transform={`translate(${x} ${y}) scale(${scale})`}>
          <Path d={d} fill="#E04330" stroke="#3A1A12" strokeWidth={0.6} />
        </G>
      </SvgFx>
    </Animated.View>
  );
}

function FxSparkles({ reduced }: { reduced: boolean }) {
  const star = 'M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z';
  const items = [
    { delay: 0, x: 20, y: 25, scale: 1.2 },
    { delay: 350, x: 78, y: 32, scale: 1.5 },
    { delay: 700, x: 15, y: 65, scale: 1.0 },
    { delay: 1050, x: 82, y: 70, scale: 1.3 },
  ];
  return (
    <>
      {items.map((it, i) => (
        <SparkleOne key={i} d={star} {...it} reduced={reduced} />
      ))}
    </>
  );
}

function SparkleOne({ d, delay, x, y, scale, reduced }: { d: string; delay: number; x: number; y: number; scale: number; reduced: boolean }) {
  const t = useLoop(1400, delay, reduced);
  const animStyle = useAnimatedStyle(() => {
    const phase = Math.abs(Math.sin(t.value * Math.PI));
    return {
      opacity: phase,
      transform: [{ scale: 0.3 + phase * 0.7 }],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
      <SvgFx>
        <G transform={`translate(${x} ${y}) scale(${scale})`}>
          <Path d={d} fill="#FFD45C" />
        </G>
      </SvgFx>
    </Animated.View>
  );
}

function FxConfetti({ reduced }: { reduced: boolean }) {
  const pieces = [
    { delay: 0, dx: -55, dy: -50, rot: -180, type: 'rect', fill: '#E87C2C' },
    { delay: 100, dx: 55, dy: -55, rot: 200, type: 'circle', fill: '#5FA84B' },
    { delay: 50, dx: -25, dy: -75, rot: -240, type: 'rect', fill: '#8E5BB8' },
    { delay: 180, dx: 25, dy: -70, rot: 280, type: 'circle', fill: '#FFD45C' },
    { delay: 250, dx: -70, dy: -20, rot: -300, type: 'rect', fill: '#E04330' },
    { delay: 320, dx: 70, dy: -25, rot: 320, type: 'rect', fill: '#3D9CD8' },
  ];
  return (
    <>
      {pieces.map((p, i) => (
        <ConfettiOne key={i} {...p} reduced={reduced} />
      ))}
    </>
  );
}

function ConfettiOne({ delay, dx, dy, rot, type, fill, reduced }: { delay: number; dx: number; dy: number; rot: number; type: string; fill: string; reduced: boolean }) {
  const t = useLoop(2000, delay, reduced);
  const animStyle = useAnimatedStyle(() => ({
    opacity: t.value < 0.1 ? t.value * 10 : t.value < 0.6 ? 1 : 1 - (t.value - 0.6) / 0.4,
    transform: [
      { translateX: dx * t.value },
      { translateY: dy * t.value },
      { rotate: `${rot * t.value}deg` },
    ],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
      <SvgFx>
        {type === 'rect' ? (
          <Rect x={49} y={48} width={3} height={3} fill={fill} />
        ) : (
          <Circle cx={50} cy={48} r={1.6} fill={fill} />
        )}
      </SvgFx>
    </Animated.View>
  );
}

function FxSteam({ reduced }: { reduced: boolean }) {
  const items = [
    { delay: 0, cx: 38, rx: 3.5, ry: 2.5 },
    { delay: 800, cx: 50, rx: 4, ry: 2.8 },
    { delay: 1600, cx: 62, rx: 3.2, ry: 2.3 },
  ];
  return (
    <>
      {items.map((it, i) => (
        <SteamOne key={i} {...it} reduced={reduced} />
      ))}
    </>
  );
}

function SteamOne({ delay, cx, rx, ry, reduced }: { delay: number; cx: number; rx: number; ry: number; reduced: boolean }) {
  const t = useLoop(2400, delay, reduced);
  const animStyle = useAnimatedStyle(() => ({
    opacity: t.value < 0.3 ? (t.value / 0.3) * 0.8 : 0.8 * (1 - (t.value - 0.3) / 0.7),
    transform: [{ translateY: -t.value * 60 }, { scale: 0.3 + t.value * 1.3 }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
      <SvgFx>
        <Ellipse cx={cx} cy={14} rx={rx} ry={ry} fill="#FFFFFF" opacity={0.85} />
      </SvgFx>
    </Animated.View>
  );
}

function FxSweat({ reduced }: { reduced: boolean }) {
  const t = useLoop(2000, 0, reduced);
  const animStyle = useAnimatedStyle(() => ({
    opacity: t.value < 0.2 ? t.value * 5 : 1 - (t.value - 0.2) / 0.8,
    transform: [{ translateY: t.value * 60 }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
      <SvgFx>
        <G transform="translate(30 38)">
          <Path d="M0 0 C -2.5 4, -2.5 7, 0 7 C 2.5 7, 2.5 4, 0 0 Z" fill="#3D9CD8" />
        </G>
      </SvgFx>
    </Animated.View>
  );
}

function FxQuestion({ reduced }: { reduced: boolean }) {
  const items = [
    { delay: 0, x: 68, y: 28, fontSize: 14 },
    { delay: 700, x: 76, y: 20, fontSize: 11 },
  ];
  return (
    <>
      {items.map((it, i) => (
        <QuestionOne key={i} {...it} reduced={reduced} />
      ))}
    </>
  );
}

function QuestionOne({ delay, x, y, fontSize, reduced }: { delay: number; x: number; y: number; fontSize: number; reduced: boolean }) {
  const t = useLoop(2200, delay, reduced);
  const animStyle = useAnimatedStyle(() => ({
    opacity: t.value < 0.3 ? t.value / 0.3 : 1 - (t.value - 0.3) / 0.7,
    transform: [
      { translateX: t.value * 20 },
      { translateY: -t.value * 50 },
      { rotate: `${-10 + t.value * 25}deg` },
      { scale: 0.7 + t.value * 0.4 },
    ],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
      <SvgFx>
        <SvgText x={x} y={y} fontSize={fontSize} fontWeight="700" fill="#5A4534">
          ?
        </SvgText>
      </SvgFx>
    </Animated.View>
  );
}

function FxShine({ reduced }: { reduced: boolean }) {
  const items = [
    { delay: 0, cx: 72, cy: 36 },
    { delay: 500, cx: 22, cy: 30 },
    { delay: 1000, cx: 82, cy: 60 },
  ];
  return (
    <>
      {items.map((it, i) => (
        <ShineOne key={i} {...it} reduced={reduced} />
      ))}
    </>
  );
}

function ShineOne({ delay, cx, cy, reduced }: { delay: number; cx: number; cy: number; reduced: boolean }) {
  const t = useLoop(2000, delay, reduced);
  const animStyle = useAnimatedStyle(() => ({
    opacity: t.value < 0.3 ? t.value / 0.3 : 1 - (t.value - 0.3) / 0.7,
    transform: [{ scale: 0.4 + t.value * 1.2 }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
      <SvgFx>
        <G transform={`translate(${cx} ${cy})`}>
          <Line x1={0} y1={-7} x2={0} y2={-3} stroke="#FFD45C" strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={5} y1={-5} x2={2.5} y2={-2.5} stroke="#FFD45C" strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={7} y1={0} x2={3} y2={0} stroke="#FFD45C" strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={5} y1={5} x2={2.5} y2={2.5} stroke="#FFD45C" strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={0} y1={7} x2={0} y2={3} stroke="#FFD45C" strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={-5} y1={5} x2={-2.5} y2={2.5} stroke="#FFD45C" strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={-7} y1={0} x2={-3} y2={0} stroke="#FFD45C" strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={-5} y1={-5} x2={-2.5} y2={-2.5} stroke="#FFD45C" strokeWidth={1.4} strokeLinecap="round" />
        </G>
      </SvgFx>
    </Animated.View>
  );
}

function SvgFx({ children }: { children: React.ReactNode }) {
  return (
    <Svg viewBox="0 0 100 100" width="100%" height="100%">
      {children}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  body: {
    width: '100%',
    height: '100%',
  },
});
