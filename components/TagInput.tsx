import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { useTagSearch } from '@/features/tags/ui/useTagSearch';
import {
  MAX_TAGS,
  normalizeTag,
  type TagSearchResult,
} from '@/features/tags/domain/Tag';
import { TagSuggestionRow } from './TagSuggestionRow';
import { TagChip } from './TagChip';
import { ACCENT_COLOR } from '@/constants/Colors';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export const TagInput: React.FC<TagInputProps> = ({ tags, onTagsChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { suggestions, loading, search, clear } = useTagSearch();
  const inputRef = useRef<TextInput>(null);

  // Compute dropdown options
  const dropdownOptions = useMemo(() => {
    if (!inputValue.trim()) return [];

    const normalized = normalizeTag(inputValue);
    if (!normalized) return [];

    // Check if normalized form already exists in suggestions
    const exactExists = suggestions.some((s) => s.name === normalized);

    const options: (TagSearchResult | { name: string; isNew: true })[] = [
      ...suggestions,
    ];

    // Always add "create new" option if it doesn't already exist
    if (!exactExists) {
      options.unshift({ name: normalized, isNew: true });
    }

    return options;
  }, [inputValue, suggestions]);

  const handleTextChange = useCallback(
    (text: string) => {
      setInputValue(text);
      if (text.trim()) {
        setDropdownVisible(true);
        search(text);
      } else {
        setDropdownVisible(false);
        clear();
      }
    },
    [search, clear]
  );

  const addTag = useCallback(
    (tagName: string) => {
      const normalized = normalizeTag(tagName);
      if (!normalized) return;

      // Deduplication check
      if (tags.includes(normalized)) {
        setInputValue('');
        setDropdownVisible(false);
        return;
      }

      // Check if already at max
      if (tags.length >= MAX_TAGS) {
        return;
      }

      onTagsChange([...tags, normalized]);
      setInputValue('');
      setDropdownVisible(false);
      clear();
    },
    [tags, onTagsChange, clear]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onTagsChange(tags.filter((t) => t !== tag));
    },
    [tags, onTagsChange]
  );

  const handleInputSubmit = useCallback(
    (text: string) => {
      if (dropdownOptions.length > 0) {
        // Use the top suggestion (first option)
        addTag(dropdownOptions[0].name);
      } else if (text.trim()) {
        // Fallback: try to add raw text
        addTag(text);
      }
    },
    [dropdownOptions, addTag]
  );

  const isAtMax = tags.length >= MAX_TAGS;

  return (
    <View style={styles.container}>
      {tags.length > 0 && (
        <View style={styles.chipsContainer}>
          {tags.map((tag) => (
            <View key={tag} style={styles.chipWithClose}>
              <Text style={styles.chipText}>#{tag}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => removeTag(tag)}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!isAtMax ? (
        <View>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Add a tag…"
            placeholderTextColor="#666666"
            value={inputValue}
            onChangeText={handleTextChange}
            onSubmitEditing={() => handleInputSubmit(inputValue)}
            onFocus={() => inputValue.trim() && setDropdownVisible(true)}
            returnKeyType="done"
          />

          {dropdownVisible && (
            <View style={styles.dropdown}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading…</Text>
                </View>
              ) : dropdownOptions.length > 0 ? (
                <FlatList
                  data={dropdownOptions}
                  keyExtractor={(item, index) =>
                    `${item.name}-${index}`
                  }
                  renderItem={({ item }) => (
                    <TagSuggestionRow
                      result={item}
                      onPress={() => addTag(item.name)}
                    />
                  )}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No tags found</Text>
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.maxMessage}>Maximum {MAX_TAGS} tags reached</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chipWithClose: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: ACCENT_COLOR,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    marginLeft: 8,
    marginRight: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    maxHeight: 200,
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888888',
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888888',
    fontSize: 13,
  },
  maxMessage: {
    color: '#888888',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
});
