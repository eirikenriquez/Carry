import type { ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BibleBook } from '../models/BibleBook';

interface BooksScreenProps {
  readonly books: readonly BibleBook[];
  readonly onSelectBook: (book: BibleBook) => void;
  readonly referenceLookup: ReactNode;
}

export function BooksScreen({ books, onSelectBook, referenceLookup }: BooksScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <FlatList
        data={books}
        ListHeaderComponent={<>{referenceLookup}</>}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(book) => book.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: book }) => {
          const chapterLabel = book.chapterCount === 1 ? 'chapter' : 'chapters';

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${book.name}, ${book.chapterCount} ${chapterLabel}`}
              onPress={() => onSelectBook(book)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={styles.bookName}>{book.name}</Text>
              <Text style={styles.chapterCount}>
                {book.chapterCount} {chapterLabel}
              </Text>
            </Pressable>
          );
        }}
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
    minHeight: 60,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dddddd',
    paddingVertical: 10,
  },
  rowPressed: {
    backgroundColor: '#f2f2f2',
  },
  bookName: {
    color: '#111111',
    fontSize: 18,
    lineHeight: 24,
  },
  chapterCount: {
    marginTop: 2,
    color: '#555555',
    fontSize: 14,
    lineHeight: 20,
  },
});
