// FILE: frontend/src/components/teacher/ComprehensiveStudentReport.js
// ✅ ENHANCED VERSION - Shows detailed metrics and session history with database metrics

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Download, Eye, Smartphone, Clock, 
  BookOpen, Highlighter, FileText, TrendingUp, Activity, Target,
  CheckCircle, Zap, Scroll, CheckSquare, Calendar, Users, BarChart,
  PieChart, LineChart as LineChartIcon, Thermometer, Brain, Award,
  Percent, Target as TargetIcon, Clock as ClockIcon, Book, Star,
  ChevronDown, ChevronUp, Filter, Search, SortAsc, SortDesc
} from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { sessionsAPI, metricsAPI } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const ComprehensiveStudentReport = ({ student, room, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [metricsData, setMetricsData] = useState([]); // ✅ Store metrics separately

  useEffect(() => {
    fetchCompleteReport();
  }, [student.id, room._id]);

  const fetchCompleteReport = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching comprehensive report for:', student.name);
      console.log('📊 Student ID:', student.id);
      console.log('📊 Room ID:', room._id);
      
      // 1. Fetch all sessions for this student and room
      const sessionsResponse = await sessionsAPI.getRecent();
      console.log('📊 All sessions response:', sessionsResponse);
      
      let allSessions = [];
      if (Array.isArray(sessionsResponse.data)) {
        allSessions = sessionsResponse.data;
      } else if (sessionsResponse.data && Array.isArray(sessionsResponse.data.sessions)) {
        allSessions = sessionsResponse.data.sessions;
      } else if (Array.isArray(sessionsResponse.sessions)) {
        allSessions = sessionsResponse.sessions;
      }
      
      console.log('📊 Total sessions found:', allSessions.length);
      
      // Filter sessions for this specific student and room
      const studentSessions = allSessions.filter(s => {
        if (!s) return false;
        
        const studentIdStr = s.student_id?._id?.toString() || s.student_id?.toString();
        const roomIdStr = s.room_id?._id?.toString() || s.room_id?.toString();
        
        const studentMatch = studentIdStr === student.id?.toString();
        const roomMatch = roomIdStr === room._id?.toString();
        
        return studentMatch && roomMatch;
      });

      console.log(`✅ Found ${studentSessions.length} sessions for student ${student.name}`);
      
      if (studentSessions.length === 0) {
        setReportData({ hasData: false, sessions: [] });
        setLoading(false);
        return;
      }

      // 2. ✅ NEW: Fetch metrics for all sessions
      const allMetrics = [];
      for (const session of studentSessions) {
        try {
          const metricsResponse = await metricsAPI.getBySession(session._id);
          if (metricsResponse.data && metricsResponse.data.data) {
            const sessionMetrics = Array.isArray(metricsResponse.data.data) 
              ? metricsResponse.data.data 
              : [metricsResponse.data.data];
            allMetrics.push(...sessionMetrics);
          }
        } catch (error) {
          console.warn(`⚠️ No metrics for session ${session._id}:`, error.message);
        }
      }
      
      console.log(`📊 Found ${allMetrics.length} metrics from database`);
      setMetricsData(allMetrics);

      // 3. Calculate metrics using BOTH session data and metrics collection
      const webcamMetrics = calculateWebcamMetrics(studentSessions, allMetrics);
      const pdfMetrics = calculatePDFMetrics(studentSessions);
      const keywords = extractKeywords(studentSessions);
      const sessionHistory = processSessionHistory(studentSessions, allMetrics);
      const overallStats = calculateOverallStats(studentSessions, allMetrics);
      const timeAnalysis = calculateTimeAnalysis(studentSessions, allMetrics);

      setReportData({
        hasData: true,
        totalSessions: studentSessions.length,
        totalMetrics: allMetrics.length,
        webcamMetrics,
        pdfMetrics,
        keywords,
        sessionHistory,
        overallStats,
        timeAnalysis,
        sessions: studentSessions,
        metrics: allMetrics,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error fetching report:', error);
      setReportData({ 
        hasData: false, 
        error: error.message,
        sessions: [] 
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateWebcamMetrics = (sessions, metrics = []) => {
    console.log('📊 Calculating webcam metrics from:', {
      sessions: sessions.length,
      metrics: metrics.length,
      sampleMetric: metrics[0]
    });

    // If we have metrics from Metric collection, use those (preferred)
    if (metrics.length > 0) {
      let totalBlinks = 0;
      let totalPhoneDetections = 0;
      let totalPostureScore = 0;
      let postureCount = 0;
      let attentionScores = [];
      let focusScores = [];
      let presenceCount = 0;

      metrics.forEach(metric => {
        // Blink rate
        totalBlinks += metric.facial?.blink_rate || 0;

        // Phone detections
        if (metric.distraction?.phone_detected) {
          totalPhoneDetections++;
        }

        // Posture score
        if (metric.posture?.score) {
          totalPostureScore += metric.posture.score;
          postureCount++;
        }

        // Engagement scores
        if (metric.engagement_score) {
          const session = sessions.find(s => s._id === metric.session_id);
          const date = session?.start_time || metric.timestamp || new Date();
          attentionScores.push({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: metric.engagement_score
          });
        }

        // Focus scores
        if (metric.distraction?.attention_score) {
          const session = sessions.find(s => s._id === metric.session_id);
          const date = session?.start_time || metric.timestamp || new Date();
          focusScores.push({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: metric.distraction.attention_score
          });
        }

        // Presence
        if (metric.presence?.detected) {
          presenceCount++;
        }
      });

      const avgPostureScore = postureCount > 0 ? Math.round(totalPostureScore / postureCount) : 0;
      const presenceRate = metrics.length > 0 ? Math.round((presenceCount / metrics.length) * 100) : 0;
      const avgBlinkRate = metrics.length > 0 ? (totalBlinks / metrics.length).toFixed(1) : 0;

      return {
        totalBlinks,
        avgBlinkRate,
        totalPhoneDetections,
        totalAbsentTime: Math.round(metrics.length > 0 ? (metrics.length - presenceCount) * 3 : 0), // Estimate
        totalPresentTime: Math.round(presenceCount * 3), // 3 seconds per metric
        avgPostureScore,
        avgFocusScore: focusScores.length > 0
          ? Math.round(focusScores.reduce((sum, item) => sum + item.score, 0) / focusScores.length)
          : 0,
        attentionScores: attentionScores.slice(-10),
        focusScores: focusScores.slice(-10),
        presenceRate,
        hasMetricsData: true,
        metricsSource: 'database'
      };
    }

    // Fallback to session data only
    console.log('⚠️ No metrics found in database, using session data only');

    let totalBlinks = 0;
    let totalPhoneDetections = 0;
    let totalAbsentTime = 0;
    let totalPresentTime = 0;
    let totalPostureScore = 0;
    let postureCount = 0;
    let attentionScores = [];
    let focusScores = [];

    sessions.forEach(session => {
      const metrics = session.metrics || {};
      totalBlinks += metrics.total_blinks || metrics.eye_blinks || 0;
      totalPhoneDetections += metrics.phone_detections || 0;
      totalAbsentTime += metrics.absent_time || 0;
      totalPresentTime += metrics.present_time || 0;

      if (metrics.posture_score) {
        totalPostureScore += metrics.posture_score;
        postureCount++;
      }
      if (session.engagement_score) {
        attentionScores.push({
          date: new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          score: session.engagement_score
        });
      }
      if (metrics.focus_score) {
        focusScores.push({
          date: new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          score: metrics.focus_score
        });
      }
    });

    const avgPostureScore = postureCount > 0 ? Math.round(totalPostureScore / postureCount) : 0;
    const avgFocusScore = focusScores.length > 0
      ? Math.round(focusScores.reduce((sum, item) => sum + item.score, 0) / focusScores.length)
      : 0;
    const presenceRate = totalPresentTime + totalAbsentTime > 0
      ? Math.round((totalPresentTime / (totalPresentTime + totalAbsentTime)) * 100)
      : (sessions.length > 0 ? 100 : 0);

    return {
      totalBlinks,
      avgBlinkRate: sessions.length > 0 ? (totalBlinks / sessions.length).toFixed(1) : 0,
      totalPhoneDetections,
      totalAbsentTime: Math.round(totalAbsentTime / 60),
      totalPresentTime: Math.round(totalPresentTime / 60),
      avgPostureScore,
      avgFocusScore,
      attentionScores: attentionScores.slice(-10),
      focusScores: focusScores.slice(-10),
      presenceRate,
      hasMetricsData: sessions.some(s => s.metrics && Object.keys(s.metrics).length > 0),
      metricsSource: 'session_data'
    };
  };

  const calculatePDFMetrics = (sessions) => {
    let totalPages = 0;
    let totalHighlights = 0;
    let totalAnnotations = 0;
    let totalScrolls = 0;
    let uniquePages = new Set();
    let timePerPage = {};
    let pageVisits = {};

    sessions.forEach(session => {
      const interactions = session.interactions || [];
      
      interactions.forEach(interaction => {
        if (interaction.type === 'page_turn' || interaction.type === 'page_change') {
          totalPages++;
          if (interaction.data?.page) {
            const page = parseInt(interaction.data.page);
            uniquePages.add(page);
            pageVisits[page] = (pageVisits[page] || 0) + 1;
          }
        }
        
        if (interaction.type === 'highlight' || interaction.type === 'highlighter') {
          totalHighlights++;
        }
        
        if (interaction.type === 'annotation' || interaction.type === 'note') {
          totalAnnotations++;
        }
        
        if (interaction.type === 'scroll') {
          totalScrolls++;
        }

        if (interaction.data?.page && interaction.data?.duration) {
          const page = interaction.data.page;
          timePerPage[page] = (timePerPage[page] || 0) + interaction.data.duration;
        }
      });
    });

    const avgTimePerPage = Object.values(timePerPage).length > 0
      ? Math.round(Object.values(timePerPage).reduce((a, b) => a + b, 0) / Object.values(timePerPage).length)
      : 0;

    const completionRate = uniquePages.size > 0 && totalPages > 0
      ? Math.round((uniquePages.size / totalPages) * 100)
      : 0;

    const mostVisitedPage = Object.entries(pageVisits).sort((a, b) => b[1] - a[1])[0];

    return {
      pagesVisited: uniquePages.size,
      totalPageTurns: totalPages,
      highlightsMade: totalHighlights,
      annotationsCreated: totalAnnotations,
      totalScrolls,
      avgTimePerPage,
      completionRate,
      mostVisitedPage: mostVisitedPage ? `Page ${mostVisitedPage[0]} (${mostVisitedPage[1]} visits)` : 'N/A',
      engagementLevel: totalHighlights + totalAnnotations > 20 ? 'High' : 
                       totalHighlights + totalAnnotations > 10 ? 'Medium' : 'Low',
      readingSpeed: uniquePages.size > 0 ? 
        Math.round(totalPages / (uniquePages.size * 60)) : 0 // pages per minute
    };
  };

  const calculateOverallStats = (sessions, metrics = []) => {
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const completedSessions = sessions.filter(s => !s.is_active);

    // Calculate from metrics if available (preferred)
    let avgEngagement = 0;
    let bestSessionScore = 0;
    let bestSessionDate = 'N/A';
    let consistencyScore = 0;

    if (metrics.length > 0) {
      avgEngagement = metrics.reduce((sum, m) => sum + (m.engagement_score || 0), 0) / metrics.length;

      // Find session with highest average engagement
      const sessionEngagements = {};
      metrics.forEach(m => {
        if (!sessionEngagements[m.session_id]) {
          sessionEngagements[m.session_id] = { sum: 0, count: 0 };
        }
        sessionEngagements[m.session_id].sum += m.engagement_score || 0;
        sessionEngagements[m.session_id].count++;
      });

      let bestSessionId = null;
      let bestAvg = 0;

      Object.entries(sessionEngagements).forEach(([sessionId, data]) => {
        const avg = data.sum / data.count;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestSessionId = sessionId;
        }
      });

      if (bestSessionId) {
        bestSessionScore = Math.round(bestAvg);
        const bestSession = sessions.find(s => s._id === bestSessionId);
        bestSessionDate = bestSession ? new Date(bestSession.start_time).toLocaleDateString() : 'N/A';
      }

      // Consistency score (lower variance = higher consistency)
      const engagementScores = metrics.map(m => m.engagement_score || 0);
      const avgScore = engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length;
      const variance = engagementScores.reduce((a, b) => a + Math.pow(b - avgScore, 2), 0) / engagementScores.length;
      consistencyScore = Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / avgScore * 100)));

    } else {
      // Fallback to session data only
      avgEngagement = completedSessions.length > 0 ?
        completedSessions.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / completedSessions.length : 0;

      const bestSession = completedSessions.reduce((best, current) => {
        if (!best) return current;
        return (current.engagement_score || 0) > (best.engagement_score || 0) ? current : best;
      }, null);

      bestSessionScore = bestSession ? Math.round(bestSession.engagement_score || 0) : 0;
      bestSessionDate = bestSession ? new Date(bestSession.start_time).toLocaleDateString() : 'N/A';
    }

    const avgSessionDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;

    return {
      totalStudyTime: Math.round(totalDuration / 3600 * 10) / 10, // hours
      avgEngagement: Math.round(avgEngagement),
      avgSessionDuration: Math.round(avgSessionDuration / 60), // minutes
      bestSessionScore,
      bestSessionDate,
      consistencyScore: Math.round(consistencyScore),
      sessionsPerWeek: calculateSessionsPerWeek(sessions),
      metricsCount: metrics.length
    };
  };

  const calculateTimeAnalysis = (sessions, metrics = []) => {
    const sessionsByHour = Array(24).fill(0);
    const sessionsByDay = Array(7).fill(0);
    const dailyAverages = {};

    sessions.forEach(session => {
      const date = new Date(session.start_time);
      const hour = date.getHours();
      const day = date.getDay();

      sessionsByHour[hour]++;
      sessionsByDay[day]++;

      const dateKey = date.toISOString().split('T')[0];
      if (!dailyAverages[dateKey]) {
        dailyAverages[dateKey] = { engagement: 0, count: 0 };
      }
      dailyAverages[dateKey].engagement += session.engagement_score || 0;
      dailyAverages[dateKey].count++;
    });

    // Calculate average engagement per day
    const dailyEngagement = Object.entries(dailyAverages).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      engagement: Math.round(data.engagement / data.count)
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      peakStudyHour: sessionsByHour.indexOf(Math.max(...sessionsByHour)),
      mostActiveDay: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][sessionsByDay.indexOf(Math.max(...sessionsByDay))],
      sessionsByHour,
      sessionsByDay,
      dailyEngagement: dailyEngagement.slice(-14) // Last 14 days
    };
  };

  const calculateConsistency = (scores) => {
    if (scores.length < 2) return 100;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
    return Math.round(100 - (Math.sqrt(variance) / avg * 100));
  };

  const calculateSessionsPerWeek = (sessions) => {
    if (sessions.length === 0) return 0;
    const firstSession = new Date(Math.min(...sessions.map(s => new Date(s.start_time).getTime())));
    const lastSession = new Date(Math.max(...sessions.map(s => new Date(s.start_time).getTime())));
    const weeks = Math.max(1, (lastSession - firstSession) / (1000 * 60 * 60 * 24 * 7));
    return Math.round(sessions.length / weeks * 10) / 10;
  };

  const extractKeywords = (sessions) => {
    const keywordCount = {};

    sessions.forEach(session => {
      const interactions = session.interactions || [];

      interactions.forEach(interaction => {
        if ((interaction.type === 'highlight' || interaction.type === 'highlighter') && interaction.data?.text) {
          const words = interaction.data.text
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !['that', 'this', 'with', 'from', 'have', 'were'].includes(word));

          words.forEach(word => {
            keywordCount[word] = (keywordCount[word] || 0) + 1;
          });
        }
      });
    });

    return Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([keyword, count]) => ({ keyword, count }));
  };

  const processSessionHistory = (sessions, metrics = []) => {
    return sessions.map(session => {
      const duration = session.duration_seconds || 0;
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);

      // Get session metrics
      const sessionMetrics = metrics.filter(m => m.session_id === session._id);

      // Calculate averages from metrics if available
      let avgEngagement = session.engagement_score || 0;
      let avgPosture = 0;
      let avgFocus = 0;
      let distractions = 0;

      if (sessionMetrics.length > 0) {
        avgEngagement = sessionMetrics.reduce((sum, m) => sum + (m.engagement_score || 0), 0) / sessionMetrics.length;
        avgPosture = sessionMetrics.reduce((sum, m) => sum + (m.posture?.score || 0), 0) / sessionMetrics.length;
        avgFocus = sessionMetrics.reduce((sum, m) => sum + (m.distraction?.attention_score || 0), 0) / sessionMetrics.length;
        distractions = sessionMetrics.filter(m => m.distraction?.detected).length;
      }

      // Calculate interaction counts
      const interactions = session.interactions || [];
      const highlights = interactions.filter(i => i.type === 'highlight' || i.type === 'highlighter').length;
      const annotations = interactions.filter(i => i.type === 'annotation' || i.type === 'note').length;
      const pageTurns = interactions.filter(i => i.type === 'page_turn' || i.type === 'page_change').length;

      return {
        id: session._id,
        date: new Date(session.start_time).toLocaleDateString(),
        startTime: new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTime: session.end_time ? new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active',
        duration: `${hours}h ${minutes}m`,
        durationMinutes: Math.round(duration / 60),
        engagement: Math.round(avgEngagement),
        posture: Math.round(avgPosture),
        focus: Math.round(avgFocus),
        highlights,
        annotations,
        pageTurns,
        distractions,
        status: session.is_active ? 'Active' : 'Completed',
        pdfName: session.pdf_name || 'Document',
        metricsCount: sessionMetrics.length
      };
    }).sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'asc'
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'duration') {
        return sortOrder === 'asc'
          ? a.durationMinutes - b.durationMinutes
          : b.durationMinutes - a.durationMinutes;
      } else if (sortBy === 'engagement') {
        return sortOrder === 'asc'
          ? a.engagement - b.engagement
          : b.engagement - a.engagement;
      }
      return 0;
    }).filter(session => {
      if (sessionFilter === 'active') return session.status === 'Active';
      if (sessionFilter === 'completed') return session.status === 'Completed';
      return true;
    });
  };

  const exportReport = () => {
    if (!reportData?.hasData) return;

    let csv = 'Student Performance Detailed Report\n\n';
    csv += `Student: ${student.name}\n`;
    csv += `Email: ${student.email}\n`;
    csv += `Room: ${room.title}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    csv += 'OVERALL STATISTICS\n';
    csv += `Total Sessions,${reportData.totalSessions}\n`;
    csv += `Total Study Time,${reportData.overallStats.totalStudyTime} hours\n`;
    csv += `Average Engagement,${reportData.overallStats.avgEngagement}%\n`;
    csv += `Average Session Duration,${reportData.overallStats.avgSessionDuration} minutes\n`;
    csv += `Consistency Score,${reportData.overallStats.consistencyScore}%\n\n`;

    csv += 'WEBCAM METRICS\n';
    csv += `Total Blinks,${reportData.webcamMetrics.totalBlinks}\n`;
    csv += `Phone Detections,${reportData.webcamMetrics.totalPhoneDetections}\n`;
    csv += `Presence Rate,${reportData.webcamMetrics.presenceRate}%\n`;
    csv += `Average Posture Score,${reportData.webcamMetrics.avgPostureScore}%\n`;
    csv += `Average Focus Score,${reportData.webcamMetrics.avgFocusScore}%\n\n`;

    csv += 'PDF INTERACTION METRICS\n';
    csv += `Pages Visited,${reportData.pdfMetrics.pagesVisited}\n`;
    csv += `Highlights Made,${reportData.pdfMetrics.highlightsMade}\n`;
    csv += `Annotations Created,${reportData.pdfMetrics.annotationsCreated}\n`;
    csv += `Page Turns,${reportData.pdfMetrics.totalPageTurns}\n`;
    csv += `Completion Rate,${reportData.pdfMetrics.completionRate}%\n\n`;

    csv += 'SESSION HISTORY\n';
    csv += 'Date,Start Time,End Time,Duration,Engagement,Posture,Focus,Highlights,Annotations,Page Turns,Distractions,Status,PDF\n';
    reportData.sessionHistory.forEach(s => {
      csv += `${s.date},${s.startTime},${s.endTime},${s.duration},${s.engagement}%,${s.posture}%,${s.focus}%,${s.highlights},${s.annotations},${s.pageTurns},${s.distractions},${s.status},${s.pdfName}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${student.name}_Detailed_Report_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading detailed student report...</p>
        </div>
      </div>
    );
  }

  if (!reportData?.hasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-800 mb-6">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back to Room
          </button>
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <FileText className="h-32 w-32 text-gray-300 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">No Activity Data</h2>
            <p className="text-gray-600 text-lg">{student.name} hasn't completed any sessions in this room yet.</p>
            <p className="text-gray-500 mt-2">Total sessions in system: {reportData?.sessions?.length || 0}</p>
          </div>
        </div>
      </div>
    );
  }

  const { webcamMetrics, pdfMetrics, keywords, sessionHistory, overallStats, timeAnalysis } = reportData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-800 transition">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back to Room
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Student Performance Report</h1>
            <p className="text-gray-600">{room.title}</p>
          </div>
          <button 
            onClick={exportReport}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-lg font-semibold transition-all"
          >
            <Download className="h-5 w-5 mr-2" /> Export Report
          </button>
        </div>

        {/* Student Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-4xl shadow-lg">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">{student.name}</h1>
                <p className="text-indigo-100 text-lg">{student.email}</p>
                <p className="text-indigo-200 mt-1">Room: {room.title} • Code: {room.code}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{reportData.totalSessions} Sessions</div>
              <div className="text-indigo-200">{overallStats.totalStudyTime} Total Hours</div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <ClockIcon className="h-8 w-8 text-blue-500" />
              <span className="text-2xl font-bold text-gray-800">{overallStats.totalStudyTime}h</span>
            </div>
            <p className="text-sm text-gray-600">Total Study Time</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-3">
              <Percent className="h-8 w-8 text-green-500" />
              <span className="text-2xl font-bold text-gray-800">{overallStats.avgEngagement}%</span>
            </div>
            <p className="text-sm text-gray-600">Avg Engagement</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-3">
              <TargetIcon className="h-8 w-8 text-purple-500" />
              <span className="text-2xl font-bold text-gray-800">{overallStats.consistencyScore}%</span>
            </div>
            <p className="text-sm text-gray-600">Consistency</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-3">
              <BookOpen className="h-8 w-8 text-orange-500" />
              <span className="text-2xl font-bold text-gray-800">{pdfMetrics.pagesVisited}</span>
            </div>
            <p className="text-sm text-gray-600">Pages Studied</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart },
              { id: 'sessions', label: 'Session History', icon: Calendar },
              { id: 'metrics', label: 'Webcam Metrics', icon: Eye },
              { id: 'pdf', label: 'PDF Analytics', icon: Book },
              { id: 'keywords', label: 'Keywords', icon: Highlighter },
              { id: 'time', label: 'Time Analysis', icon: Clock }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center px-6 py-4 font-semibold transition ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-4 border-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Performance Overview</h2>
                
                {/* Engagement Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Engagement Trend</h3>
                    <Line
                      data={{
                        labels: webcamMetrics.attentionScores.map(a => a.date),
                        datasets: [{
                          label: 'Engagement %',
                          data: webcamMetrics.attentionScores.map(a => a.score),
                          borderColor: 'rgb(79, 70, 229)',
                          backgroundColor: 'rgba(79, 70, 229, 0.1)',
                          tension: 0.4,
                          fill: true
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: { 
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => `Engagement: ${context.parsed.y}%`
                            }
                          }
                        },
                        scales: { 
                          y: { 
                            beginAtZero: true, 
                            max: 100,
                            ticks: { callback: value => `${value}%` }
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Study Time Distribution</h3>
                    <Doughnut
                      data={{
                        labels: ['Active Time', 'Distracted Time'],
                        datasets: [{
                          data: [webcamMetrics.totalPresentTime, webcamMetrics.totalAbsentTime],
                          backgroundColor: ['#10b981', '#ef4444'],
                          borderWidth: 2,
                          borderColor: '#ffffff'
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: { 
                          legend: { position: 'bottom' },
                          tooltip: {
                            callbacks: {
                              label: (context) => `${context.label}: ${context.parsed} minutes`
                            }
                          }
                        }
                      }}
                    />
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600">
                        Active: <span className="font-bold">{webcamMetrics.totalPresentTime} min</span> • 
                        Distracted: <span className="font-bold">{webcamMetrics.totalAbsentTime} min</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                    <Brain className="h-10 w-10 text-blue-600 mb-3" />
                    <p className="text-sm text-gray-600">Best Session</p>
                    <p className="text-3xl font-bold text-blue-900">{overallStats.bestSessionScore}%</p>
                    <p className="text-sm text-blue-600 mt-2">{overallStats.bestSessionDate}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                    <Award className="h-10 w-10 text-green-600 mb-3" />
                    <p className="text-sm text-gray-600">Consistency</p>
                    <p className="text-3xl font-bold text-green-900">{overallStats.consistencyScore}%</p>
                    <p className="text-sm text-green-600 mt-2">Engagement stability</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                    <Thermometer className="h-10 w-10 text-purple-600 mb-3" />
                    <p className="text-sm text-gray-600">Avg Session</p>
                    <p className="text-3xl font-bold text-purple-900">{overallStats.avgSessionDuration}m</p>
                    <p className="text-sm text-purple-600 mt-2">Per study session</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Session History</h2>
                  <div className="flex items-center space-x-4">
                    <select 
                      value={sessionFilter}
                      onChange={(e) => setSessionFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="all">All Sessions</option>
                      <option value="active">Active Only</option>
                      <option value="completed">Completed Only</option>
                    </select>
                    
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="date">Sort by Date</option>
                      <option value="duration">Sort by Duration</option>
                      <option value="engagement">Sort by Engagement</option>
                    </select>
                    
                    <button 
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-5 w-5" /> : <SortDesc className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2">
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Start Time</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">End Time</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Duration</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Engagement</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Posture</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Focus</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Highlights</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionHistory.map((session, idx) => (
                        <tr key={session.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-6 py-4 text-sm text-gray-800">{session.date}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{session.startTime}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{session.endTime}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">{session.duration}</td>
                          
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                session.engagement >= 80 ? 'bg-green-100 text-green-800' :
                                session.engagement >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {session.engagement}%
                              </span>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    session.posture >= 80 ? 'bg-green-500' : 
                                    session.posture >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${session.posture}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-xs text-gray-600">{session.posture}%</span>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    session.focus >= 80 ? 'bg-green-500' : 
                                    session.focus >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${session.focus}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-xs text-gray-600">{session.focus}%</span>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 text-sm text-gray-800 text-center">
                            {session.highlights > 0 ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {session.highlights}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              session.status === 'Active' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                              session.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {session.status}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {session.pdfName || 'Document'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="text-sm text-gray-500 mt-4">
                  Showing {sessionHistory.length} of {reportData.totalSessions} sessions
                </div>
              </div>
            )}

            {/* Webcam Metrics Tab */}
            {activeTab === 'metrics' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Webcam & Attention Metrics</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center">
                    <Eye className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Total Blinks</p>
                    <p className="text-4xl font-bold text-blue-900">{webcamMetrics.totalBlinks}</p>
                    <p className="text-sm text-blue-600 mt-2">Avg: {webcamMetrics.avgBlinkRate}/session</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 text-center">
                    <Smartphone className="h-12 w-12 text-red-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Phone Detections</p>
                    <p className="text-4xl font-bold text-red-900">{webcamMetrics.totalPhoneDetections}</p>
                    <p className="text-sm text-red-600 mt-2">Distraction events</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Avg Posture Score</p>
                    <p className="text-4xl font-bold text-green-900">{webcamMetrics.avgPostureScore}%</p>
                    <p className="text-sm text-green-600 mt-2">Ergonomic health</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Focus vs Engagement Trend</h3>
                    <Line
                      data={{
                        labels: webcamMetrics.attentionScores.map(a => a.date),
                        datasets: [
                          {
                            label: 'Engagement',
                            data: webcamMetrics.attentionScores.map(a => a.score),
                            borderColor: 'rgb(79, 70, 229)',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            tension: 0.4
                          },
                          {
                            label: 'Focus',
                            data: webcamMetrics.focusScores.map(a => a.score),
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'top' } }
                      }}
                    />
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Attention Distribution</h3>
                    <Bar
                      data={{
                        labels: webcamMetrics.attentionScores.map(a => a.date),
                        datasets: [{
                          label: 'Engagement Score',
                          data: webcamMetrics.attentionScores.map(a => a.score),
                          backgroundColor: webcamMetrics.attentionScores.map(a => 
                            a.score >= 80 ? '#10b981' : 
                            a.score >= 60 ? '#f59e0b' : '#ef4444'
                          ),
                          borderWidth: 1,
                          borderColor: '#ffffff'
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PDF Analytics Tab */}
            {activeTab === 'pdf' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">PDF Reading & Interaction Analytics</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center">
                    <BookOpen className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Pages Studied</p>
                    <p className="text-3xl font-bold text-purple-900">{pdfMetrics.pagesVisited}</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 text-center">
                    <Highlighter className="h-10 w-10 text-orange-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Highlights Made</p>
                    <p className="text-3xl font-bold text-orange-900">{pdfMetrics.highlightsMade}</p>
                  </div>

                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 text-center">
                    <FileText className="h-10 w-10 text-pink-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Annotations</p>
                    <p className="text-3xl font-bold text-pink-900">{pdfMetrics.annotationsCreated}</p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 text-center">
                    <Clock className="h-10 w-10 text-teal-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Avg Time/Page</p>
                    <p className="text-3xl font-bold text-teal-900">{pdfMetrics.avgTimePerPage}s</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl border p-6">
                    <Scroll className="h-10 w-10 text-indigo-600 mb-3" />
                    <p className="text-sm text-gray-600">Total Scrolls</p>
                    <p className="text-3xl font-bold text-gray-800">{pdfMetrics.totalScrolls}</p>
                  </div>

                  <div className="bg-white rounded-xl border p-6">
                    <CheckSquare className="h-10 w-10 text-green-600 mb-3" />
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-3xl font-bold text-gray-800">{pdfMetrics.completionRate}%</p>
                  </div>

                  <div className="bg-white rounded-xl border p-6">
                    <Zap className="h-10 w-10 text-yellow-600 mb-3" />
                    <p className="text-sm text-gray-600">Engagement Level</p>
                    <p className="text-3xl font-bold text-gray-800">{pdfMetrics.engagementLevel}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Keywords Tab */}
            {activeTab === 'keywords' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Frequently Highlighted Keywords</h2>
                
                {keywords.length === 0 ? (
                  <div className="text-center py-12">
                    <Highlighter className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No keywords highlighted yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {keywords.map((kw, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-l-4 border-indigo-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xl font-bold text-gray-800 capitalize">{kw.keyword}</p>
                            <p className="text-sm text-gray-600">Highlighted {kw.count} time{kw.count !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                            {kw.count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Time Analysis Tab */}
            {activeTab === 'time' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Study Time Analysis</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Peak Study Hours</h3>
                    <Bar
                      data={{
                        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                        datasets: [{
                          label: 'Sessions Started',
                          data: timeAnalysis.sessionsByHour,
                          backgroundColor: Array(24).fill('rgba(79, 70, 229, 0.7)'),
                          borderColor: 'rgb(79, 70, 229)',
                          borderWidth: 1
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } }
                      }}
                    />
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600">
                        Peak Hour: <span className="font-bold">{timeAnalysis.peakStudyHour}:00</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Daily Engagement Trend</h3>
                    <Line
                      data={{
                        labels: timeAnalysis.dailyEngagement.map(d => d.date),
                        datasets: [{
                          label: 'Daily Avg Engagement',
                          data: timeAnalysis.dailyEngagement.map(d => d.engagement),
                          borderColor: 'rgb(16, 185, 129)',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          tension: 0.4,
                          fill: true
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          Report generated on {new Date(reportData.lastUpdated || Date.now()).toLocaleString()}
          <br />
          Data includes {reportData.totalSessions} sessions and {reportData.totalMetrics} metric points
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveStudentReport;