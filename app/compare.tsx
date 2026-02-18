import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Surface, Text, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import apiService from '../src/services/api';
import { borderRadius, colors, shadows, spacing } from '../src/theme';
import { HistoryItem } from '../src/types';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

export default function CompareScreen() {
  const theme = useTheme();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo1, setSelectedVideo1] = useState<HistoryItem | null>(null);
  const [selectedVideo2, setSelectedVideo2] = useState<HistoryItem | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAnalysisHistory();
      
      if (response.success && response.data) {
        setHistory(response.data);
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

  const canCompare = (item1: HistoryItem, item2: HistoryItem): boolean => {
    // Check if both videos have the same player type
    if (item1.player_type !== item2.player_type) {
      return false;
    }

    // For batsman: check shot_type and batter_side
    if (item1.player_type === 'batsman') {
      if (item1.shot_type !== item2.shot_type) {
        return false;
      }
      if (item1.batter_side !== item2.batter_side) {
        return false;
      }
    }

    // For bowler: check bowler_type and bowler_side
    if (item1.player_type === 'bowler') {
      if (item1.bowler_type !== item2.bowler_type) {
        return false;
      }
      if (item1.bowler_side !== item2.bowler_side) {
        return false;
      }
    }

    return true;
  };

  const handleVideoSelect = (item: HistoryItem) => {
    if (!selectedVideo1) {
      setSelectedVideo1(item);
    } else if (!selectedVideo2) {
      // Check if videos can be compared
      if (!canCompare(selectedVideo1, item)) {
        Alert.alert(
          'Cannot Compare',
          'Selected videos must have the same:\n' +
          (selectedVideo1.player_type === 'batsman'
            ? '- Shot type\n- Playing side (batsman)'
            : '- Bowling type\n- Playing side (bowler)')
        );
        return;
      }
      setSelectedVideo2(item);
    } else {
      // Reset selection
      setSelectedVideo1(item);
      setSelectedVideo2(null);
    }
  };

  const handleCompare = async () => {
    if (!selectedVideo1 || !selectedVideo2) {
      Alert.alert('Error', 'Please select two videos to compare');
      return;
    }

    if (!canCompare(selectedVideo1, selectedVideo2)) {
      Alert.alert(
        'Cannot Compare',
        'Selected videos must have the same shot type, bowling type, and playing side'
      );
      return;
    }

    try {
      setComparing(true);
      const response = await apiService.compareVideos(selectedVideo1.filename, selectedVideo2.filename);
      
      if (response.success && response.data) {
        router.push({
          pathname: '/compare-results',
          params: { 
            comparison: JSON.stringify(response.data),
            video1: selectedVideo1.filename,
            video2: selectedVideo2.filename
          }
        });
      } else {
        const errorMessage = response.error || 'Failed to compare videos';
        Alert.alert(
          'Comparison Error',
          errorMessage,
          [
            { text: 'OK', style: 'default' },
            ...(errorMessage.includes('timeout') || errorMessage.includes('unavailable') 
              ? [{ text: 'Retry', onPress: () => handleCompare() }]
              : [])
          ]
        );
      }
    } catch (error: any) {
      console.error('Error comparing videos:', error);
      const errorMessage = error?.message || 'Failed to compare videos. Please check your connection and try again.';
      Alert.alert(
        'Network Error',
        errorMessage,
        [
          { text: 'OK', style: 'default' },
          { text: 'Retry', onPress: () => handleCompare() }
        ]
      );
    } finally {
      setComparing(false);
    }
  };

  const getPlayerTypeIcon = (type: string) => {
    return type === 'batsman' ? '🏏' : type === 'bowler' ? '🎯' : '❓';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    const isSelected1 = selectedVideo1?.id === item.id;
    const isSelected2 = selectedVideo2?.id === item.id;
    const isSelected = isSelected1 || isSelected2;

    return (
      <TouchableOpacity
        onPress={() => handleVideoSelect(item)}
        activeOpacity={0.7}
      >
        <Card 
          style={[
            styles.historyCard, 
            { backgroundColor: theme.colors.surface },
            isSelected && { borderWidth: 2, borderColor: theme.colors.primary }
          ]}
        >
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
              {isSelected && (
                <Chip
                  mode="flat"
                  style={[styles.selectedChip, { backgroundColor: theme.colors.primary }]}
                  textStyle={{ color: 'white' }}
                >
                  {isSelected1 ? 'Video 1' : 'Video 2'}
                </Chip>
              )}
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
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
            Loading videos...
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
          Compare Videos
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
          Select two videos with the same shot type, bowling type, and playing side
        </Text>
      </Surface>

      {/* Selection Status */}
      <View style={styles.selectionStatus}>
        <View style={styles.selectionItem}>
          <Text style={[styles.selectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            Video 1:
          </Text>
          <Text style={[styles.selectionValue, { color: theme.colors.onSurface }]}>
            {selectedVideo1?.filename || 'Not selected'}
          </Text>
        </View>
        <View style={styles.selectionItem}>
          <Text style={[styles.selectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            Video 2:
          </Text>
          <Text style={[styles.selectionValue, { color: theme.colors.onSurface }]}>
            {selectedVideo2?.filename || 'Not selected'}
          </Text>
        </View>
      </View>

      {/* History List */}
      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Compare Button */}
      <View style={styles.compareButtonContainer}>
        <TouchableOpacity
          style={[
            styles.compareButton, 
            { 
              backgroundColor: (selectedVideo1 && selectedVideo2) ? theme.colors.primary : '#CCCCCC',
              opacity: comparing ? 0.6 : 1
            }
          ]}
          onPress={handleCompare}
          disabled={!selectedVideo1 || !selectedVideo2 || comparing}
        >
          {comparing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={[styles.compareButtonText, { fontSize: getResponsiveFontSize(16) }]}>
              Compare Videos
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  },
  subtitle: {
    marginTop: getResponsiveSize(spacing.xs),
  },
  selectionStatus: {
    padding: getResponsiveSize(spacing.lg),
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectionItem: {
    flexDirection: 'row',
    marginBottom: getResponsiveSize(spacing.sm),
  },
  selectionLabel: {
    fontWeight: '600',
    marginRight: getResponsiveSize(spacing.sm),
    fontSize: getResponsiveFontSize(14),
  },
  selectionValue: {
    flex: 1,
    fontSize: getResponsiveFontSize(14),
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
  },
  date: {
    // fontSize set dynamically
  },
  selectedChip: {
    alignSelf: 'flex-start',
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSize(spacing.xs),
  },
  detailChip: {
    marginBottom: getResponsiveSize(spacing.xs),
  },
  compareButtonContainer: {
    padding: getResponsiveSize(spacing.lg),
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: getResponsiveSize(spacing.md),
  },
});

