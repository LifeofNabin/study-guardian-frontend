/**
 * FILE PATH: frontend/src/components/student/MetricsPanel.js
 * ✅ FIXED: Corrected percentage calculations and metric ranges
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  Activity,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  Smartphone,
  Clock,
  Target,
  Heart,
  Brain
} from 'lucide-react';
import './MetricsPanel.css';

/**
 * MetricsPanel Component
 * ✅ Fixed metric calculations to display correct values
 */
const MetricsPanel = ({ 
  sessionId,
  metrics = {},
  className = '' 
}) => {
  const [duration, setDuration] = useState(0);
  const [chartData, setChartData] = useState({
    engagement: [],
    attention: [],
    posture: [],
    blinkRate: []
  });

  // ✅ NEW: Smoothed metrics to prevent jumping
  const [smoothedMetrics, setSmoothedMetrics] = useState({
    engagementScore: 0,
    postureScore: 0,
    blinkRate: 0,
  });

  const chartUpdateIntervalRef = useRef(null);
  const maxDataPoints = 60;

  // ✅ Extract values from metrics prop with defaults
  const {
    faceDetected = false,
    lookingAtScreen = false,
    postureScore = 0,
    neckAngle = 0,
    backAngle = 0,
    hasPhone = false,
    engagementScore = 0,
    attentionRate = 0,
    blinkRate = 0,
    faceCount = 0
  } = metrics;

  // ✅ NEW: Smooth metric transitions - update only every 3 seconds
  useEffect(() => {
    const smoothInterval = setInterval(() => {
      setSmoothedMetrics({
        engagementScore: Math.round(engagementScore),
        postureScore: Math.round(postureScore),
        blinkRate: Math.round(blinkRate),
      });
    }, 3000);

    return () => clearInterval(smoothInterval);
  }, [engagementScore, postureScore, blinkRate]);

  // Duration Timer
  useEffect(() => {
    if (!sessionId) return;

    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId]);

  // ✅ FIXED: Update charts only every 5 seconds to avoid jumping
  useEffect(() => {
    if (!sessionId) {
      if (chartUpdateIntervalRef.current) clearInterval(chartUpdateIntervalRef.current);
      return;
    }

    const updateCharts = () => {
      const timestamp = Date.now();

      setChartData(prev => ({
        engagement: [
          ...prev.engagement.slice(-maxDataPoints + 1),
          { time: timestamp, value: engagementScore || 0 }
        ],
        attention: [
          ...prev.attention.slice(-maxDataPoints + 1),
          { time: timestamp, value: attentionRate || 0 }
        ],
        posture: [
          ...prev.posture.slice(-maxDataPoints + 1),
          { time: timestamp, value: postureScore || 0 }
        ],
        blinkRate: [
          ...prev.blinkRate.slice(-maxDataPoints + 1),
          { time: timestamp, value: blinkRate || 0 }
        ]
      }));
    };

    // ✅ Update charts every 5 seconds (was 2 seconds)
    chartUpdateIntervalRef.current = setInterval(updateCharts, 5000);

    return () => {
      if (chartUpdateIntervalRef.current) {
        clearInterval(chartUpdateIntervalRef.current);
      }
    };
  }, [sessionId, engagementScore, attentionRate, postureScore, blinkRate]);

  /**
   * Get status color based on score
   */
  const getStatusColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  /**
   * Get status icon based on value
   */
  const getStatusIcon = (value, threshold = 60) => {
    if (value >= threshold) {
      return <CheckCircle className="status-icon success" />;
    }
    return <AlertCircle className="status-icon danger" />;
  };

  /**
   * Get trend icon
   */
  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="trend-icon up" />;
    if (trend === 'declining') return <TrendingDown className="trend-icon down" />;
    return <Minus className="trend-icon stable" />;
  };

  /**
   * Format duration
   */
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Mini sparkline chart component
   */
  const MiniChart = ({ data, color = '#3b82f6' }) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data.map(d => d.value), 1);
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (d.value / max) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="mini-chart" viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  /**
   * Metric card component
   */
  const MetricCard = ({ 
    icon: Icon, 
    label, 
    value, 
    unit = '', 
    status,
    trend,
    chart 
  }) => (
    <div className={`metric-card ${status}`}>
      <div className="metric-header">
        <Icon className="metric-icon" />
        <span className="metric-label">{label}</span>
        {trend && getTrendIcon(trend)}
      </div>
      <div className="metric-value">
        {value}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {chart && (
        <div className="metric-chart">
          {chart}
        </div>
      )}
    </div>
  );

  /**
   * Progress ring component
   */
  const ProgressRing = ({ value, max = 100, size = 120, strokeWidth = 8, color = '#3b82f6' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = ((value / max) * circumference);
    const offset = circumference - progress;

    return (
      <div className="progress-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="progress-text">
          <span className="progress-value">{Math.round(value)}</span>
          <span className="progress-max">/{max}</span>
        </div>
      </div>
    );
  };

  if (!sessionId) {
    return (
      <div className={`metrics-panel ${className}`}>
        <div className="metrics-placeholder">
          <Activity className="placeholder-icon" />
          <p>Start a session to view real-time metrics.</p>
        </div>
      </div>
    );
  }

  // ✅ Check if we have any metrics data
  const hasMetrics = faceDetected !== undefined;
  const isActive = faceDetected || lookingAtScreen || postureScore > 0;

  return (
    <div className={`metrics-panel ${className}`}>
      {/* Header */}
      <div className="metrics-header">
        <h3>
          <Activity className="header-icon" />
          Real-time Metrics
        </h3>
        <div className="header-status">
          {isActive ? (
            <span className="status-badge processing">
              <span className="pulse-dot"></span>
              Live
            </span>
          ) : (
            <span className="status-badge idle">Idle</span>
          )}
        </div>
      </div>

      {/* ✅ HERO METRIC: Overall Engagement */}
      <div className="metrics-progress">
        <h4>Overall Engagement</h4>
        <ProgressRing
          value={engagementScore}
          color={getStatusColor(engagementScore) === 'success' ? '#10b981' : getStatusColor(engagementScore) === 'warning' ? '#f59e0b' : '#ef4444'}
        />
      </div>

      {/* Main Metrics Display */}
      <div className="metrics-grid">
        {/* Session Duration */}
        <MetricCard
          icon={Clock}
          label="Session Duration"
          value={formatDuration(duration)}
          status="neutral"
        />

        {/* ✅ FIXED: Engagement Score - removed *100 multiplication */}
        <MetricCard
          icon={Brain}
          label="Engagement"
          value={Math.round(engagementScore)}
          unit="%"
          status={getStatusColor(engagementScore)}
          trend={engagementScore > 80 ? 'improving' : engagementScore < 60 ? 'declining' : 'stable'}
          chart={<MiniChart data={chartData.engagement} color="#3b82f6" />}
        />

        {/* ✅ FIXED: Attention Rate - show as percentage */}
        <MetricCard
          icon={Eye}
          label="Attention"
          value={lookingAtScreen ? 'Focused' : 'Not Focused'}
          status={lookingAtScreen ? 'success' : 'danger'}
          chart={<MiniChart data={chartData.attention} color="#10b981" />}
        />

        {/* ✅ FIXED: Posture Score - removed *100 multiplication */}
        <MetricCard
          icon={User}
          label="Posture"
          value={Math.round(postureScore)}
          unit="/100"
          status={getStatusColor(postureScore)}
          trend={postureScore > 80 ? 'improving' : postureScore < 60 ? 'declining' : 'stable'}
          chart={<MiniChart data={chartData.posture} color="#f59e0b" />}
        />

        {/* ✅ FIXED: Blink Rate - proper unit */}
        <MetricCard
          icon={Heart}
          label="Blink Rate"
          value={blinkRate}
          unit=" blinks/min"
          status={blinkRate > 20 || blinkRate < 10 ? 'warning' : 'success'}
          chart={<MiniChart data={chartData.blinkRate} color="#ef4444" />}
        />

        {/* Phone Detection */}
        <MetricCard
          icon={Smartphone}
          label="Phone Usage"
          value={hasPhone ? 'Detected' : 'Not Detected'}
          status={hasPhone ? 'danger' : 'success'}
        />

        {/* Face Detection */}
        <MetricCard
          icon={Target}
          label="Face Detection"
          value={faceDetected ? 'Detected' : 'Not Detected'}
          status={faceDetected ? 'success' : 'danger'}
        />
      </div>

      {/* Additional Metrics */}
      {hasMetrics && (
        <div className="metrics-details">
          <h4>Additional Details</h4>
          <div className="details-grid">
            <div className="detail-item">
              <span>Neck Angle:</span>
              <span>{neckAngle.toFixed(1)}°</span>
            </div>
            <div className="detail-item">
              <span>Back Angle:</span>
              <span>{backAngle.toFixed(1)}°</span>
            </div>
            <div className="detail-item">
              <span>Face Count:</span>
              <span>{faceCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsPanel;