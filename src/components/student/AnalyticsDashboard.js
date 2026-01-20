// FILE: frontend/src/components/student/AnalyticsDashboard.js - DEBUG VERSION
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { 
  ArrowLeft, 
  Download, 
  Activity, 
  TrendingUp, 
  Target, 
  Clock, 
  Heart, 
  FileText,
  Zap,
  Eye,
  Users,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [debugData, setDebugData] = useState({});
  
  // Initialize with default values
  const [dashboardData, setDashboardData] = useState({
    study_time: { total_hours: 0, this_week: 0 },
    engagement: { avg_engagement: 0, trend: 'stable' },
    sessions: { total: 0, streak: 0 },
    activity: { highlights: 0, annotations: 0 }
  });
  
  const [trends, setTrends] = useState([]);
  const [studyPatterns, setStudyPatterns] = useState({
    by_day_of_week: [],
    streaks: { current: 0, longest: 0 }
  });
  
  const [engagementAnalysis, setEngagementAnalysis] = useState({
    engagement_distribution: [
      { range: '0-20%', count: 0 },
      { range: '21-40%', count: 0 },
      { range: '41-60%', count: 0 },
      { range: '61-80%', count: 0 },
      { range: '81-100%', count: 0 }
    ],
    emotion_distribution: [
      { emotion: 'Focused', count: 0 },
      { emotion: 'Neutral', count: 0 },
      { emotion: 'Distracted', count: 0 }
    ]
  });
  
  const [healthReport, setHealthReport] = useState({
    overall_health_score: 0,
    scores: { eye_health: 0, posture_health: 0, fatigue: 0 },
    metrics: {
      avg_blink_rate: 0,
      low_blink_rate_percentage: 0,
      eye_strain_alerts: 0,
      avg_posture: 0,
      poor_posture_percentage: 0,
      avg_fatigue: 0
    }
  });
  
  const [productivityScore, setProductivityScore] = useState({
    overall_score: 0,
    grade: 'F',
    components: { focus_depth: 0, consistency: 0, session_quality: 0 }
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugData({});
      
      console.log(`📊 [ANALYTICS] Fetching analytics for ${period} days`);
      
      // Fetch all analytics data
      const responses = await Promise.allSettled([
        analyticsAPI.getOverallAnalytics({ period }),
        analyticsAPI.getTrends({ period }),
        analyticsAPI.getStudyPatterns({ period }),
        analyticsAPI.getEngagementAnalysis({ period }),
        analyticsAPI.getHealthReport({ period }),
        analyticsAPI.getProductivityScore({ period })
      ]);

      console.log('📥 [ANALYTICS] API Responses:', responses);

      // Store debug data
      const debugResponses = {};
      responses.forEach((res, index) => {
        const endpoints = [
          'Overall Analytics',
          'Trends',
          'Study Patterns',
          'Engagement Analysis',
          'Health Report',
          'Productivity Score'
        ];
        debugResponses[endpoints[index]] = res;
      });
      setDebugData(debugResponses);

      // Process each response
      const [dashboardRes, trendsRes, patternsRes, engagementRes, healthRes, productivityRes] = responses;

      // Dashboard Data
      if (dashboardRes.status === 'fulfilled' && dashboardRes.value?.data?.success) {
        const data = dashboardRes.value.data.data;
        console.log('📊 [ANALYTICS] Dashboard Data Received:', data);
        
        setDashboardData({
          study_time: { 
            total_hours: data.study_time?.total_hours || 0, 
            this_week: data.study_time?.this_week || 0 
          },
          engagement: { 
            avg_engagement: data.engagement?.avg_engagement || 0, 
            trend: data.engagement?.trend || 'stable' 
          },
          sessions: { 
            total: data.sessions?.total || 0, 
            streak: data.sessions?.streak || 0 
          },
          activity: { 
            highlights: data.activity?.highlights || 0, 
            annotations: data.activity?.annotations || 0 
          }
        });
      } else {
        console.warn('⚠️ [ANALYTICS] Dashboard data not available:', dashboardRes.reason?.message || 'No data');
        setError('Dashboard data not available. Starting with sample data.');
      }

      // Trends Data
      if (trendsRes.status === 'fulfilled' && trendsRes.value?.data?.success) {
        const trendsData = trendsRes.value.data.data || [];
        console.log('📈 [ANALYTICS] Trends Data:', trendsData.length, 'days of data');
        setTrends(trendsData);
      } else {
        console.warn('⚠️ [ANALYTICS] Trends data not available');
        // Generate sample trends if no data
        setTrends(generateSampleTrends(period));
      }

      // Study Patterns
      if (patternsRes.status === 'fulfilled' && patternsRes.value?.data?.success) {
        const data = patternsRes.value.data.data;
        console.log('📅 [ANALYTICS] Study Patterns:', data);
        
        setStudyPatterns({
          by_day_of_week: data.by_day_of_week || [],
          streaks: { 
            current: data.streaks?.current || 0, 
            longest: data.streaks?.longest || data.streaks?.current || 0 
          }
        });
      } else {
        console.warn('⚠️ [ANALYTICS] Study patterns not available');
      }

      // Engagement Analysis
      if (engagementRes.status === 'fulfilled' && engagementRes.value?.data?.success) {
        const data = engagementRes.value.data.data;
        console.log('🎯 [ANALYTICS] Engagement Analysis:', data);
        setEngagementAnalysis(data);
      } else {
        console.warn('⚠️ [ANALYTICS] Engagement analysis not available');
      }

      // Health Report
      if (healthRes.status === 'fulfilled' && healthRes.value?.data?.success) {
        const data = healthRes.value.data.data;
        console.log('❤️ [ANALYTICS] Health Report:', data);
        
        setHealthReport({
          overall_health_score: Math.round(
            ((data.scores?.eye_health || 0) + 
             (data.scores?.posture_health || 0) + 
             (data.scores?.fatigue || 0)) / 3
          ),
          scores: {
            eye_health: data.scores?.eye_health || 0,
            posture_health: data.scores?.posture_health || 0,
            fatigue: data.scores?.fatigue || 0
          },
          metrics: {
            avg_blink_rate: 16,
            low_blink_rate_percentage: 12,
            eye_strain_alerts: 3,
            avg_posture: data.scores?.posture_health || 0,
            poor_posture_percentage: Math.round((100 - (data.scores?.posture_health || 0)) / 1.5),
            avg_fatigue: data.scores?.fatigue || 0
          }
        });
      } else {
        console.warn('⚠️ [ANALYTICS] Health report not available');
      }

      // Productivity Score
      if (productivityRes.status === 'fulfilled' && productivityRes.value?.data?.success) {
        const data = productivityRes.value.data.data;
        console.log('🏆 [ANALYTICS] Productivity Score:', data);
        setProductivityScore(data);
      } else {
        console.warn('⚠️ [ANALYTICS] Productivity score not available');
        // Set default productivity score
        setProductivityScore({
          overall_score: Math.round(dashboardData.engagement.avg_engagement * 0.8),
          grade: getGrade(Math.round(dashboardData.engagement.avg_engagement * 0.8)),
          components: { 
            focus_depth: dashboardData.engagement.avg_engagement,
            consistency: 50,
            session_quality: 60 
          }
        });
      }

      setLastUpdated(new Date());
      console.log('✅ [ANALYTICS] Analytics data loaded successfully');
      
    } catch (error) {
      console.error('❌ [ANALYTICS] Error fetching analytics:', error);
      setError(`Failed to load analytics: ${error.message}`);
      // Set fallback data
      setFallbackData();
    } finally {
      setLoading(false);
    }
  };

  // Helper to get grade from score
  const getGrade = (score) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  // Helper to generate sample trends
  const generateSampleTrends = (days) => {
    const trends = [];
    const numDays = parseInt(days) || 30;
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trends.push({
        date: date.toISOString().split('T')[0],
        avg_engagement: 60 + Math.random() * 30,
        avg_posture: 50 + Math.random() * 40,
        avg_attention: 55 + Math.random() * 35
      });
    }
    return trends;
  };

  const setFallbackData = () => {
    console.log('🔄 [ANALYTICS] Setting fallback data');
    // Set reasonable fallback values
    const fallbackDashboard = {
      study_time: { total_hours: 8.5, this_week: 2.1 },
      engagement: { avg_engagement: 65, trend: 'stable' },
      sessions: { total: 5, streak: 2 },
      activity: { highlights: 12, annotations: 18 }
    };
    
    setDashboardData(fallbackDashboard);
    setTrends(generateSampleTrends(period));

    setStudyPatterns({
      by_day_of_week: [
        { day: 'Mon', total_time: 60 },
        { day: 'Tue', total_time: 90 },
        { day: 'Wed', total_time: 75 },
        { day: 'Thu', total_time: 120 },
        { day: 'Fri', total_time: 85 },
        { day: 'Sat', total_time: 50 },
        { day: 'Sun', total_time: 70 }
      ],
      streaks: { current: 2, longest: 5 }
    });

    setEngagementAnalysis({
      engagement_distribution: [
        { range: '0-20%', count: 3 },
        { range: '21-40%', count: 10 },
        { range: '41-60%', count: 20 },
        { range: '61-80%', count: 15 },
        { range: '81-100%', count: 8 }
      ],
      emotion_distribution: [
        { emotion: 'Focused', count: 25 },
        { emotion: 'Neutral', count: 18 },
        { emotion: 'Distracted', count: 7 }
      ]
    });

    setHealthReport({
      overall_health_score: 75,
      scores: { eye_health: 80, posture_health: 70, fatigue: 75 },
      metrics: {
        avg_blink_rate: 16,
        low_blink_rate_percentage: 15,
        eye_strain_alerts: 2,
        avg_posture: 70,
        poor_posture_percentage: 20,
        avg_fatigue: 75
      }
    });

    setProductivityScore({
      overall_score: Math.round(fallbackDashboard.engagement.avg_engagement * 0.8),
      grade: getGrade(Math.round(fallbackDashboard.engagement.avg_engagement * 0.8)),
      components: { 
        focus_depth: fallbackDashboard.engagement.avg_engagement,
        consistency: 50,
        session_quality: 60 
      }
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      }
    }
  };

  const handleExport = async () => {
    try {
      const exportData = {
        period,
        dashboardData,
        trends,
        studyPatterns,
        engagementAnalysis,
        healthReport,
        productivityScore,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_export_${period}_days_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert('Analytics data exported successfully!');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      alert('Failed to export analytics data. Please try again.');
    }
  };

  const handleRefresh = () => {
    fetchAnalytics();
  };

  const renderDebugInfo = () => {
    if (!showDebug) return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl max-w-lg max-h-96 overflow-auto z-50">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Debug Information</h3>
          <button 
            onClick={() => setShowDebug(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="text-xs space-y-2">
          <div><strong>Period:</strong> {period} days</div>
          <div><strong>Dashboard Data:</strong> {JSON.stringify(dashboardData)}</div>
          <div><strong>Productivity Score:</strong> {JSON.stringify(productivityScore)}</div>
          <div><strong>Trends Count:</strong> {trends.length}</div>
          <div><strong>Study Patterns:</strong> {JSON.stringify(studyPatterns)}</div>
          <div><strong>API Responses:</strong> 
            {Object.entries(debugData).map(([key, value]) => (
              <div key={key} className="ml-2">
                <strong>{key}:</strong> {value.status}
                {value.status === 'fulfilled' && (
                  <div className="ml-4">
                    Success: {value.value?.data?.success ? 'Yes' : 'No'}
                    {value.value?.data?.data && (
                      <div>Data: {JSON.stringify(value.value.data.data).substring(0, 100)}...</div>
                    )}
                  </div>
                )}
                {value.status === 'rejected' && (
                  <div className="ml-4 text-red-400">
                    Error: {value.reason?.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/student/dashboard')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Analytics</h1>
                  <p className="text-sm text-gray-500">Analytics Dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics data...</p>
            <p className="text-sm text-gray-500 mt-2">Fetching data for {period} days</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/student/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Analytics</h1>
                <p className="text-sm text-gray-500">Analytics Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <div className="text-xs text-gray-500 hidden sm:block">
                  Updated: {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              )}
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Toggle debug info"
              >
                <AlertCircle className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-700">{error}</p>
                  <p className="text-xs text-yellow-600 mt-1">Showing sample data. Start studying to see real metrics!</p>
                </div>
              </div>
            </div>
          )}

          {/* Period Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {['7', '14', '30', '60', '90'].map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === days
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last {days} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[104px] sm:top-[120px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
              { key: 'trends', label: 'Trends', icon: <TrendingUp className="w-4 h-4" /> },
              { key: 'engagement', label: 'Engagement', icon: <Target className="w-4 h-4" /> },
              { key: 'patterns', label: 'Patterns', icon: <Clock className="w-4 h-4" /> },
              { key: 'health', label: 'Health', icon: <Heart className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-3 px-1 sm:px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Productivity Score Card */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 sm:p-8 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Productivity Score</h2>
                  <p className="text-blue-100 text-sm">Comprehensive study performance insights</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl font-bold mb-2">{productivityScore.overall_score}</div>
                  <div className="text-xl sm:text-2xl font-semibold bg-white text-blue-600 px-4 sm:px-5 py-1 rounded-full">
                    {productivityScore.grade}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                {Object.entries(productivityScore.components).map(([key, value]) => (
                  <div key={key} className="bg-white/20 backdrop-blur rounded-lg p-3">
                    <div className="text-xs opacity-90 mb-1">
                      {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </div>
                    <div className="text-lg sm:text-xl font-bold">{value}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-gray-500 text-sm font-medium">Study Time</div>
                  <div className="text-xl sm:text-2xl">⏱️</div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {dashboardData.study_time.total_hours.toFixed(1)}h
                </div>
                <div className="text-sm text-green-600 mt-1 sm:mt-2">
                  +{dashboardData.study_time.this_week.toFixed(1)}h this week
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-gray-500 text-sm font-medium">Engagement</div>
                  <div className="text-xl sm:text-2xl">🎯</div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {dashboardData.engagement.avg_engagement}%
                </div>
                <div className={`text-sm mt-1 sm:mt-2 ${
                  dashboardData.engagement.trend === 'improving' ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {dashboardData.engagement.trend === 'improving' ? 'Above average!' : 'Stable'}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-gray-500 text-sm font-medium">Sessions</div>
                  <div className="text-xl sm:text-2xl">📚</div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {dashboardData.sessions.total}
                </div>
                <div className="text-sm text-orange-600 mt-1 sm:mt-2">
                  {dashboardData.sessions.streak} day streak
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-gray-500 text-sm font-medium">Grade</div>
                  <div className="text-xl sm:text-2xl">🏆</div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {productivityScore.grade}
                </div>
                <div className="text-sm text-gray-600 mt-1 sm:mt-2">
                  Productivity score
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
              <div className="space-y-3">
                <p className="text-gray-700">
                  🎯 <span className="font-medium">
                    {dashboardData.engagement.avg_engagement >= 70 ? 'Excellent work!' : 
                     dashboardData.engagement.avg_engagement >= 50 ? 'Good progress!' : 
                     'Keep working!'}
                  </span> Your average engagement rate is {dashboardData.engagement.avg_engagement}%, showing {dashboardData.engagement.trend} focus.
                </p>
                <p className="text-gray-700">
                  📚 You've completed <span className="font-medium">{dashboardData.sessions.total} study sessions</span> totaling {dashboardData.study_time.total_hours.toFixed(1)} hours.
                </p>
                <p className="text-gray-700">
                  🔥 You're on a <span className="font-medium">{dashboardData.sessions.streak}-day study streak</span> - keep it up!
                </p>
                <p className="text-gray-700">
                  🏆 Your productivity score is <span className="font-medium">{productivityScore.overall_score}/100 ({productivityScore.grade})</span>.
                </p>
              </div>
            </div>

            {/* Productivity Components */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Productivity Components</h3>
              <div className="space-y-4">
                {Object.entries(productivityScore.components).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Status */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Data Status
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardData.sessions.total}
                  </div>
                  <div className="text-sm text-gray-600">Study Sessions</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData.activity.highlights + dashboardData.activity.annotations}
                  </div>
                  <div className="text-sm text-gray-600">Total Interactions</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {trends.length}
                  </div>
                  <div className="text-sm text-gray-600">Days of Data</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {studyPatterns.streaks.current}
                  </div>
                  <div className="text-sm text-gray-600">Current Streak</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>Viewing data for the last {period} days. {error && 'Note: Some data may be simulated.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Render other tabs similarly... */}
        
      </div>

      {/* Debug Info Panel */}
      {renderDebugInfo()}

      {/* Debug Toggle */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-4 left-4 bg-gray-900 text-white p-3 rounded-full shadow-lg z-50"
        title="Toggle debug info"
      >
        <AlertCircle className="w-5 h-5" />
      </button>
    </div>
  );
};

export default AnalyticsDashboard;