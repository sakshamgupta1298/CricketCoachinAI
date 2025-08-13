import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Card,
    Chip,
    FAB,
    IconButton,
    Searchbar,
    Surface,
    Text,
    useTheme,
} from 'react-native-paper';
import { useUpload } from '../context/UploadContext';
import { colors, shadows, spacing } from '../theme';
import { HistoryItem } from '../types';

type RootStackParamList = {
  Main: undefined;
  Results: { result: any };
};

type HistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const HistoryScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const { uploadHistory, removeFromHistory, clearHistory } = useUpload();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'batsman' | 'bowler'>('all');

  const filteredHistory = uploadHistory.filter(item => {
    const matchesSearch = item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.shot_type && item.shot_type.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === 'all' || item.player_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleItemPress = (item: HistoryItem) => {
    navigation.navigate('Results' as any, { result: item.result });
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert(
      'Delete Analysis',
      'Are you sure you want to delete this analysis?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeFromHistory(id) },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all analysis history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearHistory() },
      ]
    );
  };

  const getPlayerTypeIcon = (type: string) => {
    return type === 'batsman' ? '🏏' : '🎯';
  };

  const getShotTypeColor = (shotType: string) => {
    const colors = {
      coverdrive: colors.cricket.green,
      pull_shot: colors.cricket.blue,
      default: colors.cricket.orange,
    };
    return colors[shotType as keyof typeof colors] || colors.default;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderHistoryItem = (item: HistoryItem) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <Card style={[styles.historyCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.playerTypeIcon}>
                {getPlayerTypeIcon(item.player_type)}
              </Text>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  {item.player_type === 'batsman' ? 'Batting' : 'Bowling'} Analysis
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {formatDate(item.timestamp)}
                </Text>
              </View>
            </View>
            <IconButton
              icon="delete"
              size={20}
              onPress={() => handleDeleteItem(item.id)}
              iconColor={colors.error}
            />
          </View>

          {item.shot_type && (
            <Chip
              mode="contained"
              style={[styles.shotChip, { backgroundColor: getShotTypeColor(item.shot_type) }]}
              textStyle={{ color: 'white' }}
            >
              {item.shot_type.replace(/_/g, ' ').toUpperCase()}
            </Chip>
          )}

          <Text style={[styles.filename, { color: theme.colors.onSurfaceVariant }]}>
            {item.filename}
          </Text>

          {item.result.gpt_feedback.analysis && (
            <Text 
              style={[styles.analysisPreview, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={2}
            >
              {item.result.gpt_feedback.analysis}
            </Text>
          )}

          {item.result.gpt_feedback.flaws && item.result.gpt_feedback.flaws.length > 0 && (
            <View style={styles.flawsPreview}>
              <Text style={[styles.flawsLabel, { color: colors.error }]}>
                {item.result.gpt_feedback.flaws.length} issue{item.result.gpt_feedback.flaws.length > 1 ? 's' : ''} found
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Analysis History
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {uploadHistory.length} analysis{uploadHistory.length !== 1 ? 'es' : ''} completed
        </Text>
      </Surface>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search analyses..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <View style={styles.filterContainer}>
          <Chip
            selected={filterType === 'all'}
            onPress={() => setFilterType('all')}
            style={styles.filterChip}
          >
            All
          </Chip>
          <Chip
            selected={filterType === 'batsman'}
            onPress={() => setFilterType('batsman')}
            style={styles.filterChip}
          >
            Batting
          </Chip>
          <Chip
            selected={filterType === 'bowler'}
            onPress={() => setFilterType('bowler')}
            style={styles.filterChip}
          >
            Bowling
          </Chip>
        </View>
      </View>

      {/* History List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              No analyses found
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {uploadHistory.length === 0 
                ? 'Start by uploading your first cricket video for analysis'
                : 'Try adjusting your search or filters'
              }
            </Text>
          </View>
        ) : (
          filteredHistory.map(renderHistoryItem)
        )}
      </ScrollView>

      {/* FAB for clearing history */}
      {uploadHistory.length > 0 && (
        <FAB
          icon="delete-sweep"
          style={[styles.fab, { backgroundColor: colors.error }]}
          onPress={handleClearHistory}
          label="Clear All"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
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
  searchbar: {
    marginBottom: spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  historyCard: {
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerTypeIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  shotChip: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  filename: {
    fontSize: 14,
    marginBottom: spacing.sm,
    fontFamily: 'monospace',
  },
  analysisPreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  flawsPreview: {
    marginTop: spacing.sm,
  },
  flawsLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    margin: spacing.lg,
    right: 0,
    bottom: 0,
  },
});

export default HistoryScreen; 