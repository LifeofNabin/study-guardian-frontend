// frontend/src/utils/analyticsProcessor.js

/**
 * Process raw session data into structured analytics
 */
export const processSessionData = (session) => {
  if (!session) return null;

  const duration = session.duration || 0;
  const durationMinutes = Math.floor(duration / 60);

  return {
    session_id: session._id,
    duration: duration,
    durationMinutes: durationMinutes,
    type: session.type,
    startTime: new Date(session.created_at),
    endTime: session.end_time ? new Date(session.end_time) : null,
    
    // Engagement metrics
    engagement: calculateEngagementMetrics(session),
    
    // Content interaction
    content: processContentInteraction(session),
    
    // Health metrics
    health: processHealthMetrics(session),
    
    // Performance indicators
    performance: calculatePerformanceMetrics(session)
  };
};

/**
 * Calculate engagement metrics from session data
 */
export const calculateEngagementMetrics = (session) => {
  const metrics = session.webcam_metrics || {};
  
  // Calculate presence percentage
  const presenceData = metrics.presence_data || [];
  const presencePercentage = presenceData.length > 0
    ? (presenceData.filter(p => p.present).length / presenceData.length) * 100
    : 0;

  // Calculate average posture score
  const postureData = metrics.posture_data || [];
  const avgPosture = postureData.length > 0
    ? postureData.reduce((sum, p) => sum + p.score, 0) / postureData.length
    : 0;

  // Calculate engagement score (weighted average)
  const engagementScore = calculateWeightedEngagement({
    presence: presencePercentage,
    posture: avgPosture,
    interactions: session.highlights?.length || 0,
    duration: session.duration || 0
  });

  return {
    overall_score: Math.round(engagementScore),
    presence_percentage: Math.round(presencePercentage),
    average_posture: Math.round(avgPosture),
    distraction_count: metrics.distraction_events?.length || 0,
    focus_time: calculateFocusTime(presenceData, metrics.distraction_events),
    break_time: calculateBreakTime(presenceData)
  };
};

/**
 * Calculate weighted engagement score
 */
const calculateWeightedEngagement = ({ presence, posture, interactions, duration }) => {
  const weights = {
    presence: 0.30,
    posture: 0.15,
    interactions: 0.15,
    duration: 0.10,
    consistency: 0.30
  };

  // Normalize interaction count (0-100 scale)
  const normalizedInteractions = Math.min((interactions / 20) * 100, 100);

  // Normalize duration (optimal 45-60 min = 100)
  const durationMinutes = duration / 60;
  const normalizedDuration = durationMinutes >= 45 && durationMinutes <= 60
    ? 100
    : durationMinutes < 45
      ? (durationMinutes / 45) * 100
      : Math.max(100 - ((durationMinutes - 60) * 2), 50);

  // Consistency score (based on presence fluctuations)
  const consistencyScore = presence > 80 && posture > 70 ? 100 : 70;

  const score = 
    (presence * weights.presence) +
    (posture * weights.posture) +
    (normalizedInteractions * weights.interactions) +
    (normalizedDuration * weights.duration) +
    (consistencyScore * weights.consistency);

  return Math.round(score);
};

/**
 * Calculate focused time (present and not distracted)
 */
const calculateFocusTime = (presenceData, distractionEvents) => {
  if (!presenceData || presenceData.length === 0) return 0;

  let focusedSeconds = 0;
  presenceData.forEach((p, index) => {
    if (p.present) {
      // Check if there was a distraction at this time
      const hasDistraction = distractionEvents?.some(d => {
        const eventIndex = Math.floor(new Date(d.timestamp).getTime() / 1000);
        const presenceIndex = Math.floor(new Date(p.timestamp).getTime() / 1000);
        return Math.abs(eventIndex - presenceIndex) < 60; // Within 1 minute
      });
      
      if (!hasDistraction) focusedSeconds += 60; // Assuming 1-minute intervals
    }
  });

  return focusedSeconds;
};

/**
 * Calculate break time
 */
const calculateBreakTime = (presenceData) => {
  if (!presenceData || presenceData.length === 0) return 0;
  
  const absentCount = presenceData.filter(p => !p.present).length;
  return absentCount * 60; // Assuming 1-minute intervals
};

/**
 * Process content interaction data
 */
export const processContentInteraction = (session) => {
  const highlights = session.highlights || [];
  const annotations = session.annotations || [];
  const pageVisits = session.page_visits || {};

  // Calculate pages read
  const pagesVisited = Object.keys(pageVisits).length;
  const totalPages = session.total_pages || pagesVisited;
  const completionRate = totalPages > 0 ? (pagesVisited / totalPages) * 100 : 0;

  // Time per page analysis
  const timePerPage = session.time_per_page || {};
  const avgTimePerPage = Object.values(timePerPage).reduce((sum, time) => sum + time, 0) / pagesVisited || 0;

  // Identify most studied pages (top 5)
  const mostStudiedPages = Object.entries(timePerPage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([page, time]) => ({ page: parseInt(page), time }));

  return {
    highlights_count: highlights.length,
    annotations_count: annotations.length,
    pages_visited: pagesVisited,
    total_pages: totalPages,
    completion_rate: Math.round(completionRate),
    avg_time_per_page: Math.round(avgTimePerPage),
    most_studied_pages: mostStudiedPages,
    interaction_density: calculateInteractionDensity(highlights, annotations, pagesVisited)
  };
};

/**
 * Calculate interaction density (interactions per page)
 */
const calculateInteractionDensity = (highlights, annotations, pagesVisited) => {
  if (pagesVisited === 0) return 0;
  const totalInteractions = highlights.length + annotations.length;
  return (totalInteractions / pagesVisited).toFixed(2);
};

/**
 * Process health metrics
 */
export const processHealthMetrics = (session) => {
  const metrics = session.webcam_metrics || {};
  
  // Blink rate analysis
  const blinkData = metrics.blink_rate || [];
  const avgBlinkRate = blinkData.length > 0
    ? blinkData.reduce((sum, b) => sum + b.rate, 0) / blinkData.length
    : 15;

  // Eye strain level
  const eyeStrainLevel = avgBlinkRate < 10 ? 'high' :
                        avgBlinkRate < 14 ? 'medium' : 'low';

  // Fatigue indicators
  const yawnCount = metrics.yawn_count || 0;
  const headDrops = metrics.head_drops || 0;
  const fatigueScore = calculateFatigueScore(yawnCount, headDrops, session.duration);

  return {
    avg_blink_rate: Math.round(avgBlinkRate),
    eye_strain_level: eyeStrainLevel,
    fatigue_score: fatigueScore,
    posture_quality: calculatePostureQuality(metrics.posture_data),
    health_score: calculateHealthScore({
      blinkRate: avgBlinkRate,
      fatigue: fatigueScore,
      posture: metrics.posture_data,
      duration: session.duration
    })
  };
};

/**
 * Calculate fatigue score (0-100, higher = more fatigued)
 */
const calculateFatigueScore = (yawnCount, headDrops, duration) => {
  const durationMinutes = duration / 60;
  
  // Normalize yawns and head drops per hour
  const yawnsPerHour = (yawnCount / durationMinutes) * 60;
  const dropsPerHour = (headDrops / durationMinutes) * 60;

  let score = 0;
  if (yawnsPerHour > 6) score += 40;
  else if (yawnsPerHour > 3) score += 20;
  
  if (dropsPerHour > 3) score += 40;
  else if (dropsPerHour > 1) score += 20;

  if (durationMinutes > 90) score += 20;
  
  return Math.min(score, 100);
};

/**
 * Calculate posture quality percentage
 */
const calculatePostureQuality = (postureData) => {
  if (!postureData || postureData.length === 0) return 0;
  
  const avgScore = postureData.reduce((sum, p) => sum + p.score, 0) / postureData.length;
  return Math.round(avgScore);
};

/**
 * Calculate overall health score
 */
const calculateHealthScore = ({ blinkRate, fatigue, posture, duration }) => {
  let score = 100;

  // Deduct for poor blink rate
  if (blinkRate < 10) score -= 25;
  else if (blinkRate < 12) score -= 15;

  // Deduct for fatigue
  score -= fatigue * 0.3; // Fatigue is 0-100

  // Deduct for poor posture
  const avgPosture = calculatePostureQuality(posture);
  if (avgPosture < 60) score -= 20;
  else if (avgPosture < 80) score -= 10;

  // Deduct for excessive duration
  const durationMinutes = duration / 60;
  if (durationMinutes > 120) score -= 20;
  else if (durationMinutes > 90) score -= 10;

  return Math.max(0, Math.round(score));
};

/**
 * Calculate performance metrics
 */
export const calculatePerformanceMetrics = (session) => {
  const engagement = calculateEngagementMetrics(session);
  const content = processContentInteraction(session);
  const health = processHealthMetrics(session);

  // Predict quiz readiness (0-10 scale)
  const quizReadiness = calculateQuizReadiness({
    completionRate: content.completion_rate,
    highlightsCount: content.highlights_count,
    engagementScore: engagement.overall_score,
    avgTimePerPage: content.avg_time_per_page
  });

  // Estimate retention (0-100%)
  const retentionEstimate = estimateRetention({
    engagement: engagement.overall_score,
    interactions: content.highlights_count + content.annotations_count,
    focusTime: engagement.focus_time,
    totalDuration: session.duration
  });

  return {
    quiz_readiness: quizReadiness,
    retention_estimate: Math.round(retentionEstimate),
    productivity_score: calculateProductivityScore(engagement, content),
    improvement_areas: identifyImprovementAreas(engagement, content, health)
  };
};

/**
 * Calculate quiz readiness score (0-10)
 */
const calculateQuizReadiness = ({ completionRate, highlightsCount, engagementScore, avgTimePerPage }) => {
  let score = 0;

  // Completion rate (max 3 points)
  score += (completionRate / 100) * 3;

  // Highlights (max 2 points)
  score += Math.min((highlightsCount / 15) * 2, 2);

  // Engagement (max 3 points)
  score += (engagementScore / 100) * 3;

  // Time per page (max 2 points)
  const optimalTime = 120; // 2 minutes
  const timeScore = avgTimePerPage >= 60 && avgTimePerPage <= 180
    ? 2
    : Math.max(0, 2 - Math.abs(avgTimePerPage - optimalTime) / 60);
  score += timeScore;

  return Math.round(score * 10) / 10; // Round to 1 decimal
};

/**
 * Estimate retention percentage
 */
const estimateRetention = ({ engagement, interactions, focusTime, totalDuration }) => {
  // Base retention on engagement
  let retention = engagement * 0.6;

  // Boost for interactions
  const interactionBonus = Math.min((interactions / 20) * 20, 20);
  retention += interactionBonus;

  // Adjust for focus ratio
  const focusRatio = totalDuration > 0 ? (focusTime / totalDuration) : 0;
  retention += focusRatio * 20;

  return Math.min(retention, 100);
};

/**
 * Calculate productivity score
 */
const calculateProductivityScore = (engagement, content) => {
  const weights = {
    engagement: 0.40,
    completion: 0.30,
    interactions: 0.30
  };

  const interactionScore = Math.min((content.highlights_count + content.annotations_count) / 15 * 100, 100);

  const score = 
    (engagement.overall_score * weights.engagement) +
    (content.completion_rate * weights.completion) +
    (interactionScore * weights.interactions);

  return Math.round(score);
};

/**
 * Identify improvement areas
 */
const identifyImprovementAreas = (engagement, content, health) => {
  const areas = [];

  if (engagement.presence_percentage < 80) {
    areas.push({
      area: 'Presence',
      severity: 'high',
      message: 'Improve focus by minimizing distractions and staying present',
      metric: `${Math.round(engagement.presence_percentage)}%`
    });
  }

  if (engagement.average_posture < 70) {
    areas.push({
      area: 'Posture',
      severity: 'medium',
      message: 'Adjust your sitting position for better posture',
      metric: `${Math.round(engagement.average_posture)}%`
    });
  }

  if (content.completion_rate < 60) {
    areas.push({
      area: 'Content Coverage',
      severity: 'high',
      message: 'Try to cover more pages for comprehensive understanding',
      metric: `${Math.round(content.completion_rate)}% completed`
    });
  }

  if (content.highlights_count < 5) {
    areas.push({
      area: 'Active Reading',
      severity: 'medium',
      message: 'Highlight more key points to improve retention',
      metric: `${content.highlights_count} highlights`
    });
  }

  if (health.eye_strain_level === 'high') {
    areas.push({
      area: 'Eye Health',
      severity: 'high',
      message: 'Take more frequent breaks and follow the 20-20-20 rule',
      metric: `High eye strain`
    });
  }

  if (health.fatigue_score > 60) {
    areas.push({
      area: 'Fatigue',
      severity: 'high',
      message: 'Consider shorter study sessions or take a longer break',
      metric: `Fatigue: ${health.fatigue_score}%`
    });
  }

  return areas;
};

/**
 * Compare user stats with class average
 */
export const compareWithAverage = (userStats, classAverage) => {
  if (!classAverage) return null;

  const comparison = {};
  const metrics = ['engagement_score', 'presence', 'posture', 'completion_rate', 'interactions'];

  metrics.forEach(metric => {
    const userValue = userStats[metric] || 0;
    const avgValue = classAverage[metric] || 0;
    const difference = userValue - avgValue;
    const percentDiff = avgValue > 0 ? (difference / avgValue) * 100 : 0;

    comparison[metric] = {
      user: userValue,
      average: avgValue,
      difference: Math.round(difference),
      percentDiff: Math.round(percentDiff),
      status: difference > 0 ? 'above' : difference < 0 ? 'below' : 'equal'
    };
  });

  return comparison;
};

/**
 * Generate personalized recommendations
 */
export const generateRecommendations = (sessionAnalytics, historicalData = []) => {
  const recommendations = [];

  // Analyze patterns from historical data
  const patterns = analyzePatterns(historicalData);

  // Recommendation: Best study time
  if (patterns.bestStudyTime) {
    recommendations.push({
      type: 'timing',
      priority: 'high',
      title: 'Optimal Study Time',
      message: `Your engagement is highest at ${patterns.bestStudyTime}. Schedule important sessions during this time.`,
      icon: 'clock'
    });
  }

  // Recommendation: Session duration
  if (sessionAnalytics.performance.productivity_score < 70) {
    recommendations.push({
      type: 'duration',
      priority: 'medium',
      title: 'Session Length',
      message: 'Try shorter 45-minute sessions with 10-minute breaks for better focus.',
      icon: 'timer'
    });
  }

  // Recommendation: Break frequency
  if (sessionAnalytics.health.fatigue_score > 50) {
    recommendations.push({
      type: 'health',
      priority: 'high',
      title: 'Take More Breaks',
      message: 'Increase break frequency to reduce fatigue. Try the Pomodoro technique (25/5).',
      icon: 'coffee'
    });
  }

  // Recommendation: Active learning
  if (sessionAnalytics.content.interaction_density < 1.5) {
    recommendations.push({
      type: 'learning',
      priority: 'medium',
      title: 'Increase Interaction',
      message: 'Add more highlights and notes. Active reading improves retention by 40%.',
      icon: 'highlighter'
    });
  }

  return recommendations;
};

/**
 * Analyze patterns from historical sessions
 */
const analyzePatterns = (historicalData) => {
  if (!historicalData || historicalData.length === 0) return {};

  // Find best study time (hour of day with highest engagement)
  const hourlyEngagement = {};
  historicalData.forEach(session => {
    const hour = new Date(session.startTime).getHours();
    if (!hourlyEngagement[hour]) hourlyEngagement[hour] = [];
    hourlyEngagement[hour].push(session.engagement.overall_score);
  });

  let bestHour = null;
  let bestScore = 0;
  Object.entries(hourlyEngagement).forEach(([hour, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > bestScore) {
      bestScore = avg;
      bestHour = parseInt(hour);
    }
  });

  const bestStudyTime = bestHour !== null
    ? `${bestHour}:00 - ${bestHour + 1}:00`
    : null;

  return {
    bestStudyTime,
    avgEngagement: historicalData.reduce((sum, s) => sum + s.engagement.overall_score, 0) / historicalData.length,
    totalSessions: historicalData.length
  };
};

export default {
  processSessionData,
  calculateEngagementMetrics,
  processContentInteraction,
  processHealthMetrics,
  calculatePerformanceMetrics,
  compareWithAverage,
  generateRecommendations
};