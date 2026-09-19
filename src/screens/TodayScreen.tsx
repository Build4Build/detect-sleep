import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, SleepStatus } from '../types';
import { useSleep } from '../context/SleepContext';
import { useTheme } from '../context/ThemeContext';
import { formatTime, formatDuration } from '../utils/dateUtils';
import { sleepQualityForMinutes } from '../utils/sleepQuality';
import { isValidCandidateWindow } from '../services/SleepSessionService';
import { getDayOfYear } from 'date-fns';

type TodayScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Sleep tips for better sleep
const SLEEP_TIPS = [
  "Keep a consistent sleep schedule, even on weekends",
  "Avoid caffeine and alcohol close to bedtime",
  "Create a relaxing bedtime routine to wind down",
  "Ensure your bedroom is quiet, dark, and cool",
  "Limit screen time at least 1 hour before bed",
  "Regular exercise can help you fall asleep faster",
  "Avoid large meals and beverages late at night",
  "Try relaxation techniques like deep breathing",
  "Limit daytime naps to 30 minutes or less",
  "Consider using blackout curtains to block light",
  "Use sleep masks or earplugs to reduce light and noise",
  "If you can't sleep, get up and do something relaxing",
  "Consider using a white noise machine to block disturbances",
  "Keep your sleep environment free from electronic devices",
];

const TodayScreen = () => {
  const navigation = useNavigation<TodayScreenNavigationProp>();
  const { 
    currentStatus, 
    currentConfidence, 
    todayRecords, 
    getTodaySleepDuration,
    manuallySetStatus,
    pendingSleepCandidate,
    confirmSleepCandidate,
    dismissSleepCandidate,
    updateSleepCandidateBounds,
    todayWellnessReport,
    saveWellnessCheckIn,
  } = useSleep();
  const { colors, isDarkMode } = useTheme();
  // Create themed styles
  const themedStyles = useMemo(() => createThemedStyles(colors), [colors]);
  
  // Calculate sleep duration for today
  const sleepDuration = getTodaySleepDuration();
  
  // Get today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Derived on every render so neither goes stale while the app stays open.
  const hour = today.getHours();
  const greeting = hour >= 5 && hour < 12
    ? 'Good morning'
    : hour >= 12 && hour < 18
      ? 'Good afternoon'
      : 'Good evening';
  // One tip per calendar day, so "Daily Sleep Tip" means what it says.
  const dailyTip = SLEEP_TIPS[getDayOfYear(today) % SLEEP_TIPS.length];
  
  // Navigate to settings
  const goToSettings = () => {
    navigation.navigate('Settings');
  };
  
  // Get sleep quality assessment
  const getSleepQualityText = () => {
    if (sleepDuration <= 0) {
      return { text: 'No data yet', color: colors.textSecondary };
    }
    const quality = sleepQualityForMinutes(sleepDuration);
    return { text: quality.label, color: quality.color };
  };
  
  // Handle manual status override
  const handleStatusOverride = () => {
    Alert.alert(
      'Override Sleep Status',
      'Would you like to manually set your current status?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'I\'m Awake',
          onPress: () => manuallySetStatus(SleepStatus.AWAKE),
        },
        {
          text: 'I\'m Asleep',
          onPress: () => manuallySetStatus(SleepStatus.ASLEEP),
        },
      ]
    );
  };
  
  const sleepQuality = getSleepQualityText();

  const savedLevel = (value?: number): 1 | 2 | 3 | 4 | 5 | undefined =>
    value === 1 || value === 2 || value === 3 || value === 4 || value === 5
      ? value
      : undefined;

  const saveCheckInLevel = (
    kind: 'stress' | 'anxiety',
    level: 1 | 2 | 3 | 4 | 5,
  ) => saveWellnessCheckIn({
    stressLevel: kind === 'stress'
      ? level
      : savedLevel(todayWellnessReport?.selfReportedStress),
    anxietyLevel: kind === 'anxiety'
      ? level
      : savedLevel(todayWellnessReport?.selfReportedAnxiety),
  });
  
  // Get color for confidence level
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#4CAF50'; // High confidence - green
    if (confidence >= 60) return '#FFC107'; // Medium confidence - yellow
    return '#F44336'; // Low confidence - red
  };
  
  return (
    <ScrollView style={themedStyles.container}>
      <View style={themedStyles.header}>
        <View>
          <Text style={themedStyles.greeting}>{greeting}</Text>
          <Text style={themedStyles.date}>{formattedDate}</Text>
        </View>
        <TouchableOpacity onPress={goToSettings} style={themedStyles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={themedStyles.statusCard}
        onPress={handleStatusOverride}
        activeOpacity={0.8}
      >
        <View style={themedStyles.statusHeader}>
          <Text style={themedStyles.statusLabel}>Current Status</Text>
          <TouchableOpacity 
            style={themedStyles.editButton}
            onPress={handleStatusOverride}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={themedStyles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={themedStyles.statusContainer}>
          <View 
            style={[
              themedStyles.statusIndicator, 
              { backgroundColor: currentStatus === 'awake' ? '#4CAF50' : '#2196F3' }
            ]} 
          />
          <Text style={themedStyles.statusText}>
            {currentStatus === 'awake' ? 'Awake' : 'Asleep'}
          </Text>
        </View>
        
        <View style={themedStyles.confidenceContainer}>
          <Text style={themedStyles.confidenceLabel}>Detection Confidence:</Text>
          <View style={themedStyles.confidenceBar}>
            <View 
              style={[
                themedStyles.confidenceFill, 
                { 
                  width: `${currentConfidence}%`,
                  backgroundColor: getConfidenceColor(currentConfidence)
                }
              ]} 
            />
          </View>
          <Text style={[
            themedStyles.confidenceValue,
            { color: getConfidenceColor(currentConfidence) }
          ]}>
            {currentConfidence}%
          </Text>
        </View>
      </TouchableOpacity>

      {pendingSleepCandidate && (
        <View style={themedStyles.candidateCard}>
          <View style={themedStyles.candidateHeader}>
            <Ionicons name="moon-outline" size={24} color={colors.primary} />
            <Text style={themedStyles.cardTitle}>
              {pendingSleepCandidate.classification === 'likely-sleep'
                ? 'Probable sleep detected'
                : 'Possible sleep — please review'}
            </Text>
          </View>
          <Text style={themedStyles.candidateDescription}>
            You were away from Sleep Detector for long enough to suggest sleep. Confirm this estimate before it is saved or sent to Apple Health.
          </Text>
          <Text style={themedStyles.candidateTime}>
            {formatTime(pendingSleepCandidate.startTime)} – {formatTime(pendingSleepCandidate.endTime)}
          </Text>
          <Text style={themedStyles.candidateDuration}>
            {formatDuration((pendingSleepCandidate.endTime - pendingSleepCandidate.startTime) / 60_000)}
          </Text>
          <Text style={themedStyles.candidateEvidence}>
            {pendingSleepCandidate.confidence}% confidence · {pendingSleepCandidate.explanation ?? 'Review the estimate before saving it.'}
          </Text>
          <View style={themedStyles.boundaryEditor}>
            <View style={themedStyles.boundaryRow}>
              <Text style={themedStyles.boundaryLabel}>Sleep start</Text>
              <TouchableOpacity
                style={[
                  themedStyles.boundaryButton,
                  !isValidCandidateWindow(pendingSleepCandidate.startTime - 15 * 60_000, pendingSleepCandidate.endTime) && themedStyles.boundaryButtonDisabled,
                ]}
                disabled={!isValidCandidateWindow(pendingSleepCandidate.startTime - 15 * 60_000, pendingSleepCandidate.endTime)}
                onPress={() => updateSleepCandidateBounds(
                  pendingSleepCandidate.startTime - 15 * 60_000,
                  pendingSleepCandidate.endTime,
                )}
              >
                <Text style={themedStyles.boundaryButtonText}>−15m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  themedStyles.boundaryButton,
                  !isValidCandidateWindow(pendingSleepCandidate.startTime + 15 * 60_000, pendingSleepCandidate.endTime) && themedStyles.boundaryButtonDisabled,
                ]}
                disabled={!isValidCandidateWindow(pendingSleepCandidate.startTime + 15 * 60_000, pendingSleepCandidate.endTime)}
                onPress={() => updateSleepCandidateBounds(
                  pendingSleepCandidate.startTime + 15 * 60_000,
                  pendingSleepCandidate.endTime,
                )}
              >
                <Text style={themedStyles.boundaryButtonText}>+15m</Text>
              </TouchableOpacity>
            </View>
            <View style={themedStyles.boundaryRow}>
              <Text style={themedStyles.boundaryLabel}>Wake time</Text>
              <TouchableOpacity
                style={[
                  themedStyles.boundaryButton,
                  !isValidCandidateWindow(pendingSleepCandidate.startTime, pendingSleepCandidate.endTime - 15 * 60_000) && themedStyles.boundaryButtonDisabled,
                ]}
                disabled={!isValidCandidateWindow(pendingSleepCandidate.startTime, pendingSleepCandidate.endTime - 15 * 60_000)}
                onPress={() => updateSleepCandidateBounds(
                  pendingSleepCandidate.startTime,
                  pendingSleepCandidate.endTime - 15 * 60_000,
                )}
              >
                <Text style={themedStyles.boundaryButtonText}>−15m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  themedStyles.boundaryButton,
                  !isValidCandidateWindow(pendingSleepCandidate.startTime, pendingSleepCandidate.endTime + 15 * 60_000) && themedStyles.boundaryButtonDisabled,
                ]}
                disabled={!isValidCandidateWindow(pendingSleepCandidate.startTime, pendingSleepCandidate.endTime + 15 * 60_000)}
                onPress={() => updateSleepCandidateBounds(
                  pendingSleepCandidate.startTime,
                  pendingSleepCandidate.endTime + 15 * 60_000,
                )}
              >
                <Text style={themedStyles.boundaryButtonText}>+15m</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={themedStyles.candidateActions}>
            <TouchableOpacity style={themedStyles.dismissCandidateButton} onPress={dismissSleepCandidate}>
              <Text style={themedStyles.dismissCandidateText}>Not sleep</Text>
            </TouchableOpacity>
            <TouchableOpacity style={themedStyles.confirmCandidateButton} onPress={confirmSleepCandidate}>
              <Text style={themedStyles.confirmCandidateText}>Confirm sleep</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <View style={themedStyles.sleepCard}>
        <Text style={themedStyles.cardTitle}>Today's Sleep</Text>
        <View style={themedStyles.sleepInfo}>
          <Ionicons name="bed-outline" size={40} color={colors.primary} />
          <View style={themedStyles.sleepDataContainer}>
            <Text style={themedStyles.sleepDuration}>{formatDuration(sleepDuration)}</Text>
            <View style={themedStyles.qualityContainer}>
              <Text style={themedStyles.qualityLabel}>Duration assessment:</Text>
              <Text style={[themedStyles.qualityValue, { color: sleepQuality.color }]}>
                {sleepQuality.text}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {todayWellnessReport && (
        <View style={themedStyles.wellnessCard}>
          <View style={themedStyles.candidateHeader}>
            <Ionicons name="pulse-outline" size={24} color={colors.primary} />
            <Text style={themedStyles.cardTitle}>Daily wellness report</Text>
          </View>
          <View style={themedStyles.wellnessMetrics}>
            <View style={themedStyles.wellnessMetric}>
              <Text style={themedStyles.wellnessMetricValue}>
                {todayWellnessReport.sleepConsistencyScore}%
              </Text>
              <Text style={themedStyles.wellnessMetricLabel}>Timing consistency</Text>
            </View>
            <View style={themedStyles.wellnessMetric}>
              <Text style={themedStyles.wellnessMetricValue}>
                {todayWellnessReport.sleepContinuityScore !== undefined
                  ? `${todayWellnessReport.sleepContinuityScore}%`
                  : '—'}
              </Text>
              <Text style={themedStyles.wellnessMetricLabel}>Continuity</Text>
            </View>
            <View style={themedStyles.wellnessMetric}>
              <Text style={themedStyles.wellnessMetricValue}>
                {todayWellnessReport.recoverySignal === 'limited-data'
                  ? 'Learning'
                  : todayWellnessReport.recoverySignal.replace('-', ' ')}
              </Text>
              <Text style={themedStyles.wellnessMetricLabel}>Recovery trend</Text>
            </View>
          </View>

          {(todayWellnessReport.heartRateVariabilityMs !== undefined ||
            todayWellnessReport.restingHeartRate !== undefined) && (
            <Text style={themedStyles.wellnessSignals}>
              {todayWellnessReport.heartRateVariabilityMs !== undefined
                ? `HRV ${Math.round(todayWellnessReport.heartRateVariabilityMs)} ms`
                : ''}
              {todayWellnessReport.heartRateVariabilityMs !== undefined &&
              todayWellnessReport.restingHeartRate !== undefined
                ? ' · '
                : ''}
              {todayWellnessReport.restingHeartRate !== undefined
                ? `Resting HR ${Math.round(todayWellnessReport.restingHeartRate)} bpm`
                : ''}
            </Text>
          )}

          {todayWellnessReport.observations.map(observation => (
            <Text key={observation} style={themedStyles.wellnessObservation}>
              • {observation}
            </Text>
          ))}

          <Text style={themedStyles.checkInTitle}>Optional daily check-in</Text>
          {(['stress', 'anxiety'] as const).map(kind => {
            const selected = kind === 'stress'
              ? todayWellnessReport.selfReportedStress
              : todayWellnessReport.selfReportedAnxiety;
            return (
              <View key={kind} style={themedStyles.checkInRow}>
                <Text style={themedStyles.checkInLabel}>
                  {kind === 'stress' ? 'Stress' : 'Anxiety'}
                </Text>
                {([1, 2, 3, 4, 5] as const).map(level => (
                  <TouchableOpacity
                    key={level}
                    accessibilityLabel={`${kind} level ${level} of 5`}
                    style={[
                      themedStyles.checkInButton,
                      selected === level && themedStyles.checkInButtonSelected,
                    ]}
                    onPress={() => saveCheckInLevel(kind, level)}
                  >
                    <Text style={[
                      themedStyles.checkInButtonText,
                      selected === level && themedStyles.checkInButtonTextSelected,
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
          <Text style={themedStyles.wellnessDisclaimer}>
            Wellness trends only. Correlations do not show cause and are not a medical diagnosis.
          </Text>
        </View>
      )}
      
      <View style={themedStyles.activityCard}>
        <Text style={themedStyles.cardTitle}>Activity Timeline</Text>
        {todayRecords.length === 0 ? (
          <Text style={themedStyles.noActivity}>No activity recorded yet today</Text>
        ) : (
          <View style={themedStyles.timeline}>
            {todayRecords.map((record, index) => (
              <View key={record.id} style={themedStyles.timelineItem}>
                <View 
                  style={[
                    themedStyles.timelineDot, 
                    { backgroundColor: record.status === 'awake' ? '#4CAF50' : '#2196F3' }
                  ]} 
                />
                <View style={themedStyles.timelineContent}>
                  <View style={themedStyles.timelineHeader}>
                    <Text style={themedStyles.timelineTime}>{formatTime(record.timestamp)}</Text>
                    <Text style={[
                      themedStyles.timelineConfidence,
                      { color: getConfidenceColor(record.confidence) }
                    ]}>
                      {record.confidence}% confident
                    </Text>
                  </View>
                  <Text style={themedStyles.timelineStatus}>
                    {record.status === 'awake' ? 'Woke up' : 'Fell asleep'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <View style={themedStyles.tipCard}>
        <View style={themedStyles.tipHeader}>
          <Ionicons name="bulb-outline" size={24} color="#FFC107" />
          <Text style={themedStyles.tipTitle}>Daily Sleep Tip</Text>
        </View>
        <Text style={themedStyles.tipText}>{dailyTip}</Text>
      </View>
      
      <View style={themedStyles.buttonContainer}>
        <TouchableOpacity 
          style={themedStyles.exportButton}
          onPress={() => navigation.navigate('Export')}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={themedStyles.exportButtonText}>Export Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={themedStyles.historyButton}
          onPress={() => navigation.navigate('History')}
        >
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={themedStyles.exportButtonText}>Sleep History</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Create themed styles function
const createThemedStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  settingsButton: {
    padding: 8,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  candidateCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  candidateDescription: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  candidateTime: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  candidateDuration: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  candidateEvidence: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  boundaryEditor: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: 12,
    paddingTop: 8,
  },
  boundaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  boundaryLabel: {
    color: colors.text,
    flex: 1,
    fontWeight: '600',
  },
  boundaryButton: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  boundaryButtonDisabled: {
    opacity: 0.35,
  },
  boundaryButtonText: {
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  candidateActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  dismissCandidateButton: {
    flex: 1,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
  },
  dismissCandidateText: {
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmCandidateButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  confirmCandidateText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  confidenceContainer: {
    marginTop: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  sleepCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  wellnessCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  wellnessMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  wellnessMetric: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    flex: 1,
    minHeight: 70,
    padding: 8,
  },
  wellnessMetricValue: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  wellnessMetricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
  },
  wellnessSignals: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  wellnessObservation: {
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: 4,
  },
  checkInTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
  },
  checkInRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
  },
  checkInLabel: {
    color: colors.text,
    flex: 1,
  },
  checkInButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  checkInButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkInButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  checkInButtonTextSelected: {
    color: '#fff',
  },
  wellnessDisclaimer: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  sleepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sleepDataContainer: {
    marginLeft: 16,
  },
  sleepDuration: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  qualityLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginRight: 8,
  },
  qualityValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noActivity: {
    textAlign: 'center',
    color: colors.textSecondary,
    padding: 16,
  },
  timeline: {
    paddingTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  timelineConfidence: {
    fontSize: 12,
    fontWeight: '500',
  },
  timelineStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tipCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  tipText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
    marginTop: 8,
  },
  exportButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    flex: 1,
    marginRight: 8,
  },
  historyButton: {
    backgroundColor: '#03A9F4',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    flex: 1,
    marginLeft: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  }
});

export default TodayScreen;
