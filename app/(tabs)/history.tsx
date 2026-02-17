import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Searchbar, Surface, Text, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import apiService from '../../src/services/api';
import { borderRadius, colors, shadows, spacing } from '../../src/theme';
import { HistoryItem } from '../../src/types';
import { getResponsiveFontSize, getResponsiveSize } from '../../src/utils/responsive';

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
    return date.toLocaleDateString();
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
            <Text style={[styles.playerTypeIcon, { fontSize: getResponsiveSize(28) }]}>
              {getPlayerTypeIcon(item.player_type)}
            </Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.filename, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
              {item.filename}
            </Text>
            <Text style={[styles.date, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
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
          <Text style={[styles.fileSize, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(10) }]}>
            {formatFileSize(item.size)}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleViewResult(item)}
          >
            <Text style={[styles.viewButtonText, { fontSize: getResponsiveFontSize(12) }]}>View Analysis</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: colors.cricket.green }]}
            onPress={() => router.push({
              pathname: '/training-plan',
              params: { filename: item.filename, days: '7' }
            })}
          >
            <Text style={[styles.viewButtonText, { fontSize: getResponsiveFontSize(12) }]}>Training Plan</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyIcon, { fontSize: getResponsiveSize(56) }]}>📋</Text>
      <Text style={[styles.emptyTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(20) }]}>
        No Analysis History
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
        Upload your first cricket video to see analysis history here
      </Text>
      <TouchableOpacity
        style={[styles.uploadButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/upload')}
      >
        <Text style={[styles.uploadButtonText, { fontSize: getResponsiveFontSize(14) }]}>Upload Video</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
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
        <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(24) }]}>
          Analysis History
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
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
        <>
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
          {/* Compare Button */}
          <View style={styles.compareButtonContainer}>
            <TouchableOpacity
              style={[styles.compareButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push('/compare')}
            >
              <Text style={[styles.compareButtonText, { fontSize: getResponsiveFontSize(16) }]}>
                Compare Videos
              </Text>
            </TouchableOpacity>
          </View>
        </>
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
    padding: getResponsiveSize(spacing.lg),
    paddingTop: getResponsiveSize(spacing.xl + 20),
    ...shadows.sm,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  subtitle: {
    // fontSize set dynamically
  },
  searchContainer: {
    padding: getResponsiveSize(spacing.lg),
    paddingTop: getResponsiveSize(spacing.md),
  },
  searchBar: {
    marginBottom: getResponsiveSize(spacing.md),
  },
  filterContainer: {
    flexDirection: 'row',
    gap: getResponsiveSize(spacing.sm),
  },
  filterButton: {
    flex: 1,
    paddingVertical: getResponsiveSize(spacing.sm),
    paddingHorizontal: getResponsiveSize(spacing.md),
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
    fontSize: getResponsiveFontSize(12),
    fontWeight: '500',
    color: '#757575', // theme.colors.onSurfaceVariant equivalent
  },
  filterTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: getResponsiveSize(spacing.lg),
    paddingTop: getResponsiveSize(spacing.sm),
  },
  historyCard: {
    marginBottom: getResponsiveSize(spacing.lg),
    ...shadows.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(spacing.md),
  },
  itemIcon: {
    marginRight: getResponsiveSize(spacing.md),
  },
  playerTypeIcon: {
    // fontSize set dynamically
  },
  itemInfo: {
    flex: 1,
  },
  filename: {
    fontWeight: '600',
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  date: {
    // fontSize set dynamically
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
    gap: getResponsiveSize(spacing.xs),
    marginBottom: getResponsiveSize(spacing.md),
  },
  detailChip: {
    marginBottom: getResponsiveSize(spacing.xs),
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(spacing.md),
  },
  fileSize: {
    // fontSize set dynamically
  },
  viewButton: {
    paddingVertical: getResponsiveSize(spacing.sm),
    paddingHorizontal: getResponsiveSize(spacing.md),
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: getResponsiveSize(spacing.xs),
  },
  viewButtonText: {
    color: 'white',
    fontWeight: '600',
    // fontSize set dynamically
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: getResponsiveSize(spacing.md),
    gap: getResponsiveSize(spacing.sm),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: getResponsiveSize(spacing.md),
    // fontSize set dynamically
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(spacing.xl),
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: getResponsiveSize(spacing.lg),
    // fontSize set dynamically
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(spacing.sm),
    textAlign: 'center',
    // fontSize set dynamically
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: getResponsiveSize(spacing.xl),
    lineHeight: getResponsiveSize(24),
    // fontSize set dynamically
  },
  uploadButton: {
    paddingVertical: getResponsiveSize(spacing.md),
    paddingHorizontal: getResponsiveSize(spacing.xl),
    borderRadius: borderRadius.lg,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: '600',
    // fontSize set dynamically
  },
  compareButtonContainer: {
    padding: getResponsiveSize(spacing.lg),
    paddingTop: getResponsiveSize(spacing.md),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  compareButton: {
    paddingVertical: getResponsiveSize(spacing.md),
    paddingHorizontal: getResponsiveSize(spacing.lg),
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareButtonText: {
    color: 'white',
    fontWeight: '600',
    // fontSize set dynamically
  },
}); 