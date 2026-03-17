import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Keyboard,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MentionData, MentionSuggestion, MAX_MENTIONS } from '@/features/mentions/domain/Mention';
import { useMentionSearch } from '@/features/mentions/ui/useMentionSearch';
import MentionSuggestionRow from './MentionSuggestionRow';

interface MentionTextInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (text: string) => void;
  mentions: MentionData[];
  onMentionsChange: (mentions: MentionData[]) => void;
  inputRef?: React.RefObject<TextInput | null>;
  dropdownMaxHeight?: number;
  containerStyle?: object;
}

/**
 * Extracts the @mention trigger query from text at the given cursor position.
 * Returns the query string (without @) if a trigger is active, or null otherwise.
 */
function extractMentionQuery(text: string, cursorPos: number): string | null {
  // Walk backwards from cursor to find the @ sign
  let i = cursorPos - 1;
  while (i >= 0) {
    const char = text[i];
    if (char === '@') {
      // Check that @ is at start of text or preceded by whitespace/newline
      if (i === 0 || /\s/.test(text[i - 1])) {
        const query = text.substring(i + 1, cursorPos);
        // Query must not contain spaces (that would end the trigger)
        if (!/\s/.test(query)) {
          return query;
        }
      }
      return null;
    }
    if (/\s/.test(char)) {
      return null;
    }
    i--;
  }
  return null;
}

/**
 * Reconciles the mentions array with the current text.
 * Removes mentions whose @username no longer appears in the text.
 */
function reconcileMentions(text: string, mentions: MentionData[]): MentionData[] {
  return mentions.filter((m) => {
    const pattern = `@${m.username}`;
    return text.includes(pattern);
  });
}

export default function MentionTextInput({
  value,
  onChangeText,
  mentions,
  onMentionsChange,
  inputRef: externalRef,
  dropdownMaxHeight = 200,
  containerStyle,
  style,
  ...textInputProps
}: MentionTextInputProps) {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [triggerQuery, setTriggerQuery] = useState<string | null>(null);
  const [inputLayout, setInputLayout] = useState({ y: 0, height: 0 });
  const internalRef = useRef<TextInput>(null);
  const ref = externalRef || internalRef;

  const { suggestions, loading, search, clear } = useMentionSearch();

  const dropdownOpacity = useSharedValue(0);
  const dropdownTranslateY = useSharedValue(8);

  const showDropdown = triggerQuery !== null && triggerQuery.length > 0 && mentions.length < MAX_MENTIONS;

  useEffect(() => {
    if (showDropdown) {
      dropdownOpacity.value = withTiming(1, { duration: 150 });
      dropdownTranslateY.value = withTiming(0, { duration: 150 });
    } else {
      dropdownOpacity.value = withTiming(0, { duration: 100 });
      dropdownTranslateY.value = withTiming(8, { duration: 100 });
    }
  }, [showDropdown]);

  const animatedDropdownStyle = useAnimatedStyle(() => ({
    opacity: dropdownOpacity.value,
    transform: [{ translateY: dropdownTranslateY.value }],
  }));

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const pos = e.nativeEvent.selection.end;
      setCursorPosition(pos);
    },
    []
  );

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);

      // Reconcile mentions — remove any whose @username was deleted
      const reconciled = reconcileMentions(text, mentions);
      if (reconciled.length !== mentions.length) {
        onMentionsChange(reconciled);
      }
    },
    [onChangeText, mentions, onMentionsChange]
  );

  // Update trigger query when text or cursor changes
  useEffect(() => {
    const query = extractMentionQuery(value, cursorPosition);
    setTriggerQuery(query);

    if (query && query.length > 0 && mentions.length < MAX_MENTIONS) {
      search(query);
    } else {
      clear();
    }
  }, [value, cursorPosition, mentions.length]);

  const handleSelectSuggestion = useCallback(
    (suggestion: MentionSuggestion) => {
      if (!triggerQuery && triggerQuery !== '') return;

      // Find the @ position for the current trigger
      const triggerStart = value.lastIndexOf('@' + triggerQuery, cursorPosition);
      if (triggerStart === -1) return;

      const before = value.substring(0, triggerStart);
      const after = value.substring(cursorPosition);
      const insertedText = `@${suggestion.username} `;
      const newText = before + insertedText + after;

      onChangeText(newText);

      // Add to mentions (deduplicate by userId)
      const alreadyMentioned = mentions.some((m) => m.userId === suggestion.userId);
      if (!alreadyMentioned) {
        onMentionsChange([
          ...mentions,
          { userId: suggestion.userId, username: suggestion.username },
        ]);
      }

      // Clear search
      setTriggerQuery(null);
      clear();

      // Move cursor after the inserted mention
      const newCursorPos = before.length + insertedText.length;
      setCursorPosition(newCursorPos);

      // Set selection on next frame
      setTimeout(() => {
        if (ref.current) {
          ref.current.setNativeProps({
            selection: { start: newCursorPos, end: newCursorPos },
          });
        }
      }, 50);
    },
    [triggerQuery, value, cursorPosition, mentions, onChangeText, onMentionsChange, clear, ref]
  );

  const handleInputLayout = useCallback((e: LayoutChangeEvent) => {
    setInputLayout({
      y: e.nativeEvent.layout.y,
      height: e.nativeEvent.layout.height,
    });
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Dropdown positioned above the input */}
      {showDropdown && suggestions.length > 0 && (
        <Animated.View
          style={[
            styles.dropdown,
            { maxHeight: dropdownMaxHeight },
            animatedDropdownStyle,
          ]}
        >
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => (
              <MentionSuggestionRow
                suggestion={item}
                onPress={handleSelectSuggestion}
              />
            )}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          />
        </Animated.View>
      )}

      <TextInput
        ref={ref}
        value={value}
        onChangeText={handleChangeText}
        onSelectionChange={handleSelectionChange}
        onLayout={handleInputLayout}
        style={style}
        {...textInputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 4,
    overflow: 'hidden',
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
