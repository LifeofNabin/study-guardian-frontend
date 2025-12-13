// FILE: frontend/src/components/teacher/ComprehensiveStudentReport.js
// ✅ CLEAN VERSION - COPY THIS ENTIRE FILE

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Download, Eye, Smartphone, Clock, 
  BookOpen, Highlighter, FileText, TrendingUp, Activity, Target,
  CheckCircle, Zap, Scroll, CheckSquare
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { sessionsAPI } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const ComprehensiveStudentReport = ({ student, room, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState('webcam');

  useEffect(() => {
    fetchCompleteReport();
  }, [student.id, room._id]);

  const fetchCompleteReport = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching comprehensive report for:', student.name);
      
      const sessionsResponse = await sessionsAPI.getRecent();
      const allSessions = (sessionsResponse.data || []).filter(s => {
        const studentIdStr = s.student_id?._id?.toString() || s.student_id?.toString();
        const roomIdStr = s.room_id?._id?.toString() || s.room_id?.toString();
        return studentIdStr === student.id?.toString() && roomIdStr === room._id?.toString();
      });

      console.log(`✅ Found ${allSessions.length} sessions for analysis`);

      if (allSessions.length === 0) {
        setReportData({ hasData: false, sessions: [] });
        setLoading(false);
        return;
      }

      const webcamMetrics = calculateWebcamMetrics(allSessions);
      const pdfMetrics = calculatePDFMetrics(allSessions);
      const keywords = extractKeywords(allSessions);
      const sessionHistory = processSessionHistory(allSessions);

      setReportData({
        hasData: true,
        totalSessions: allSessions.length,
        webcamMetrics,
        pdfMetrics,
        keywords,
        sessionHistory,
        sessions: allSessions
      });

    } catch (error) {
      console.error('❌ Error fetching report:', error);
      setReportData({ hasData: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const calculateWebcamMetrics = (sessions) => {
    let totalBlinks = 0;
    let totalPhoneDetections = 0;
    let totalAbsentTime = 0;
    let totalPresentTime = 0;
    let totalPostureScore = 0;
    let postureCount = 0;
    let attentionScores = [];

    sessions.forEach(session => {
      const metrics = session.metrics || {};
      totalBlinks += metrics.total_blinks || 0;
      totalPhoneDetections += metrics.phone_detections || 0;
      totalAbsentTime += metrics.absent_time || 0;
      totalPresentTime += metrics.present_time || 0;
      
      if (metrics.posture_score) {
        totalPostureScore += metrics.posture_score;
        postureCount++;
      }

      if (session.engagement_score) {
        attentionScores.push({
          date: new Date(session.start_time).toLocaleDateString(),
          score: session.engagement_score
        });
      }
    });

    return {
      totalBlinks,
      avgBlinkRate: sessions.length > 0 ? (totalBlinks / sessions.length).toFixed(1) : 0,
      totalPhoneDetections,
      totalAbsentTime: Math.round(totalAbsentTime / 60),
      totalPresentTime: Math.round(totalPresentTime / 60),
      avgPostureScore: postureCount > 0 ? Math.round(totalPostureScore / postureCount) : 0,
      attentionScores: attentionScores.slice(-10),
      presenceRate: totalPresentTime + totalAbsentTime > 0 
        ? Math.round((totalPresentTime / (totalPresentTime + totalAbsentTime)) * 100) 
        : 0
    };
  };

  const calculatePDFMetrics = (sessions) => {
    let totalPages = 0;
    let totalHighlights = 0;
    let totalAnnotations = 0;
    let totalScrolls = 0;
    let uniquePages = new Set();
    let timePerPage = {};

    sessions.forEach(session => {
      const interactions = session.interactions || [];
      
      interactions.forEach(interaction => {
        if (interaction.type === 'page_turn' || interaction.type === 'page_change') {
          totalPages++;
          if (interaction.data?.page) {
            uniquePages.add(interaction.data.page);
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

    return {
      pagesVisited: uniquePages.size,
      totalPageTurns: totalPages,
      highlightsMade: totalHighlights,
      annotationsCreated: totalAnnotations,
      totalScrolls,
      avgTimePerPage,
      completionRate,
      engagementLevel: totalHighlights + totalAnnotations > 20 ? 'High' : 
                       totalHighlights + totalAnnotations > 10 ? 'Medium' : 'Low'
    };
  };

  const extractKeywords = (sessions) => {
    const keywordCount = {};
    
    sessions.forEach(session => {
      const interactions = session.interactions || [];
      
      interactions.forEach(interaction => {
        if ((interaction.type === 'highlight' || interaction.type === 'highlighter') && interaction.data?.text) {
          const words = interaction.data.text
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 4);
          
          words.forEach(word => {
            keywordCount[word] = (keywordCount[word] || 0) + 1;
          });
        }
      });
    });

    return Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
  };

  const processSessionHistory = (sessions) => {
    return sessions.map(session => {
      const duration = session.duration_seconds || 0;
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      
      return {
        id: session._id,
        date: new Date(session.start_time).toLocaleDateString(),
        startTime: new Date(session.start_time).toLocaleTimeString(),
        endTime: session.end_time ? new Date(session.end_time).toLocaleTimeString() : 'Active',
        duration: `${hours}h ${minutes}m`,
        durationMinutes: Math.round(duration / 60),
        engagement: session.engagement_score || 0,
        highlights: (session.interactions || []).filter(i => i.type === 'highlight' || i.type === 'highlighter').length,
        status: session.is_active ? 'Active' : 'Completed'
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const exportReport = () => {
    if (!reportData?.hasData) return;

    let csv = 'Student Performance Report\n\n';
    csv += `Student: ${student.name}\n`;
    csv += `Room: ${room.title}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    csv += 'WEBCAM METRICS\n';
    csv += `Total Sessions,${reportData.totalSessions}\n`;
    csv += `Total Blinks,${reportData.webcamMetrics.totalBlinks}\n`;
    csv += `Phone Detections,${reportData.webcamMetrics.totalPhoneDetections}\n`;
    csv += `Presence Rate,${reportData.webcamMetrics.presenceRate}%\n\n`;

    csv += 'PDF INTERACTION METRICS\n';
    csv += `Pages Visited,${reportData.pdfMetrics.pagesVisited}\n`;
    csv += `Highlights Made,${reportData.pdfMetrics.highlightsMade}\n`;
    csv += `Annotations Created,${reportData.pdfMetrics.annotationsCreated}\n\n`;

    csv += 'SESSION HISTORY\n';
    csv += 'Date,Start Time,End Time,Duration,Engagement,Highlights,Status\n';
    reportData.sessionHistory.forEach(s => {
      csv += `${s.date},${s.startTime},${s.endTime},${s.duration},${s.engagement}%,${s.highlights},${s.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${student.name}_Report_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading comprehensive report...</p>
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
            <h2 className="text-3xl font-bold text-gray-800 mb-4">No Activity Yet</h2>
            <p className="text-gray-600 text-lg">{student.name} hasn't started any sessions in this room.</p>
          </div>
        </div>
      </div>
    );
  }

  const { webcamMetrics, pdfMetrics, keywords, sessionHistory } = reportData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-800 mb-6">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back to Room
        </button>

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
                <p className="text-indigo-200 mt-1">Room: {room.title}</p>
              </div>
            </div>
            <button 
              onClick={exportReport}
              className="flex items-center px-6 py-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 shadow-lg font-semibold"
            >
              <Download className="h-5 w-5 mr-2" /> Export Report
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <Target className="h-10 w-10 text-blue-500 mb-3" />
            <p className="text-3xl font-bold text-gray-800">{reportData.totalSessions}</p>
            <p className="text-sm text-gray-600 mt-1">Total Sessions</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <Activity className="h-10 w-10 text-green-500 mb-3" />
            <p className="text-3xl font-bold text-gray-800">{webcamMetrics.presenceRate}%</p>
            <p className="text-sm text-gray-600 mt-1">Presence Rate</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <BookOpen className="h-10 w-10 text-purple-500 mb-3" />
            <p className="text-3xl font-bold text-gray-800">{pdfMetrics.pagesVisited}</p>
            <p className="text-sm text-gray-600 mt-1">Pages Visited</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <Highlighter className="h-10 w-10 text-orange-500 mb-3" />
            <p className="text-3xl font-bold text-gray-800">{pdfMetrics.highlightsMade}</p>
            <p className="text-sm text-gray-600 mt-1">Highlights Made</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'webcam', label: 'Webcam Metrics', icon: Eye },
              { id: 'pdf', label: 'PDF Interaction', icon: BookOpen },
              { id: 'keywords', label: 'Keywords', icon: Highlighter },
              { id: 'sessions', label: 'Session History', icon: Clock }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center px-6 py-4 font-semibold transition ${
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
            {/* Webcam Tab */}
            {activeTab === 'webcam' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Webcam & Attention Metrics</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                    <Eye className="h-12 w-12 text-blue-600 mb-3" />
                    <p className="text-sm text-gray-600">Total Blinks</p>
                    <p className="text-4xl font-bold text-blue-900">{webcamMetrics.totalBlinks}</p>
                    <p className="text-sm text-blue-600 mt-2">Avg: {webcamMetrics.avgBlinkRate}/session</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6">
                    <Smartphone className="h-12 w-12 text-red-600 mb-3" />
                    <p className="text-sm text-gray-600">Phone Detections</p>
                    <p className="text-4xl font-bold text-red-900">{webcamMetrics.totalPhoneDetections}</p>
                    <p className="text-sm text-red-600 mt-2">Distraction events</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                    <CheckCircle className="h-12 w-12 text-green-600 mb-3" />
                    <p className="text-sm text-gray-600">Avg Posture Score</p>
                    <p className="text-4xl font-bold text-green-900">{webcamMetrics.avgPostureScore}%</p>
                    <p className="text-sm text-green-600 mt-2">Ergonomic health</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Attention Trend</h3>
                    <Line
                      data={{
                        labels: webcamMetrics.attentionScores.map(a => a.date),
                        datasets: [{
                          label: 'Engagement',
                          data: webcamMetrics.attentionScores.map(a => a.score),
                          borderColor: 'rgb(79, 70, 229)',
                          backgroundColor: 'rgba(79, 70, 229, 0.1)',
                          tension: 0.4,
                          fill: true
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, max: 100 } }
                      }}
                    />
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Presence Distribution</h3>
                    <Doughnut
                      data={{
                        labels: ['Present', 'Absent'],
                        datasets: [{
                          data: [webcamMetrics.totalPresentTime, webcamMetrics.totalAbsentTime],
                          backgroundColor: ['#10b981', '#ef4444']
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'bottom' } }
                      }}
                    />
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600">Present: <span className="font-bold">{webcamMetrics.totalPresentTime} min</span></p>
                      <p className="text-sm text-gray-600">Absent: <span className="font-bold">{webcamMetrics.totalAbsentTime} min</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PDF Tab */}
            {activeTab === 'pdf' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">PDF Reading & Interaction</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center">
                    <BookOpen className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-purple-900">{pdfMetrics.pagesVisited}</p>
                    <p className="text-sm text-gray-600 mt-1">Pages</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 text-center">
                    <Highlighter className="h-10 w-10 text-orange-600 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-orange-900">{pdfMetrics.highlightsMade}</p>
                    <p className="text-sm text-gray-600 mt-1">Highlights</p>
                  </div>

                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 text-center">
                    <FileText className="h-10 w-10 text-pink-600 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-pink-900">{pdfMetrics.annotationsCreated}</p>
                    <p className="text-sm text-gray-600 mt-1">Annotations</p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 text-center">
                    <Clock className="h-10 w-10 text-teal-600 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-teal-900">{pdfMetrics.avgTimePerPage}s</p>
                    <p className="text-sm text-gray-600 mt-1">Avg/Page</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl border p-6">
                    <Scroll className="h-10 w-10 text-indigo-600 mb-3" />
                    <p className="text-sm text-gray-600">Total Scrolls</p>
                    <p className="text-3xl font-bold text-gray-800">{pdfMetrics.totalScrolls}</p>
                  </div>

                  <div className="bg-white rounded-xl border p-6">
                    <CheckSquare className="h-10 w-10 text-green-600 mb-3" />
                    <p className="text-sm text-gray-600">Completion</p>
                    <p className="text-3xl font-bold text-gray-800">{pdfMetrics.completionRate}%</p>
                  </div>

                  <div className="bg-white rounded-xl border p-6">
                    <Zap className="h-10 w-10 text-yellow-600 mb-3" />
                    <p className="text-sm text-gray-600">Engagement</p>
                    <p className="text-3xl font-bold text-gray-800">{pdfMetrics.engagementLevel}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Keywords Tab */}
            {activeTab === 'keywords' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Top Highlighted Keywords</h2>
                
                {keywords.length === 0 ? (
                  <div className="text-center py-12">
                    <Highlighter className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No keywords highlighted yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {keywords.map((kw, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-l-4 border-indigo-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xl font-bold text-gray-800 capitalize">{kw.keyword}</p>
                            <p className="text-sm text-gray-600">Highlighted {kw.count} times</p>
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

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Session History</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2">
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Start</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">End</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Duration</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Engagement</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Highlights</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
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
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              session.engagement >= 80 ? 'bg-green-100 text-green-800' :
                              session.engagement >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {session.engagement}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-800">{session.highlights}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              session.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {session.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveStudentReport;