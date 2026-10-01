import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BibleBook } from '../../../domain/entities/BibleBook';

interface ChaptersScreenProps {
  readonly book: BibleBook;
  readonly onSelectChapter: (chapter: number) => void;
}

export function ChaptersScreen({ book, onSelectChapter }: ChaptersScreenProps) {
  const chapters = Array.from({ length: book.chapterCount }, (_, index) => index + 1);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <FlatList
        data={chapters}
        keyExtractor={(chapter) => String(chapter)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: chapter }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Chapter ${chapter}`}
            onPress={() => onSelectChapter(chapter)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.chapterName}>Chapter {chapter}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  row: {
    minHeight: 56,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dddddd',
  },
  rowPressed: {
    backgroundColor: '#f2f2f2',
  },
  chapterName: {
    color: '#111111',
    fontSize: 18,
    lineHeight: 26,
  },
});
