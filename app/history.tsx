import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { getQuizHistory, clearQuizHistory } from '../lib/database';

interface HistoryItem {
  id: number;
  date: string;
  mode: string;
  category_name: string;
  difficulty: string;
  player_count: number;
  score_data: string;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const data = await getQuizHistory();
    setHistory(data as HistoryItem[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all quiz history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: async () => {
          await clearQuizHistory();
          loadHistory();
        }}
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderScores = (scoreData: string) => {
    try {
      const scores = JSON.parse(scoreData);
      return scores.map((s: any) => (
        <View key={s.id} style={styles.playerScore}>
          <Text style={styles.playerName}>{s.name}:</Text>
          <Text style={styles.playerVal}>{s.score}</Text>
        </View>
      ));
    } catch (e) {
      return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Quiz History',
          headerRight: () => (
            <TouchableOpacity onPress={handleClearHistory} disabled={history.length === 0}>
              <Text style={[styles.clearText, history.length === 0 && { opacity: 0.3 }]}>Clear</Text>
            </TouchableOpacity>
          )
        }} 
      />
      
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No History Yet</Text>
          <Text style={styles.emptySubtitle}>Complete a quiz to see your scores here!</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.modeTag}>{item.mode.toUpperCase()}</Text>
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>
                <View style={[styles.diffTag, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
                  <Text style={styles.diffText}>{item.difficulty}</Text>
                </View>
              </View>

              <Text style={styles.categoryTitle}>{item.category_name || 'Deleted Category'}</Text>
              
              <View style={styles.scoresContainer}>
                {renderScores(item.score_data)}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function getDifficultyColor(diff: string) {
  switch (diff) {
    case 'Easy': return '#00AAFF';
    case 'Medium': return '#FDCB6E';
    case 'Hard': return '#FF7675';
    default: return '#636E72';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    color: '#FF7675',
    fontWeight: '700',
    fontSize: 16,
    marginRight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#636E72',
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1a73e8',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '600',
  },
  diffTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  diffText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 16,
  },
  scoresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
  },
  playerScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  playerVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a73e8',
  },
});
