import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Colors, Spacing, Typography } from '../design/DesignSystem';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const handleBattingAnalysis = () => {
    navigation.navigate('VideoCapture');
  };

  const handleBowlingAnalysis = () => {
    navigation.navigate('VideoCapture');
  };

  const handleProfile = () => {
    // TODO: Navigate to profile screen
    console.log('Profile pressed');
  };

  return (
    <LinearGradient
      colors={[Colors.background.light, Colors.background.lightSecondary]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.title}>CrickCoach</Text>
          <Text style={styles.subtitle}>Your Personal AI Cricket Coach</Text>
        </View>

        {/* Main Analysis Cards */}
        <View style={styles.cardsContainer}>
          {/* Batting Analysis Card */}
          <TouchableOpacity onPress={handleBattingAnalysis} style={styles.cardWrapper}>
            <Card variant="elevated" style={styles.analysisCard}>
              <LinearGradient
                colors={[Colors.primary[500], Colors.primary[600]]}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.iconText}>🏏</Text>
                  </View>
                  <Text style={styles.cardTitle}>Batting Analysis</Text>
                  <Text style={styles.cardDescription}>
                    Analyze your batting technique, stance, and shot execution
                  </Text>
                  <View style={styles.cardAction}>
                    <Text style={styles.actionText}>Start Analysis</Text>
                    <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
                  </View>
                </View>
              </LinearGradient>
            </Card>
          </TouchableOpacity>

          {/* Bowling Analysis Card */}
          <TouchableOpacity onPress={handleBowlingAnalysis} style={styles.cardWrapper}>
            <Card variant="elevated" style={styles.analysisCard}>
              <LinearGradient
                colors={[Colors.secondary[500], Colors.secondary[600]]}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.iconText}>🎯</Text>
                  </View>
                  <Text style={styles.cardTitle}>Bowling Analysis</Text>
                  <Text style={styles.cardDescription}>
                    Perfect your bowling action, line, length, and variations
                  </Text>
                  <View style={styles.cardAction}>
                    <Text style={styles.actionText}>Start Analysis</Text>
                    <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
                  </View>
                </View>
              </LinearGradient>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <Button
              title="View History"
              onPress={() => {}}
              variant="outline"
              size="md"
              style={styles.actionButton}
            />
            <Button
              title="Settings"
              onPress={() => {}}
              variant="outline"
              size="md"
              style={styles.actionButton}
            />
          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handleProfile} style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={styles.profileAvatar}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>Player Profile</Text>
                <Text style={styles.profileSubtitle}>Manage your settings and preferences</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing['2xl'],
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  cardsContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  cardWrapper: {
    marginBottom: Spacing.lg,
  },
  analysisCard: {
    overflow: 'hidden',
  },
  cardGradient: {
    padding: Spacing.xl,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconText: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    opacity: 0.9,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
  quickActions: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  profileSection: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.background.light,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 24,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  profileSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
}); 