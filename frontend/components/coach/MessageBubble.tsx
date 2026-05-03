// frontend/components/coach/MessageBubble.tsx
// 10Y-B: Coach chat bubble. Pastel sage (assistant) / blush (user). Lightweight
// markdown — paragraph + bullet list (`* x`) + inline bold (**x**). Long replies
// (>480 chars) collapse behind a "Read more" pill until tapped.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark, Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/Shadows';

const COLLAPSE_THRESHOLD = 480;

export type CoachRole = 'assistant' | 'user';

interface MessageBubbleProps {
  role: CoachRole;
  content: string;
}

interface ParsedBlock {
  kind: 'paragraph' | 'list';
  lines: string[];
}

// Collapse runs of `* …` lines into one list block; everything else is a paragraph.
function parseBlocks(input: string): ParsedBlock[] {
  const lines = input.split('\n');
  const blocks: ParsedBlock[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: 'paragraph', lines: [para.join('\n')] });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ kind: 'list', lines: list });
      list = [];
    }
  };

  for (const raw of lines) {
    const m = raw.match(/^\s*\*\s+(.*)$/);
    if (m) {
      flushPara();
      list.push(m[1]);
    } else {
      flushList();
      if (raw.trim().length === 0) {
        flushPara();
      } else {
        para.push(raw);
      }
    }
  }
  flushPara();
  flushList();
  return blocks;
}

// Inline **bold** segments. Returns React nodes.
function renderInline(text: string, baseColor: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <Text key={i} style={{ fontWeight: '700', color: baseColor }}>
          {m[1]}
        </Text>
      );
    }
    return (
      <Text key={i} style={{ color: baseColor }}>
        {part}
      </Text>
    );
  });
}

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);

  const isLong = content.length > COLLAPSE_THRESHOLD;
  const visible = isLong && !expanded ? content.slice(0, COLLAPSE_THRESHOLD) : content;
  const blocks = useMemo(() => parseBlocks(visible), [visible]);

  const isAssistant = role === 'assistant';
  const bg = isAssistant
    ? (isDark ? PastelDark.sage : Pastel.sage)
    : (isDark ? PastelDark.blush : Pastel.blush);
  const textColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const a11yLabel = isAssistant ? 'Coach reply' : 'Your message';

  return (
    <View
      testID="coach-bubble-wrapper"
      style={[
        styles.wrapper,
        { alignSelf: isAssistant ? 'flex-start' : 'flex-end' },
      ]}
    >
      <View
        testID={isAssistant ? 'coach-bubble-assistant' : 'coach-bubble-user'}
        accessibilityLabel={a11yLabel}
        accessibilityRole="text"
        style={[styles.bubble, Shadows.SM as any, { backgroundColor: bg }]}
      >
        {blocks.map((block, idx) => {
          if (block.kind === 'list') {
            return (
              <View key={idx} style={styles.listBlock}>
                {block.lines.map((line, j) => (
                  <View key={j} style={styles.listRow}>
                    <Text style={[styles.bullet, { color: textColor }]}>•</Text>
                    <Text style={[styles.bodyText, { color: textColor, flex: 1 }]}>
                      {renderInline(line, textColor)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          }
          return (
            <Text key={idx} style={[styles.bodyText, { color: textColor }]}>
              {renderInline(block.lines[0] ?? '', textColor)}
            </Text>
          );
        })}

        {isLong && !expanded && (
          <HapticTouchableOpacity
            onPress={() => setExpanded(true)}
            accessibilityLabel="Read full message"
            style={[styles.readMore, { backgroundColor: isDark ? DarkColors.surface : '#FFFFFF' }]}
          >
            <Text style={[styles.readMoreText, { color: isDark ? DarkColors.primary : Colors.primary }]}>
              Read more
            </Text>
          </HapticTouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: '86%',
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  listBlock: {
    gap: 6,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
  },
  readMore: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
