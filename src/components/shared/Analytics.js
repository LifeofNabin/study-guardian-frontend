// FILE: frontend/src/components/shared/Analytics.js
// ✅ FINAL VERSION: Includes all features plus the new Custom Date Range selector.

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
import { Line, Bar } from 'react-chartjs-2';
import { 
  TrendingUp, Clock, BookOpen, Target, Zap, 
  AlertCircle, Download, ArrowLeft 
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// Helper function to format dates correctly for HTML date input fields
const toInputDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


const Analytics = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for managing the selected date range option
  const [period, setPeriod] = useState('30');
  
  // State for the custom date pickers
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return toInputDate(date);
  });
  const [customEndDate, setCustomEndDate] = useState(toInputDate(new Date()));

  // This state is the single source of truth that triggers the data fetch
  const [activeQuery, setActiveQuery] = useState({ period: '30' });

  // State for all analytics data
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [studyPatterns, setStudyPatterns] = useState(null);
  const [engagementAnalysis, setEngagementAnalysis] = useState(null);
  const [healthReport, setHealthReport] = useState(null);
  const [productivityScore, setProductivityScore] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Re-fetch data whenever the activeQuery changes
  useEffect(() => {
    fetchAnalytics();
  }, [activeQuery]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build parameters for the API call based on the active query
      const params = activeQuery.period === 'custom'
        ? { startDate: activeQuery.startDate, endDate: activeQuery.endDate }
        : { period: activeQuery.period };

      const [
        overviewRes, trendsRes, patternsRes, engagementRes, healthRes, productivityRes
      ] = await Promise.all([
        analyticsAPI.getOverallAnalytics(params),
        analyticsAPI.getTrends(params),
        analyticsAPI.getStudyPatterns(params),
        analyticsAPI.getEngagementAnalysis(params),
        analyticsAPI.getHealthReport(params),
        analyticsAPI.getProductivityScore({ period: '7' }) // Productivity score is kept to last 7 days for consistency
      ]);

      setOverview(overviewRes.data);
      setTrends(trendsRes.data?.data);
      setStudyPatterns(patternsRes.data?.data);
      setEngagementAnalysis(engagementRes.data?.data);
      setHealthReport(healthRes.data?.data);
      setProductivityScore(productivityRes.data?.data);

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };
  
  // Handler for changing the dropdown selection
  const handlePeriodChange = (e) => {
    const newPeriod = e.target.value;
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setActiveQuery({ period: newPeriod });
    }
  };
  
  // Handler for the "Apply" button for custom dates
  const handleApplyCustomDate = () => {
    setActiveQuery({
      period: 'custom',
      startDate: customStartDate,
      endDate: customEndDate
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: { y: { beginAtZero: true } }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchAnalytics} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors">
                <ArrowLeft className="h-6 w-6 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Comprehensive study performance insights</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={period} 
              onChange={handlePeriodChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {period === 'custom' && (
              <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-300">
                <input 
                  type="date" 
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 border-none rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-500 text-sm">-</span>
                <input 
                  type="date" 
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 border-none rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                />
                <button 
                  onClick={handleApplyCustomDate}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold"
                >
                  Apply
                </button>
              </div>
            )}
            
            <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-2">
          <div className="flex space-x-2">
            {['overview', 'trends', 'engagement', 'patterns', 'health'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab Content */}
        {activeTab === 'overview' && overview && (
           <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-8 w-8 opacity-80" />
                  <span className="text-sm opacity-80">Study Time</span>
                </div>
                <p className="text-3xl font-bold">{overview.totalHours}h</p>
                <p className="text-sm opacity-80 mt-1">+{overview.thisWeek}h this week</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-8 w-8 opacity-80" />
                  <span className="text-sm opacity-80">Engagement</span>
                </div>
                <p className="text-3xl font-bold">{overview.avgEngagement}%</p>
                <p className="text-sm opacity-80 mt-1">Above average!</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <BookOpen className="h-8 w-8 opacity-80" />
                  <span className="text-sm opacity-80">Sessions</span>
                </div>
                <p className="text-3xl font-bold">{overview.completedSessions}</p>
                <p className="text-sm opacity-80 mt-1">{overview.streak} day streak</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-8 w-8 opacity-80" />
                  <span className="text-sm opacity-80">Grade</span>
                </div>
                <p className="text-3xl font-bold">{productivityScore?.grade || 'N/A'}</p>
                <p className="text-sm opacity-80 mt-1">Productivity score</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                Performance Summary
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
                <p>🎯 <strong>Excellent work!</strong> Your average engagement rate is <strong>{overview.avgEngagement}%</strong>, showing consistent focus.</p>
                <p>📚 You've completed <strong>{overview.completedSessions} study sessions</strong> totaling <strong>{overview.totalHours} hours</strong>.</p>
                <p>🔥 You're on a <strong>{overview.streak}-day study streak</strong> - keep it up!</p>
                {productivityScore && (
                  <p>🏆 Your productivity score is <strong>{productivityScore.overall_score}/100 ({productivityScore.grade})</strong>.</p>
                )}
              </div>
            </div>

            {productivityScore && productivityScore.components && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Productivity Components</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(productivityScore.components).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1 capitalize">{key.replace(/_/g, ' ')}</div>
                      <div className="text-2xl font-bold text-gray-900">{value}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div className={`h-2 rounded-full ${value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trends Tab Content */}
        {activeTab === 'trends' && trends && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Engagement & Attention Trends</h2>
              <div className="h-96">
                <Line
                  data={{
                    labels: trends.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                    datasets: [
                      {
                        label: 'Engagement %',
                        data: trends.map(t => t.avg_engagement),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                      },
                      {
                        label: 'Attention %',
                        data: trends.map(t => t.avg_attention),
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                      }
                    ]
                  }}
                  options={chartOptions}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Posture Quality Over Time</h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: trends.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                    datasets: [{
                      label: 'Posture Score',
                      data: trends.map(t => t.avg_posture),
                      backgroundColor: trends.map(t => 
                        t.avg_posture >= 75 ? 'rgba(16, 185, 129, 0.6)' :
                        t.avg_posture >= 50 ? 'rgba(251, 191, 36, 0.6)' :
                        'rgba(239, 68, 68, 0.6)'
                      )
                    }]
                  }}
                  options={chartOptions}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;