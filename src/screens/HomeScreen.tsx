import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Button,
    Card,
    Surface,
    Text,
    useTheme,
} from 'react-native-paper';
import { borderRadius, colors, shadows, spacing } from '../theme';

type RootStackParamList = {
  Main: undefined;
  Results: { result: any };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const features = [
    {
      id: 1,
      title: 'Batting Analysis',
      description: 'Analyze your cricket shots with AI-powered biomechanics',
      icon: '🏏',
      color: colors.cricket.green,
    },
    {
      id: 2,
      title: 'Bowling Analysis',
      description: 'Get detailed feedback on your bowling technique',
      icon: '🎯',
      color: colors.cricket.blue,
    },
    {
      id: 3,
      title: 'Real-time Feedback',
      description: 'Instant analysis and improvement suggestions',
      icon: '⚡',
      color: colors.cricket.orange,
    },
    {
      id: 4,
      title: 'Progress Tracking',
      description: 'Monitor your improvement over time',
      icon: '📈',
      color: colors.cricket.yellow,
    },
  ];

  const quickActions = [
    {
      title: 'Upload Video',
      subtitle: 'Select from gallery',
      icon: '📤',
      action: () => navigation.navigate('Upload' as any),
    },
    {
      title: 'Record Video',
      subtitle: 'Use camera',
      icon: '📷',
      action: () => navigation.navigate('Camera' as any),
    },
    {
      title: 'View History',
      subtitle: 'Past analyses',
      icon: '📋',
      action: () => navigation.navigate('History' as any),
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryContainer]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.appTitle}>Cricket Coach</Text>
          <Text style={styles.subtitle}>
            AI-powered cricket technique analysis
          </Text>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Quick Actions
        </Text>
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
              onPress={action.action}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[styles.actionTitle, { color: theme.colors.onSurface }]}>
                {action.title}
              </Text>
              <Text style={[styles.actionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {action.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Features
        </Text>
        {features.map((feature) => (
          <Card
            key={feature.id}
            style={[styles.featureCard, { backgroundColor: theme.colors.surface }]}
            mode="outlined"
          >
            <Card.Content style={styles.featureContent}>
              <View style={styles.featureHeader}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: theme.colors.onSurface }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDescription, { color: theme.colors.onSurfaceVariant }]}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          How it works
        </Text>
        <Surface style={[styles.howItWorks, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.onSurface }]}>
              Record or upload your cricket video
            </Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.onSurface }]}>
              AI analyzes your technique and biomechanics
            </Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.onSurface }]}>
              Get detailed feedback and improvement tips
            </Text>
          </View>
        </Surface>
      </View>

      {/* CTA Button */}
      <View style={styles.section}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Upload' as any)}
          style={styles.ctaButton}
          contentStyle={styles.ctaButtonContent}
          labelStyle={styles.ctaButtonLabel}
        >
          Start Analysis
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  featureCard: {
    marginBottom: spacing.md,
    ...shadows.small,
  },
  featureContent: {
    padding: spacing.md,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  howItWorks: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 16,
    flex: 1,
  },
  ctaButton: {
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  ctaButtonContent: {
    paddingVertical: spacing.md,
  },
  ctaButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default HomeScreen; 