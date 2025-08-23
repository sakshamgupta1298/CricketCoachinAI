import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../design/DesignSystem';
import { Button } from './ui/Button';

const { width, height } = Dimensions.get('window');

interface ConfigurationModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (config: PlayerConfig) => void;
}

interface PlayerConfig {
  playerType: 'batsman' | 'bowler';
  playerSide: 'left' | 'right';
}

export const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  visible,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<PlayerConfig>({
    playerType: 'batsman',
    playerSide: 'right',
  });

  const handlePlayerTypeSelect = (type: 'batsman' | 'bowler') => {
    setConfig(prev => ({ ...prev, playerType: type }));
  };

  const handlePlayerSideSelect = (side: 'left' | 'right') => {
    setConfig(prev => ({ ...prev, playerSide: side }));
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(config);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepDots}>
        <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive]} />
        <View style={styles.stepLine} />
        <View style={[styles.stepDot, currentStep >= 2 && styles.stepDotActive]} />
      </View>
      <Text style={styles.stepText}>Step {currentStep} of 2</Text>
    </View>
  );

  const renderPlayerTypeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What type of player are you?</Text>
      <Text style={styles.stepDescription}>
        Select your primary role to get personalized analysis
      </Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            config.playerType === 'batsman' && styles.optionCardSelected,
          ]}
          onPress={() => handlePlayerTypeSelect('batsman')}
        >
          <LinearGradient
            colors={
              config.playerType === 'batsman'
                ? [Colors.primary[500], Colors.primary[600]]
                : [Colors.background.lightSecondary, Colors.background.lightSecondary]
            }
            style={styles.optionGradient}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionIconText}>🏏</Text>
            </View>
            <Text
              style={[
                styles.optionTitle,
                config.playerType === 'batsman' && styles.optionTitleSelected,
              ]}
            >
              Batsman
            </Text>
            <Text
              style={[
                styles.optionDescription,
                config.playerType === 'batsman' && styles.optionDescriptionSelected,
              ]}
            >
              Analyze batting technique, stance, and shot execution
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            config.playerType === 'bowler' && styles.optionCardSelected,
          ]}
          onPress={() => handlePlayerTypeSelect('bowler')}
        >
          <LinearGradient
            colors={
              config.playerType === 'bowler'
                ? [Colors.secondary[500], Colors.secondary[600]]
                : [Colors.background.lightSecondary, Colors.background.lightSecondary]
            }
            style={styles.optionGradient}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionIconText}>🎯</Text>
            </View>
            <Text
              style={[
                styles.optionTitle,
                config.playerType === 'bowler' && styles.optionTitleSelected,
              ]}
            >
              Bowler
            </Text>
            <Text
              style={[
                styles.optionDescription,
                config.playerType === 'bowler' && styles.optionDescriptionSelected,
              ]}
            >
              Perfect bowling action, line, length, and variations
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlayerSideStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Which hand do you use?</Text>
      <Text style={styles.stepDescription}>
        This helps us provide more accurate analysis
      </Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            config.playerSide === 'right' && styles.optionCardSelected,
          ]}
          onPress={() => handlePlayerSideSelect('right')}
        >
          <LinearGradient
            colors={
              config.playerSide === 'right'
                ? [Colors.primary[500], Colors.primary[600]]
                : [Colors.background.lightSecondary, Colors.background.lightSecondary]
            }
            style={styles.optionGradient}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionIconText}>✋</Text>
            </View>
            <Text
              style={[
                styles.optionTitle,
                config.playerSide === 'right' && styles.optionTitleSelected,
              ]}
            >
              Right-handed
            </Text>
            <Text
              style={[
                styles.optionDescription,
                config.playerSide === 'right' && styles.optionDescriptionSelected,
              ]}
            >
              Right hand dominant player
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            config.playerSide === 'left' && styles.optionCardSelected,
          ]}
          onPress={() => handlePlayerSideSelect('left')}
        >
          <LinearGradient
            colors={
              config.playerSide === 'left'
                ? [Colors.primary[500], Colors.primary[600]]
                : [Colors.background.lightSecondary, Colors.background.lightSecondary]
            }
            style={styles.optionGradient}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionIconText}>🤚</Text>
            </View>
            <Text
              style={[
                styles.optionTitle,
                config.playerSide === 'left' && styles.optionTitleSelected,
              ]}
            >
              Left-handed
            </Text>
            <Text
              style={[
                styles.optionDescription,
                config.playerSide === 'left' && styles.optionDescriptionSelected,
              ]}
            >
              Left hand dominant player
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Player Configuration</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        {currentStep === 1 ? renderPlayerTypeStep() : renderPlayerSideStep()}

        {/* Navigation Buttons */}
        <View style={styles.navigation}>
          {currentStep > 1 && (
            <Button
              title="Back"
              onPress={handleBack}
              variant="outline"
              size="lg"
              style={styles.backButton}
            />
          )}
          <Button
            title={currentStep === 2 ? 'Complete' : 'Next'}
            onPress={handleNext}
            variant="primary"
            size="lg"
            style={styles.nextButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.lightSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  stepIndicator: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.neutral[300],
  },
  stepDotActive: {
    backgroundColor: Colors.primary[500],
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.neutral[300],
    marginHorizontal: Spacing.sm,
  },
  stepText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  stepContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  stepTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stepDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  optionsContainer: {
    gap: Spacing.lg,
  },
  optionCard: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  optionCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  optionGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.background.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  optionIconText: {
    fontSize: 30,
  },
  optionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  optionTitleSelected: {
    color: Colors.text.inverse,
  },
  optionDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  optionDescriptionSelected: {
    color: Colors.text.inverse,
    opacity: 0.9,
  },
  navigation: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 1,
  },
});
