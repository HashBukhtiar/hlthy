import React, { useMemo } from 'react';
import { Text, StyleProp, TextStyle, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MentionData } from '@/features/mentions/domain/Mention';
import { ACCENT_COLOR } from '@/constants/Colors';

interface MentionTextProps {
  text: string;
  mentions?: MentionData[];
  style?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

interface TextSegment {
  type: 'text' | 'mention';
  value: string;
  mention?: MentionData;
}

/**
 * Parses text into segments of plain text and mentions.
 * Matches @username patterns against the provided mentions array.
 */
function parseTextWithMentions(text: string, mentions: MentionData[]): TextSegment[] {
  if (!mentions || mentions.length === 0) {
    return [{ type: 'text', value: text }];
  }

  // Build a regex that matches any of the mentioned usernames preceded by @
  // Sort by username length descending to match longer usernames first
  const sorted = [...mentions].sort((a, b) => b.username.length - a.username.length);
  const escaped = sorted.map((m) => m.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`@(${escaped.join('|')})(?=\\s|$|[^a-zA-Z0-9_])`, 'g');

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add preceding plain text
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }

    const matchedUsername = match[1];
    const mentionData = mentions.find(
      (m) => m.username.toLowerCase() === matchedUsername.toLowerCase()
    );

    if (mentionData) {
      segments.push({
        type: 'mention',
        value: match[0],
        mention: mentionData,
      });
    } else {
      segments.push({ type: 'text', value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.substring(lastIndex) });
  }

  return segments;
}

export default function MentionText({
  text,
  mentions,
  style,
  mentionStyle,
  numberOfLines,
}: MentionTextProps) {
  const router = useRouter();

  const segments = useMemo(
    () => parseTextWithMentions(text, mentions || []),
    [text, mentions]
  );

  const handleMentionPress = (mention: MentionData) => {
    router.push(`/profile/${mention.userId}`);
  };

  if (!mentions || mentions.length === 0) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) => {
        if (segment.type === 'mention' && segment.mention) {
          return (
            <Text
              key={`mention-${index}`}
              style={[styles.mention, mentionStyle]}
              onPress={() => handleMentionPress(segment.mention!)}
            >
              {segment.value}
            </Text>
          );
        }
        return <Text key={`text-${index}`}>{segment.value}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  mention: {
    color: ACCENT_COLOR,
    fontWeight: '600',
  },
});
