import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSubmissions } from '@/src/hooks/useSubmissions';

export default function FormSubmissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: submissions, isLoading, refetch, isRefetching } = useSubmissions(id);

  const getPreview = (formData: Record<string, any>): string => {
    const values = Object.values(formData || {})
      .filter(v => typeof v === 'string' && v.trim().length > 0)
      .slice(0, 3);
    return values.join(' | ') || 'Inga värden';
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#e8622c" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => router.push(`/form/${id}/submission/${item.id}`)}>
            <Card style={styles.card} mode="outlined">
              <Card.Content style={styles.cardContent}>
                <View style={styles.numberBadge}>
                  <Text style={styles.number}>#{(submissions?.length || 0) - index}</Text>
                </View>
                <View style={styles.details}>
                  <Text variant="bodySmall" style={styles.date}>
                    {new Date(item.submitted_at).toLocaleDateString('sv-SE')}{' '}
                    {new Date(item.submitted_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text variant="bodySmall" style={styles.preview} numberOfLines={1}>
                    {getPreview(item.form_data)}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
              </Card.Content>
            </Card>
          </Pressable>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#e8622c" />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialCommunityIcons name="inbox-outline" size={64} color="#555" />
            <Text style={styles.emptyText}>Inga inskickningar ännu</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  list: { padding: 16 },
  card: {
    marginBottom: 8,
    backgroundColor: '#1e1e2e',
    borderColor: '#2d2d44',
    borderRadius: 12,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: { color: '#e8622c', fontWeight: 'bold', fontSize: 12 },
  details: { flex: 1 },
  date: { color: '#aaa' },
  preview: { color: '#888', marginTop: 4 },
  emptyText: { color: '#888', marginTop: 16 },
});
