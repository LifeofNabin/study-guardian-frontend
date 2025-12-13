import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30'); // days
  const [dashboardData, setDashboardData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [studyPatterns, setStudyPatterns] = useState(null);
  const [engagementAnalysis, setEngagementAnalysis] = useState(null);
  const [healthReport, setHealthReport] = useState(null);
  const [productivityScore, setProductivityScore] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch all analytics data
      const [
        dashboardRes,
        trendsRes,
        patternsRes,
        engagementRes,
        healthRes,
        productivityRes
      ] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/analytics?period=${period}`, config),
        axios.get(`${API_URL}/api/analytics/trends?period=${period}&granularity=daily`, config),
        axios.get(`${API_URL}/api/analytics/study-patterns?period=${period}`, config),
        axios.get(`${API_URL}/api/analytics/engagement-analysis?period=${period}`, config),
        axios.get(`${API_URL}/api/analytics/health-report?period=${period}`, config),
        axios.get(`${API_URL}/api/analytics/productivity-score?period=7`, config)
      ]);

      setDashboardData(dashboardRes.data.data);
      setTrends(trendsRes.data.data);
      setStudyPatterns(patternsRes.data.data);
      setEngagementAnalysis(engagementRes.data.data);
      setHealthReport(healthRes.data.data);
      setProductivityScore(productivityRes.data.data);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chart configurations
  const getEngagementTrendChart = () => {
    if (!trends || trends.length === 0) return null;

    return {
      labels: trends.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Engagement Score',
          data: trends.map(t => t.avg_engagement),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Attention Score',
          data: trends.map(t => t.avg_attention),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  const getPostureChart = () => {
    if (!trends || trends.length === 0) return null;

    return {
      labels: trends.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Posture Score',
          data: trends.map(t => t.avg_posture),
          backgroundColor: trends.map(t => 
            t.avg_posture >= 75 ? 'rgba(16, 185, 129, 0.6)' :
            t.avg_posture >= 50 ? 'rgba(251, 191, 36, 0.6)' :
            'rgba(239, 68, 68, 0.6)'
          ),
          borderColor: 'rgb(107, 114, 128)',
          borderWidth: 1
        }
      ]
    };
  };

  const getStudyTimeByDayChart = () => {
    if (!studyPatterns || !studyPatterns.by_day_of_week) return null;

    return {
      labels: studyPatterns.by_day_of_week.map(d => d.day),
      datasets: [
        {
          label: 'Study Time (minutes)',
          data: studyPatterns.by_day_of_week.map(d => d.total_time),
          backgroundColor: 'rgba(139, 92, 246, 0.6)',
          borderColor: 'rgb(139, 92, 246)',
          borderWidth: 2
        }
      ]
    };
  };

  const getStudyTimeByHourChart = () => {
    if (!studyPatterns || !studyPatterns.by_hour_of_day) return null;

    return {
      labels: studyPatterns.by_hour_of_day.map(h => h.time_label),
      datasets: [
        {
          label: 'Sessions',
          data: studyPatterns.by_hour_of_day.map(h => h.sessions),
          backgroundColor: 'rgba(236, 72, 153, 0.6)',
          borderColor: 'rgb(236, 72, 153)',
          borderWidth: 2
        }
      ]
    };
  };

  const getEngagementDistributionChart = () => {
    if (!engagementAnalysis || !engagementAnalysis.engagement_distribution) return null;

    return {
      labels: engagementAnalysis.engagement_distribution.map(d => d.range),
      datasets: [
        {
          data: engagementAnalysis.engagement_distribution.map(d => d.count),
          backgroundColor: [
            'rgba(239, 68, 68, 0.6)',
            'rgba(251, 191, 36, 0.6)',
            'rgba(59, 130, 246, 0.6)',
            'rgba(16, 185, 129, 0.6)',
            'rgba(139, 92, 246, 0.6)'
          ],
          borderColor: [
            'rgb(239, 68, 68)',
            'rgb(251, 191, 36)',
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(139, 92, 246)'
          ],
          borderWidth: 2
        }
      ]
    };
  };

  const getEmotionDistributionChart = () => {
    if (!engagementAnalysis || !engagementAnalysis.emotion_distribution) return null;

    const topEmotions = engagementAnalysis.emotion_distribution.slice(0, 6);

    return {
      labels: topEmotions.map(e => e.emotion),
      datasets: [
        {
          data: topEmotions.map(e => e.count),
          backgroundColor: [
            'rgba(59, 130, 246, 0.6)',
            'rgba(16, 185, 129, 0.6)',
            'rgba(251, 191, 36, 0.6)',
            'rgba(239, 68, 68, 0.6)',
            'rgba(139, 92, 246, 0.6)',
            'rgba(236, 72, 153, 0.6)'
          ],
          borderWidth: 2
        }
      ]
    };
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
        beginAtZero: true
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive insights into your study performance</p>
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Time Period:</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {['overview', 'engagement', 'patterns', 'health'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboardData && (
        <div className="space-y-6">
          {/* Productivity Score Card */}
          {productivityScore && (
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-8 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Productivity Score</h2>
                  <p className="text-blue-100">Your overall performance grade</p>
                </div>
                <div className="text-center">
                  <div className="text-6xl font-bold mb-2">{productivityScore.overall_score}</div>
                  <div className="text-3xl font-semibold bg-white text-blue-600 px-6 py-2 rounded-full">
                    {productivityScore.grade}
                  </div>
                </div>
              </div>

              {/* Component Scores */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                {Object.entries(productivityScore.components).map(([key, value]) => (
                  <div key={key} className="bg-white/20 backdrop-blur rounded-lg p-4">
                    <div className="text-sm opacity-90 mb-1">
                      {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </div>
                    <div className="text-2xl font-bold">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Sessions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-500 text-sm font-medium">Total Sessions</div>
                <div className="text-2xl">📚</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{dashboardData.sessions.total}</div>
              <div className="text-sm text-gray-500 mt-2">
                {dashboardData.sessions.completion_rate.toFixed(1)}% completion rate
              </div>
            </div>

            {/* Study Time */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-500 text-sm font-medium">Study Time</div>
                <div className="text-2xl">⏱️</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {dashboardData.study_time.total_minutes} min
              </div>
              <div className="text-sm text-gray-500 mt-2">
                {dashboardData.study_time.daily_avg} min/day avg
              </div>
            </div>

            {/* Engagement */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-500 text-sm font-medium">Avg Engagement</div>
                <div className="text-2xl">🎯</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {dashboardData.engagement.avg_engagement.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Out of 100
              </div>
            </div>

            {/* Highlights */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-500 text-sm font-medium">Activity</div>
                <div className="text-2xl">✨</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {dashboardData.activity.highlights + dashboardData.activity.annotations}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                {dashboardData.activity.highlights} highlights, {dashboardData.activity.annotations} notes
              </div>
            </div>
          </div>

          {/* Engagement Trend Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Trend</h3>
            <div className="h-80">
              {getEngagementTrendChart() && (
                <Line data={getEngagementTrendChart()} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Top Materials */}
          {dashboardData.top_materials && dashboardData.top_materials.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Studied Materials</h3>
              <div className="space-y-4">
                {dashboardData.top_materials.map((material, index) => (
                  <div key={material.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                      <div>
                        <div className="font-medium text-gray-900">{material.title}</div>
                        <div className="text-sm text-gray-500">
                          {material.sessions} sessions · {material.total_time} minutes
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Avg per session</div>
                      <div className="font-semibold text-gray-900">
                        {Math.round(material.total_time / material.sessions)} min
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Engagement Tab */}
      {activeTab === 'engagement' && engagementAnalysis && (
        <div className="space-y-6">
          {/* Engagement Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Distribution</h3>
              <div className="h-80">
                {getEngagementDistributionChart() && (
                  <Doughnut data={getEngagementDistributionChart()} options={doughnutOptions} />
                )}
              </div>
            </div>

            {/* Emotion Distribution */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotion Distribution</h3>
              <div className="h-80">
                {getEmotionDistributionChart() && (
                  <Pie data={getEmotionDistributionChart()} options={doughnutOptions} />
                )}
              </div>
            </div>
          </div>

          {/* Posture & Engagement Correlation */}
          {engagementAnalysis.posture_engagement_correlation && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Posture Impact on Engagement
              </h3>
              <div className="space-y-3">
                {engagementAnalysis.posture_engagement_correlation.map((item) => (
                  <div key={item.posture_range} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{item.posture_range}</div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-500">{item.count} datapoints</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {item.avg_engagement} avg engagement
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peak Performance Times */}
          {engagementAnalysis.peak_performance_times && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🏆 Peak Performance Times
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {engagementAnalysis.peak_performance_times.map((time, index) => (
                  <div key={time.hour} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-200">
                    <div className="text-sm text-gray-600 mb-1">#{index + 1} Best Time</div>
                    <div className="text-xl font-bold text-gray-900">{time.time_label}</div>
                    <div className="text-sm text-gray-600 mt-2">
                      Engagement: {time.avg_engagement}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Study Patterns Tab */}
      {activeTab === 'patterns' && studyPatterns && (
        <div className="space-y-6">
          {/* Study Streak */}
          {studyPatterns.streaks && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-8 text-white shadow-lg">
                <h3 className="text-lg font-semibold mb-4 opacity-90">Current Streak</h3>
                <div className="text-6xl font-bold mb-2">🔥 {studyPatterns.streaks.current}</div>
                <div className="text-xl">
                  {studyPatterns.streaks.current === 1 ? 'day' : 'days'} in a row!
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-8 text-white shadow-lg">
                <h3 className="text-lg font-semibold mb-4 opacity-90">Longest Streak</h3>
                <div className="text-6xl font-bold mb-2">🏆 {studyPatterns.streaks.longest}</div>
                <div className="text-xl">
                  {studyPatterns.streaks.longest === 1 ? 'day' : 'days'} record
                </div>
              </div>
            </div>
          )}

          {/* Study Time by Day of Week */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Time by Day of Week</h3>
            <div className="h-80">
              {getStudyTimeByDayChart() && (
                <Bar data={getStudyTimeByDayChart()} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Study Time by Hour */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Sessions by Hour of Day</h3>
            <div className="h-80">
              {getStudyTimeByHourChart() && (
                <Bar data={getStudyTimeByHourChart()} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Session Length Trend */}
          {studyPatterns.session_length_trend && studyPatterns.session_length_trend.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Session Length Over Time</h3>
              <div className="h-80">
                <Line
                  data={{
                    labels: studyPatterns.session_length_trend.map(s => 
                      new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    ),
                    datasets: [{
                      label: 'Avg Session Length (minutes)',
                      data: studyPatterns.session_length_trend.map(s => s.avg_length),
                      borderColor: 'rgb(139, 92, 246)',
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      fill: true,
                      tension: 0.4
                    }]
                  }}
                  options={chartOptions}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Health Tab */}
      {activeTab === 'health' && healthReport && (
        <div className="space-y-6">
          {/* Overall Health Score */}
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-8 text-white shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Overall Health Score</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">{healthReport.overall_health_score}</div>
                <div className="text-blue-100">Overall</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">{healthReport.scores.eye_health}</div>
                <div className="text-blue-100">Eye Health</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">{healthReport.scores.posture_health}</div>
                <div className="text-blue-100">Posture</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">{healthReport.scores.fatigue}</div>
                <div className="text-blue-100">Energy Level</div>
              </div>
            </div>
          </div>

          {/* Health Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👁️ Eye Health</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Average Blink Rate</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {healthReport.metrics.avg_blink_rate} /min
                  </div>
                  <div className="text-xs text-gray-500">(Healthy: 15-20/min)</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Low Blink Rate Sessions</div>
                  <div className="text-xl font-semibold text-orange-600">
                    {healthReport.metrics.low_blink_rate_percentage}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Eye Strain Alerts</div>
                  <div className="text-xl font-semibold text-red-600">
                    {healthReport.metrics.eye_strain_alerts}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🪑 Posture</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Average Posture Score</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {healthReport.metrics.avg_posture}/100
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Poor Posture Sessions</div>
                  <div className="text-xl font-semibold text-orange-600">
                    {healthReport.metrics.poor_posture_percentage}%
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">😴 Fatigue</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Average Fatigue Level</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {healthReport.metrics.avg_fatigue}/100
                  </div>
                </div>
                <div className={`text-sm ${
                  healthReport.metrics.avg_fatigue < 30 ? 'text-green-600' :
                  healthReport.metrics.avg_fatigue < 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {healthReport.metrics.avg_fatigue < 30 ? '✓ Low fatigue' :
                   healthReport.metrics.avg_fatigue < 60 ? '⚠ Moderate fatigue' :
                   '⚠ High fatigue'}
                </div>
              </div>
            </div>
          </div>

          {/* Health Trend */}
          {healthReport.trend && healthReport.trend.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Trend Over Time</h3>
              <div className="h-80">
                <Line
                  data={{
                    labels: healthReport.trend.map(t => 
                      new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    ),
                    datasets: [
                      {label: 'Blink Rate',
                        data: healthReport.trend.map(t => t.blink_rate),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4
                      },
                      {
                        label: 'Posture',
                        data: healthReport.trend.map(t => t.posture),
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                      },
                      {
                        label: 'Fatigue',
                        data: healthReport.trend.map(t => t.fatigue),
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                      }
                    ]
                  }}
                  options={{
                    ...chartOptions,
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                          display: true,
                          text: 'Blink Rate (per min)'
                        }
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                          display: true,
                          text: 'Score (0-100)'
                        },
                        grid: {
                          drawOnChartArea: false,
                        },
                      },
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Recommendations */}
          {healthReport.recommendations && healthReport.recommendations.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Health Recommendations</h3>
              <div className="space-y-3">
                {healthReport.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      rec.severity === 'high'
                        ? 'bg-red-50 border-red-500'
                        : rec.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {rec.category === 'eye_health' ? '👁️' :
                         rec.category === 'posture' ? '🪑' :
                         rec.category === 'fatigue' ? '😴' :
                         rec.category === 'break' ? '☕' : '💡'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold uppercase ${
                            rec.severity === 'high'
                              ? 'text-red-600'
                              : rec.severity === 'medium'
                              ? 'text-yellow-600'
                              : 'text-blue-600'
                          }`}>
                            {rec.severity} priority
                          </span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-gray-500 capitalize">{rec.category.replace('_', ' ')}</span>
                        </div>
                        <p className="text-gray-700">{rec.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posture Quality Chart */}
          {trends && trends.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Posture Quality Over Time</h3>
              <div className="h-80">
                {getPostureChart() && (
                  <Bar data={getPostureChart()} options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        display: false
                      }
                    }
                  }} />
                )}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-600">Good (75+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-sm text-gray-600">Fair (50-75)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm text-gray-600">Poor (&lt;50)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem('token');
              const response = await axios.post(
                `${API_URL}/api/analytics/export`,
                { period, format: 'json' },
                {
                  headers: { Authorization: `Bearer ${token}` },
                  responseType: 'blob'
                }
              );

              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `analytics_report_${Date.now()}.json`);
              document.body.appendChild(link);
              link.click();
              link.remove();
            } catch (error) {
              console.error('Error exporting analytics:', error);
              alert('Failed to export analytics');
            }
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          📥 Export Report
        </button>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;