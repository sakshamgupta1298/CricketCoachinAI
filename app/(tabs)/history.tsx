import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Searchbar, Surface, Text, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import apiService from '../../src/services/api';
import { borderRadius, colors, shadows, spacing } from '../../src/theme';
import { HistoryItem } from '../../src/types';

export default function HistoryScreen() {
  const theme = useTheme();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'batsman' | 'bowler'>('all');

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAnalysisHistory();
      
      if (response.success && response.data) {
        setHistory(response.data);
        setFilteredHistory(response.data);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to load history',
          text2: response.error || 'Please try again',
        });
      }
    } catch (error) {
      console.error('Error loading history:', error);
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Failed to connect to server',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    let filtered = history;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.shot_type && item.shot_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.bowler_type && item.bowler_type.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply player type filter
    if (filter !== 'all') {
      filtered = filtered.filter(item => item.player_type === filter);
    }

    setFilteredHistory(filtered);
  }, [history, searchQuery, filter]);

  const getPlayerTypeIcon = (type: string) => {
    return type === 'batsman' ? '🏏' : type === 'bowler' ? '🎯' : '❓';
  };

  const getPlayerTypeColor = (type: string) => {
    return type === 'batsman' ? colors.cricket.green : 
           type === 'bowler' ? colors.cricket.blue : 
           colors.cricket.orange;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleViewResult = async (item: HistoryItem) => {
    try {
      const response = await apiService.getAnalysisResult(item.filename);
      
      if (response.success && response.data) {
        router.push({
          pathname: '/results',
          params: { result: JSON.stringify(response.data) }
        });
      } else {
        Alert.alert('Error', 'Failed to load analysis result. Please try again.');
      }
    } catch (error) {
      console.error('Error loading result:', error);
      Alert.alert('Error', 'Failed to load analysis result.');
    }
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <Card style={[styles.historyCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <View style={styles.itemIcon}>
            <Text style={styles.playerTypeIcon}>
              {getPlayerTypeIcon(item.player_type)}
            </Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.filename, { color: theme.colors.onSurface }]}>
              {item.filename}
            </Text>
            <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
              {formatDate(item.created)}
            </Text>
          </View>
          <View style={styles.itemStatus}>
            <Chip
              mode="outlined"
              style={[styles.statusChip, { borderColor: getPlayerTypeColor(item.player_type) }]}
              textStyle={{ color: getPlayerTypeColor(item.player_type) }}
            >
              {item.player_type.toUpperCase()}
            </Chip>
          </View>
        </View>

        <View style={styles.itemDetails}>
          {item.shot_type && (
            <Chip mode="outlined" style={styles.detailChip}>
              Shot: {item.shot_type.replace('_', ' ').toUpperCase()}
            </Chip>
          )}
          {item.bowler_type && (
            <Chip mode="outlined" style={styles.detailChip}>
              {item.bowler_type.replace('_', ' ').toUpperCase()}
            </Chip>
          )}
          {item.batter_side && (
            <Chip mode="outlined" style={styles.detailChip}>
              {item.batter_side.toUpperCase()} Side
            </Chip>
          )}
          {item.bowler_side && (
            <Chip mode="outlined" style={styles.detailChip}>
              {item.bowler_side.toUpperCase()} Side
            </Chip>
          )}
        </View>

        <View style={styles.itemFooter}>
          <Text style={[styles.fileSize, { color: theme.colors.onSurfaceVariant }]}>
            {formatFileSize(item.size)}
          </Text>
          {item.has_gpt_feedback && (
            <Chip mode="outlined" style={styles.gptChip}>
              GPT Analysis
            </Chip>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleViewResult(item)}
          >
            <Text style={styles.viewButtonText}>View Analysis</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: colors.cricket.green }]}
            onPress={() => router.push({
              pathname: '/training-plan',
              params: { filename: item.filename, days: '7' }
            })}
          >
            <Text style={styles.viewButtonText}>Training Plan</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={[styles.emptyTitle, { color: theme.colors.onBackground }]}>
        No Analysis History
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        Upload your first cricket video to see analysis history here
      </Text>
      <TouchableOpacity
        style={[styles.uploadButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/upload')}
      >
        <Text style={styles.uploadButtonText}>Upload Video</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading history...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Analysis History
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {filteredHistory.length} analysis{filteredHistory.length !== 1 ? 'es' : ''} found
        </Text>
      </Surface>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by filename, shot type, or bowler type..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'batsman' && styles.filterButtonActive]}
            onPress={() => setFilter('batsman')}
          >
            <Text style={[styles.filterText, filter === 'batsman' && styles.filterTextActive]}>
              Batsman
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'bowler' && styles.filterButtonActive]}
            onPress={() => setFilter('bowler')}
          >
            <Text style={[styles.filterText, filter === 'bowler' && styles.filterTextActive]}>
              Bowler
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* History List */}
      {filteredHistory.length > 0 ? (
        <FlatList
          data={filteredHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView 
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderEmptyState()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl + 20,
    ...shadows.small,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
  },
  searchContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  searchBar: {
    marginBottom: spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BDBDBD', // theme.colors.outline equivalent
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1976D2', // theme.colors.primary equivalent
    borderColor: '#1976D2',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575', // theme.colors.onSurfaceVariant equivalent
  },
  filterTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  historyCard: {
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemIcon: {
    marginRight: spacing.md,
  },
  playerTypeIcon: {
    fontSize: 32,
  },
  itemInfo: {
    flex: 1,
  },
  filename: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: 14,
  },
  itemStatus: {
    alignItems: 'flex-end',
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailChip: {
    marginBottom: spacing.xs,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  fileSize: {
    fontSize: 12,
  },
  gptChip: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  viewButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  viewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  uploadButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 