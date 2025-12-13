// frontend/src/components/student/HealthMonitor.js
import React, { useState, useEffect } from 'react';
import {
  Eye,
  Coffee,
  Maximize2,
  AlertTriangle,
  CheckCircle,
  Activity,
  Clock,
  Zap,
  TrendingUp,
  XCircle
} from 'lucide-react';

const HealthMonitor = ({ metrics, duration, onBreakRequest }) => {
  const [healthScore, setHealthScore] = useState(100);
  const [alerts, setAlerts] = useState([]);
  const [breakReminder, setBreakReminder] = useState(null);
  const [eyeStrainLevel, setEyeStrainLevel] = useState('low');
  const [fatigueLevel, setFatigueLevel] = useState('low');
  const [lastBreak, setLastBreak] = useState(0);

  // Calculate health metrics
  useEffect(() => {
    if (!metrics) return;

    // Calculate eye strain
    const avgBlinkRate = calculateAverageBlinkRate(metrics.blinkRates);
    const eyeStrain = calculateEyeStrain(avgBlinkRate, duration);
    setEyeStrainLevel(eyeStrain);

    // Calculate fatigue
    const fatigue = calculateFatigue(metrics);
    setFatigueLevel(fatigue);

    // Calculate overall health score
    const score = calculateHealthScore(metrics, duration);
    setHealthScore(score);

    // Check for alerts
    checkHealthAlerts(metrics, duration);
  }, [metrics, duration]);

  // 20-20-20 rule reminder
  useEffect(() => {
    const interval = setInterval(() => {
      const minutesStudied = Math.floor(duration / 60);
      if (minutesStudied > 0 && minutesStudied % 20 === 0 && minutesStudied !== lastBreak) {
        setBreakReminder({
          type: '20-20-20',
          message: 'Time for a 20-second break! Look at something 20 feet away.',
          duration: 20
        });
        setLastBreak(minutesStudied);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, lastBreak]);

  const calculateAverageBlinkRate = (blinkRates = []) => {
    if (blinkRates.length === 0) return 15;
    return blinkRates.reduce((sum, rate) => sum + rate, 0) / blinkRates.length;
  };

  const calculateEyeStrain = (blinkRate, duration) => {
    const durationMinutes = duration / 60;
    
    // Low blink rate = higher strain
    if (blinkRate < 10 && durationMinutes > 15) return 'high';
    if (blinkRate < 12 && durationMinutes > 30) return 'high';
    if (blinkRate < 14) return 'medium';
    return 'low';
  };

  const calculateFatigue = (metrics) => {
    const { yawnCount = 0, headDrops = 0, microSleeps = 0 } = metrics;
    
    if (microSleeps > 0 || yawnCount > 5) return 'high';
    if (yawnCount > 2 || headDrops > 3) return 'medium';
    return 'low';
  };

  const calculateHealthScore = (metrics, duration) => {
    let score = 100;

    // Deduct for poor posture
    const avgPosture = metrics.postureScores?.reduce((a, b) => a + b, 0) / 
                      (metrics.postureScores?.length || 1);
    if (avgPosture < 60) score -= 20;
    else if (avgPosture < 80) score -= 10;

    // Deduct for eye strain
    if (eyeStrainLevel === 'high') score -= 25;
    else if (eyeStrainLevel === 'medium') score -= 15;

    // Deduct for fatigue
    if (fatigueLevel === 'high') score -= 30;
    else if (fatigueLevel === 'medium') score -= 15;

    // Deduct for long session without break
    const minutesStudied = duration / 60;
    if (minutesStudied > 90) score -= 20;
    else if (minutesStudied > 60) score -= 10;

    return Math.max(0, score);
  };

  const checkHealthAlerts = (metrics, duration) => {
    const newAlerts = [];

    // Eye strain alert
    if (eyeStrainLevel === 'high') {
      newAlerts.push({
        id: 'eye-strain',
        type: 'warning',
        icon: Eye,
        message: 'High eye strain detected. Take a break and look away from screen.',
        action: 'Take Break'
      });
    }

    // Fatigue alert
    if (fatigueLevel === 'high') {
      newAlerts.push({
        id: 'fatigue',
        type: 'danger',
        icon: Coffee,
        message: 'Fatigue detected. Consider taking a longer break or ending session.',
        action: 'End Session'
      });
    }

    // Posture alert
    const recentPosture = metrics.postureScores?.slice(-5);
    const avgRecentPosture = recentPosture?.reduce((a, b) => a + b, 0) / 
                            (recentPosture?.length || 1);
    if (avgRecentPosture < 50) {
      newAlerts.push({
        id: 'posture',
        type: 'warning',
        icon: Activity,
        message: 'Poor posture detected. Please adjust your sitting position.',
        action: 'View Tips'
      });
    }

    // Long session alert
    if (duration > 5400) { // 90 minutes
      newAlerts.push({
        id: 'long-session',
        type: 'info',
        icon: Clock,
        message: 'You\'ve been studying for over 90 minutes. Consider taking a break.',
        action: 'Take Break'
      });
    }

    setAlerts(newAlerts);
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getHealthScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const dismissBreakReminder = () => {
    setBreakReminder(null);
  };

  const takeBreak = () => {
    if (onBreakRequest) {
      onBreakRequest(breakReminder?.duration || 300);
    }
    dismissBreakReminder();
  };

  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <Activity className="h-6 w-6 mr-2 text-blue-600" />
          Health Monitor
        </h3>
        <div className={`px-4 py-2 rounded-lg font-semibold ${getHealthScoreColor(healthScore)}`}>
          {healthScore}% {getHealthScoreLabel(healthScore)}
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Eye Strain */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Eye className={`h-5 w-5 ${
              eyeStrainLevel === 'high' ? 'text-red-600' :
              eyeStrainLevel === 'medium' ? 'text-yellow-600' :
              'text-green-600'
            }`} />
            <span className="text-xs font-medium text-gray-600">Eye Strain</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 capitalize">
            {eyeStrainLevel}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {eyeStrainLevel === 'low' ? 'Looking good!' :
             eyeStrainLevel === 'medium' ? 'Take breaks soon' :
             'Break needed now'}
          </div>
        </div>

        {/* Fatigue Level */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Zap className={`h-5 w-5 ${
              fatigueLevel === 'high' ? 'text-red-600' :
              fatigueLevel === 'medium' ? 'text-yellow-600' :
              'text-green-600'
            }`} />
            <span className="text-xs font-medium text-gray-600">Fatigue</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 capitalize">
            {fatigueLevel}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {fatigueLevel === 'low' ? 'Energized' :
             fatigueLevel === 'medium' ? 'Getting tired' :
             'Very tired'}
          </div>
        </div>

        {/* Posture Quality */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-5 w-5 text-green-600" />
            <span className="text-xs font-medium text-gray-600">Posture</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {metrics?.postureScores?.slice(-1)[0] || 0}%
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Current quality
          </div>
        </div>

        {/* Study Duration */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="text-xs font-medium text-gray-600">Duration</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {Math.floor(duration / 60)}m
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {duration > 5400 ? 'Consider break' : 'Good pace'}
          </div>
        </div>
      </div>

      {/* Break Reminder Modal */}
      {breakReminder && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <Eye className="h-6 w-6 text-blue-600 mr-3 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  {breakReminder.type === '20-20-20' ? '20-20-20 Rule Reminder' : 'Break Time'}
                </h4>
                <p className="text-sm text-blue-800">{breakReminder.message}</p>
              </div>
            </div>
            <button
              onClick={dismissBreakReminder}
              className="text-blue-600 hover:text-blue-800"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="flex space-x-3 mt-4">
            <button
              onClick={takeBreak}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Take {breakReminder.duration}s Break
            </button>
            <button
              onClick={dismissBreakReminder}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Health Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
            Health Alerts
          </h4>
          {alerts.map(alert => {
            const Icon = alert.icon;
            const colors = {
              danger: 'bg-red-50 border-red-200 text-red-800',
              warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
              info: 'bg-blue-50 border-blue-200 text-blue-800'
            };

            return (
              <div
                key={alert.id}
                className={`border rounded-lg p-3 ${colors[alert.type]}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <Icon className="h-5 w-5 mr-2 mt-0.5" />
                    <p className="text-sm flex-1">{alert.message}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="ml-2"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                {alert.action && (
                  <button
                    className="mt-2 text-sm font-medium underline"
                    onClick={() => {
                      if (alert.action === 'Take Break') takeBreak();
                      if (alert.action === 'End Session' && onBreakRequest) {
                        onBreakRequest('end');
                      }
                    }}
                  >
                    {alert.action}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Health Tips */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          Health Tips
        </h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-green-600 mr-2">•</span>
            <span>Follow 20-20-20 rule: Every 20 min, look 20 feet away for 20 seconds</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">•</span>
            <span>Maintain 50-70cm distance from screen</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">•</span>
            <span>Keep your back straight and shoulders relaxed</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">•</span>
            <span>Take a 5-10 minute break every hour</span>
          </li>
        </ul>
      </div>

      {/* Progress Indicator */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Overall Health</span>
          <span className="font-semibold text-gray-800">{healthScore}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              healthScore >= 80 ? 'bg-green-500' :
              healthScore >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default HealthMonitor;