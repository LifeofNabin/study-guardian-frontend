/**
 * FILE PATH: frontend/src/hooks/useAnalytics.js
 * 
 * Custom React hook for session analytics tracking
 * Aggregates metrics, tracks events, and manages session data
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import metricsCalculator from '../utils/metricsCalculator';
import axios from 'axios';

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  sessionId: null,
  userId: null,
  autoSave: true,
  saveInterval: 30000, // Save every 30 seconds
  trackPageViews: true,
  trackInteractions: true,
  enableLocalStorage: true
};

/**
 * Custom Hook: useAnalytics
 * 
 * @param {Object} config - Configuration options
 * @returns {Object} Analytics state and control methods
 */
const useAnalytics = (config = {}) => {
  const options = { ...DEFAULT_CONFIG, ...config };

  // Session state
  const [sessionId, setSessionId] = useState(options.sessionId);
  const [isActive, setIsActive] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  // Analytics metrics
  const [analytics, setAnalytics] = useState({
    duration: 0,
    engagementScore: 0,
    attentionRate: 0,
    blinkRate: 0,
    postureScore: 0,
    distractionCount: 0,
    pageViews: [],
    interactions: [],
    highlights: [],
    annotations: [],
    breaks: [],
    alerts: []
  });

  // Refs for tracking
  const sessionStartRef = useRef(null);
  const metricsHistoryRef = useRef([]);
  const eventsRef = useRef([]);
  const pageViewsRef = useRef([]);
  const interactionsRef = useRef([]);
  const saveIntervalRef = useRef(null);
  const currentPageRef = useRef(1);
  const lastActivityRef = useRef(Date.now());

  /**
   * Generate unique session ID
   */
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Start new analytics session
   */
  const startSession = useCallback(async (metadata = {}) => {
    try {
      const newSessionId = generateSessionId();
      sessionStartRef.current = Date.now();
      lastActivityRef.current = Date.now();

      setSessionId(newSessionId);
      setIsActive(true);

      // Initialize metrics calculator
      metricsCalculator.startSession();

      // Create session data
      const session = {
        sessionId: newSessionId,
        userId: options.userId,
        startTime: new Date().toISOString(),
        endTime: null,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        status: 'active'
      };

      setSessionData(session);

      // Save to backend
      if (options.autoSave) {
        try {
          await axios.post('/api/sessions', session);
          console.log('✅ Session created:', newSessionId);
        } catch (err) {
          console.error('Failed to create session:', err);
        }
      }

      // Save to localStorage as backup
      if (options.enableLocalStorage) {
        localStorage.setItem('currentSession', JSON.stringify(session));
      }

      // Start auto-save interval
      if (options.autoSave) {
        saveIntervalRef.current = setInterval(() => {
          saveSessionData();
        }, options.saveInterval);
      }

      return newSessionId;

    } catch (err) {
      console.error('Failed to start session:', err);
      throw err;
    }
  }, [options, generateSessionId]);

  /**
   * End current session
   */
  const endSession = useCallback(async () => {
    if (!isActive || !sessionId) return null;

    try {
      const endTime = Date.now();
      const duration = endTime - sessionStartRef.current;

      // Calculate final analytics
      const finalAnalytics = calculateFinalAnalytics();

      // Update session data
      const updatedSession = {
        ...sessionData,
        endTime: new Date().toISOString(),
        duration,
        analytics: finalAnalytics,
        status: 'completed'
      };

      // Save final session data
      await saveSessionData(updatedSession);

      // Clear interval
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }

      setIsActive(false);
      setSessionData(updatedSession);

      // Clear localStorage
      if (options.enableLocalStorage) {
        localStorage.removeItem('currentSession');
      }

      console.log('✅ Session ended:', sessionId);
      return updatedSession;

    } catch (err) {
      console.error('Failed to end session:', err);
      throw err;
    }
  }, [isActive, sessionId, sessionData, options.enableLocalStorage]);

  /**
   * Record webcam metrics
   */
  const recordMetrics = useCallback((metrics) => {
    if (!isActive) return;

    const timestamp = Date.now();
    const metricData = {
      ...metrics,
      timestamp,
      sessionId
    };

    // Store in history
    metricsHistoryRef.current.push(metricData);

    // Keep only last 1000 metrics to prevent memory issues
    if (metricsHistoryRef.current.length > 1000) {
      metricsHistoryRef.current = metricsHistoryRef.current.slice(-1000);
    }

    // Send to metrics calculator
    metricsCalculator.recordMetric(metricData);

    // Update activity timestamp
    lastActivityRef.current = timestamp;

    // Update analytics state periodically (every 10 metrics)
    if (metricsHistoryRef.current.length % 10 === 0) {
      updateAnalytics();
    }
  }, [isActive, sessionId]);

  /**
   * Track page view
   */
  const trackPageView = useCallback((pageNumber) => {
    if (!isActive || !options.trackPageViews) return;

    const pageView = {
      pageNumber,
      timestamp: Date.now(),
      duration: 0, // Will be calculated when leaving page
      sessionId
    };

    pageViewsRef.current.push(pageView);
    currentPageRef.current = pageNumber;

    console.log('📄 Page view tracked:', pageNumber);
  }, [isActive, sessionId, options.trackPageViews]);

  /**
   * Track interaction (highlight, annotation, etc.)
   */
  const trackInteraction = useCallback((type, data) => {
    if (!isActive || !options.trackInteractions) return;

    const interaction = {
      type,
      data,
      timestamp: Date.now(),
      pageNumber: currentPageRef.current,
      sessionId
    };

    interactionsRef.current.push(interaction);
    lastActivityRef.current = Date.now();

    console.log('🖱️ Interaction tracked:', type);
  }, [isActive, sessionId, options.trackInteractions]);

  /**
   * Track event (distraction, break, alert)
   */
  const trackEvent = useCallback((eventType, eventData) => {
    if (!isActive) return;

    const event = {
      type: eventType,
      data: eventData,
      timestamp: Date.now(),
      sessionId
    };

    eventsRef.current.push(event);

    // Update analytics for specific events
    if (eventType === 'distraction') {
      setAnalytics(prev => ({
        ...prev,
        distractionCount: prev.distractionCount + 1
      }));
    } else if (eventType === 'break') {
      setAnalytics(prev => ({
        ...prev,
        breaks: [...prev.breaks, event]
      }));
    } else if (eventType === 'alert') {
      setAnalytics(prev => ({
        ...prev,
        alerts: [...prev.alerts, event]
      }));
    }

    console.log(`📊 Event tracked: ${eventType}`);
  }, [isActive, sessionId]);

  /**
   * Add highlight
   */
  const addHighlight = useCallback((highlightData) => {
    if (!isActive) return;

    const highlight = {
      ...highlightData,
      timestamp: Date.now(),
      sessionId
    };

    setAnalytics(prev => ({
      ...prev,
      highlights: [...prev.highlights, highlight]
    }));

    trackInteraction('highlight', highlight);
  }, [isActive, sessionId, trackInteraction]);

  /**
   * Add annotation
   */
  const addAnnotation = useCallback((annotationData) => {
    if (!isActive) return;

    const annotation = {
      ...annotationData,
      timestamp: Date.now(),
      sessionId
    };

    setAnalytics(prev => ({
      ...prev,
      annotations: [...prev.annotations, annotation]
    }));

    trackInteraction('annotation', annotation);
  }, [isActive, sessionId, trackInteraction]);

  /**
   * Update analytics from current metrics
   */
  const updateAnalytics = useCallback(() => {
    if (!isActive) return;

    const duration = Date.now() - sessionStartRef.current;
    const sessionAnalytics = metricsCalculator.generateSessionAnalytics();

    setAnalytics(prev => ({
      ...prev,
      duration,
      engagementScore: sessionAnalytics.averages.engagement,
      attentionRate: sessionAnalytics.focus.focusRate,
      blinkRate: metricsHistoryRef.current.length > 0 
        ? metricsCalculator.calculateAverage(metricsHistoryRef.current, 'blinkRate')
        : 0,
      postureScore: sessionAnalytics.averages.posture,
      distractionCount: sessionAnalytics.distractions.total,
      pageViews: pageViewsRef.current,
      interactions: interactionsRef.current
    }));
  }, [isActive]);

  /**
   * Calculate final analytics at session end
   */
  const calculateFinalAnalytics = useCallback(() => {
    const sessionAnalytics = metricsCalculator.generateSessionAnalytics();

    return {
      session: {
        duration: Date.now() - sessionStartRef.current,
        startTime: new Date(sessionStartRef.current).toISOString(),
        endTime: new Date().toISOString()
      },
      engagement: {
        averageScore: sessionAnalytics.averages.engagement,
        trend: sessionAnalytics.performance.trend,
        bestPeriod: sessionAnalytics.performance.bestPeriod,
        worstPeriod: sessionAnalytics.performance.worstPeriod
      },
      attention: {
        focusRate: sessionAnalytics.focus.focusRate,
        totalSpans: sessionAnalytics.focus.totalSpans,
        avgSpanDuration: sessionAnalytics.focus.avgSpanDuration,
        longestSpan: sessionAnalytics.focus.longestSpan
      },
      health: {
        averagePosture: sessionAnalytics.averages.posture,
        eyeStrainLevel: sessionAnalytics.health.eyeStrainLevel,
        postureIssues: sessionAnalytics.health.postureIssues,
        recommendedBreaks: sessionAnalytics.health.recommendedBreaks
      },
      distractions: {
        total: sessionAnalytics.distractions.total,
        rate: sessionAnalytics.distractions.rate,
        types: sessionAnalytics.distractions.types
      },
      content: {
        totalPages: Math.max(...pageViewsRef.current.map(p => p.pageNumber), 0),
        pagesViewed: new Set(pageViewsRef.current.map(p => p.pageNumber)).size,
        highlights: analytics.highlights.length,
        annotations: analytics.annotations.length
      },
      interactions: {
        total: interactionsRef.current.length,
        byType: this.groupInteractionsByType(interactionsRef.current),
        pageViews: pageViewsRef.current.length
      },
      events: {
        total: eventsRef.current.length,
        breaks: analytics.breaks.length,
        alerts: analytics.alerts.length
      }
    };
  }, [analytics]);

  /**
   * Group interactions by type
   */
  const groupInteractionsByType = useCallback((interactions) => {
    const grouped = {};
    interactions.forEach(interaction => {
      grouped[interaction.type] = (grouped[interaction.type] || 0) + 1;
    });
    return grouped;
  }, []);

  /**
   * Save session data to backend
   */
  const saveSessionData = useCallback(async (data = null) => {
    if (!isActive && !data) return;

    setIsSaving(true);

    try {
      const dataToSave = data || {
        sessionId,
        analytics,
        metrics: metricsHistoryRef.current.slice(-100), // Last 100 metrics
        events: eventsRef.current,
        pageViews: pageViewsRef.current,
        interactions: interactionsRef.current.slice(-50), // Last 50 interactions
        lastUpdate: new Date().toISOString()
      };

      await axios.put(`/api/sessions/${sessionId}`, dataToSave);
      
      setLastSaveTime(Date.now());
      console.log('💾 Session data saved');

    } catch (err) {
      console.error('Failed to save session data:', err);
    } finally {
      setIsSaving(false);
    }
  }, [isActive, sessionId, analytics]);

  /**
   * Get session summary
   */
  const getSessionSummary = useCallback(() => {
    return {
      sessionId,
      duration: Date.now() - sessionStartRef.current,
      isActive,
      analytics: {
        ...analytics,
        metricsCount: metricsHistoryRef.current.length,
        eventsCount: eventsRef.current.length,
        interactionsCount: interactionsRef.current.length
      }
    };
  }, [sessionId, isActive, analytics]);

  /**
   * Export session data
   */
  const exportSessionData = useCallback((format = 'json') => {
    const exportData = {
      session: sessionData,
      analytics: calculateFinalAnalytics(),
      metrics: metricsHistoryRef.current,
      events: eventsRef.current,
      pageViews: pageViewsRef.current,
      interactions: interactionsRef.current
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      return URL.createObjectURL(blob);
    }

    // Add CSV export if needed
    return null;
  }, [sessionData, calculateFinalAnalytics]);

  /**
   * Resume session from localStorage
   */
  const resumeSession = useCallback(() => {
    if (!options.enableLocalStorage) return false;

    try {
      const savedSession = localStorage.getItem('currentSession');
      if (!savedSession) return false;

      const session = JSON.parse(savedSession);
      setSessionId(session.sessionId);
      setSessionData(session);
      setIsActive(true);
      sessionStartRef.current = new Date(session.startTime).getTime();

      console.log('🔄 Session resumed:', session.sessionId);
      return true;

    } catch (err) {
      console.error('Failed to resume session:', err);
      return false;
    }
  }, [options.enableLocalStorage]);

  /**
   * Detect inactivity
   */
  useEffect(() => {
    if (!isActive) return;

    const inactivityCheckInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      // If inactive for 5 minutes, track event
      if (timeSinceActivity > 300000) {
        trackEvent('inactivity', { duration: timeSinceActivity });
        lastActivityRef.current = Date.now(); // Reset to avoid spam
      }
    }, 60000); // Check every minute

    return () => clearInterval(inactivityCheckInterval);
  }, [isActive, trackEvent]);

  /**
   * Update analytics periodically
   */
  useEffect(() => {
    if (!isActive) return;

    const updateInterval = setInterval(() => {
      updateAnalytics();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(updateInterval);
  }, [isActive, updateAnalytics]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isActive) {
        endSession();
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [isActive, endSession]);

  /**
   * Handle page unload (save before close)
   */
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isActive) {
        saveSessionData();
        // Some browsers require returnValue
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive, saveSessionData]);

  return {
    // Session state
    sessionId,
    isActive,
    sessionData,
    isSaving,
    lastSaveTime,
    
    // Analytics data
    analytics,
    
    // Session control
    startSession,
    endSession,
    resumeSession,
    
    // Tracking methods
    recordMetrics,
    trackPageView,
    trackInteraction,
    trackEvent,
    addHighlight,
    addAnnotation,
    
    // Data methods
    saveSessionData,
    getSessionSummary,
    exportSessionData,
    updateAnalytics,
    
    // Utility getters
    sessionDuration: isActive ? Date.now() - sessionStartRef.current : 0,
    metricsCount: metricsHistoryRef.current.length,
    eventsCount: eventsRef.current.length,
    isHealthy: analytics.engagementScore > 60 && analytics.postureScore > 60
  };
};

export default useAnalytics;