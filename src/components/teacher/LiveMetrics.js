// FILE: frontend/src/components/teacher/LiveMetrics.js
// ✅ FIXED API RESPONSE HANDLING

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, Activity, Eye, AlertTriangle, RefreshCw, FileText,
  Play, Radio, Target, Clock, BookOpen, Zap, TrendingUp, Maximize2, 
  BarChart3, Calendar, Download, EyeOff, Wifi, WifiOff, UserCheck,
  MessageSquare, Target as TargetIcon, Cpu, Brain, ChevronRight,
  Monitor, Video, BookOpen as BookOpenIcon, Thermometer, Users as UsersIcon,
  PieChart, BarChart, LineChart, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';
import { sessionsAPI, roomsAPI } from '../../services/api';
import ComprehensiveStudentReport from './ComprehensiveStudentReport';
import HistoricalReport from './HistoricalReport';

const LiveMetrics = ({ room, onBack }) => {
  const [activeView, setActiveView] = useState('overview');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [metrics, setMetrics] = useState({
    activeStudents: 0,
    avgEngagement: 0,
    totalHighlights: 0,
    alerts: 0,
    students: [],
    activeSessions: [],
    historicalSessions: []
  });

  // Real-time polling for active sessions
  useEffect(() => {
    fetchLiveData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLiveData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [room._id, autoRefresh]);

  const fetchLiveData = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 [TEACHER] Fetching live data for room:', room.title);
      console.log('🔄 [TEACHER] Room ID:', room._id);
      
      // 1. Get room details with students
      const roomResponse = await roomsAPI.getById(room._id);
      console.log('🏫 Room response:', roomResponse);
      
      const roomData = roomResponse.data.room || roomResponse.data;
      const roomStudents = roomData.allowed_students || [];
      
      console.log('👥 Room students:', roomStudents);
      console.log('👥 Number of students:', roomStudents.length);
      
      // 2. Fetch ALL sessions from recent API
      const sessionsResponse = await sessionsAPI.getRecent();
      console.log('📊 Sessions API response:', sessionsResponse);
      
      // Handle different response structures
      let allSessions = [];
      if (Array.isArray(sessionsResponse.data)) {
        allSessions = sessionsResponse.data;
      } else if (sessionsResponse.data && Array.isArray(sessionsResponse.data.sessions)) {
        allSessions = sessionsResponse.data.sessions;
      } else if (Array.isArray(sessionsResponse.sessions)) {
        allSessions = sessionsResponse.sessions;
      } else if (sessionsResponse.data && typeof sessionsResponse.data === 'object') {
        // Try to extract sessions from object
        allSessions = Object.values(sessionsResponse.data).filter(item => 
          item && typeof item === 'object' && item.student_id
        );
      }
      
      console.log('📊 All sessions extracted:', allSessions.length);
      console.log('📊 Sample session:', allSessions[0]);
      
      // 3. Filter sessions for THIS room and its students
      const roomSessions = allSessions.filter(session => {
        if (!session) return false;
        
        // Check if session belongs to this room
        const sessionRoomId = session.room_id?._id || session.room_id;
        const matchesRoom = sessionRoomId?.toString() === room._id?.toString();
        
        // Check if session belongs to any student in this room
        const sessionStudentId = session.student_id?._id || session.student_id;
        const studentInRoom = roomStudents.some(student => {
          const studentId = student._id || student;
          return studentId?.toString() === sessionStudentId?.toString();
        });
        
        return matchesRoom || studentInRoom;
      });
      
      console.log('🎯 Sessions for this room:', roomSessions.length);
      console.log('🎯 Room sessions details:', roomSessions.map(s => ({
        id: s._id,
        student: s.student_id?.name || 'Unknown',
        room: s.room_id?.title || 'No room',
        is_active: s.is_active
      })));
      
      // 4. Separate active and historical sessions
      const activeSessions = roomSessions.filter(s => s.is_active === true);
      const historicalSessions = roomSessions.filter(s => s.is_active === false);
      
      console.log('⚡ Active sessions:', activeSessions.length);
      console.log('📚 Historical sessions:', historicalSessions.length);
      
      // 5. Process active sessions for real-time view
      const processedActiveSessions = activeSessions.map(session => {
        const studentId = session.student_id?._id || session.student_id;
        const student = roomStudents.find(st => {
          const stId = st._id || st;
          return stId?.toString() === studentId?.toString();
        });
        
        // Calculate duration
        const startTime = new Date(session.start_time);
        const durationMs = Date.now() - startTime.getTime();
        const durationMinutes = Math.floor(durationMs / 60000);
        
        // Get interaction counts
        const interactions = session.interactions || [];
        const highlights = interactions.filter(i => 
          i.type === 'highlight'
        ).length;
        
        const pageTurns = interactions.filter(i => 
          i.type === 'page_turn' || i.type === 'page_change'
        ).length;
        
        const annotations = interactions.filter(i => 
          i.type === 'annotation' || i.type === 'note'
        ).length;
        
        // Get current page from last interaction
        const pageInteractions = interactions.filter(i => 
          i.type === 'page_turn' || i.type === 'page_change'
        );
        const currentPage = pageInteractions.length > 0 
          ? (pageInteractions[pageInteractions.length - 1].data?.page || 1)
          : 1;
        
        return {
          sessionId: session._id,
          student: {
            id: studentId,
            name: student?.name || session.student_id?.name || 'Unknown Student',
            email: student?.email || session.student_id?.email || '',
            avatar: (student?.name || session.student_id?.name || 'S').charAt(0).toUpperCase()
          },
          startTime: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: durationMinutes,
          engagement: session.engagement_score || 0,
          posture: session.metrics?.posture_score || 0,
          focus: session.metrics?.focus_score || 0,
          currentPage,
          totalPages: session.total_pages || 1,
          highlights,
          annotations,
          pageTurns,
          distractions: session.metrics?.phone_detections || 0,
          eyeBlinks: session.metrics?.eye_blinks || 0,
          lastActivity: session.last_activity || session.updatedAt,
          webcamStatus: session.metrics?.webcam_active ? 'active' : 'inactive',
          absentTime: Math.floor((session.metrics?.absent_time || 0) / 60),
          presentTime: Math.floor((session.metrics?.present_time || 0) / 60),
          pdfName: session.pdf_name || 'Document'
        };
      });
      
      // 6. Process all students in the room
      const processedStudents = roomStudents.map(student => {
        const studentId = student._id || student;
        const studentName = student.name || 'Unknown Student';
        const studentEmail = student.email || '';
        
        // Find all sessions for this student in this room
        const studentSessions = roomSessions.filter(s => {
          const sessionStudentId = s.student_id?._id || s.student_id;
          return sessionStudentId?.toString() === studentId?.toString();
        });
        
        const activeSession = studentSessions.find(s => s.is_active);
        
        // Calculate stats
        const totalDuration = studentSessions.reduce((sum, s) => 
          sum + (s.duration_seconds || 0), 0
        );
        
        const totalHighlights = studentSessions.reduce((sum, s) => 
          sum + (s.interactions?.filter(i => i.type === 'highlight').length || 0), 0
        );
        
        const totalAnnotations = studentSessions.reduce((sum, s) => 
          sum + (s.interactions?.filter(i => i.type === 'annotation' || i.type === 'note').length || 0), 0
        );
        
        // Calculate average engagement from completed sessions
        const completedSessions = studentSessions.filter(s => !s.is_active);
        const avgEngagement = completedSessions.length > 0 ? 
          completedSessions.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / completedSessions.length : 0;
        
        return {
          id: studentId,
          name: studentName,
          email: studentEmail,
          status: activeSession ? 'active' : 'inactive',
          currentSession: activeSession ? {
            engagement: activeSession.engagement_score || 0,
            page: activeSession.current_page || 1,
            startTime: new Date(activeSession.start_time).toLocaleTimeString(),
            duration: Math.floor((Date.now() - new Date(activeSession.start_time).getTime()) / 60000)
          } : null,
          totalSessions: studentSessions.length,
          totalHours: (totalDuration / 3600).toFixed(1),
          totalHighlights,
          totalAnnotations,
          avgEngagement: Math.round(avgEngagement),
          lastActive: studentSessions.length > 0 ? 
            new Date(studentSessions[0].start_time).toLocaleDateString() : 'Never'
        };
      });
      
      // 7. Calculate overall metrics
      const activeStudents = processedActiveSessions.length;
      
      // Average engagement of active sessions
      const activeEngagement = activeSessions.length > 0 ? 
        activeSessions.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / activeSessions.length : 0;
      
      // Total highlights from all sessions
      const totalHighlights = roomSessions.reduce((sum, s) => 
        sum + (s.interactions?.filter(i => i.type === 'highlight').length || 0), 0
      );
      
      // Total distractions as alerts
      const totalAlerts = roomSessions.reduce((sum, s) => 
        sum + (s.metrics?.phone_detections || 0), 0
      );
      
      console.log(`📊 [TEACHER] Live Metrics Updated:`);
      console.log(`   Active Students: ${activeStudents}`);
      console.log(`   Total Students: ${processedStudents.length}`);
      console.log(`   Avg Engagement: ${Math.round(activeEngagement)}%`);
      console.log(`   Total Highlights: ${totalHighlights}`);
      console.log(`   Active Sessions:`, processedActiveSessions);
      
      setMetrics({
        activeStudents,
        avgEngagement: Math.round(activeEngagement),
        totalHighlights,
        alerts: totalAlerts,
        students: processedStudents,
        activeSessions: processedActiveSessions,
        historicalSessions: historicalSessions
      });
      
    } catch (error) {
      console.error('❌ [TEACHER] Error fetching live data:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Set empty state on error
      setMetrics({
        activeStudents: 0,
        avgEngagement: 0,
        totalHighlights: 0,
        alerts: 0,
        students: [],
        activeSessions: [],
        historicalSessions: []
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewReport = (student) => {
    console.log('📊 Opening comprehensive report for:', student.name);
    setSelectedStudent(student);
    setActiveView('student-detail');
  };

  const handleViewLiveSession = (session) => {
    console.log('🎬 Viewing live session:', session.sessionId);
    
    // Show detailed modal
    const modalContent = `
      🎓 Student: ${session.student.name}
      📧 Email: ${session.student.email}
      
      📊 Current Status:
      • Engagement: ${session.engagement}%
      • Posture Score: ${session.posture}%
      • Focus Level: ${session.focus}%
      
      📖 Document Progress:
      • Current Page: ${session.currentPage}
      • Duration: ${session.duration} minutes
      • Webcam: ${session.webcamStatus === 'active' ? '✅ Active' : '❌ Inactive'}
      
      📝 Interactions:
      • Highlights: ${session.highlights}
      • Annotations: ${session.annotations}
      • Page Turns: ${session.pageTurns}
      
      ⚠️ Distractions:
      • Phone Detections: ${session.distractions}
      • Eye Blinks: ${session.eyeBlinks}
    `;
    
    alert(modalContent);
  };

  // Show Comprehensive Student Report
  if (activeView === 'student-detail' && selectedStudent) {
    return (
      <ComprehensiveStudentReport 
        student={selectedStudent} 
        room={room} 
        onBack={() => {
          setActiveView('overview');
          setSelectedStudent(null);
        }} 
      />
    );
  }

  // Show Historical Report
  if (activeView === 'historical') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setActiveView('overview')} className="flex items-center text-gray-600 hover:text-gray-800 transition">
              <ArrowLeft className="h-5 w-5 mr-2" /> Back to Live View
            </button>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800">{room.title}</h1>
              <p className="text-gray-600">Historical Sessions Report</p>
            </div>
            <div className="w-32"></div>
          </div>
          <HistoricalReport room={room} />
        </div>
      </div>
    );
  }

  // Main Overview
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-800 transition">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back to Dashboard
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">{room.title}</h1>
            <p className="text-gray-600">Live Monitoring Dashboard</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white px-3 py-1 rounded-lg shadow">
              <div className={`h-2 w-2 rounded-full mr-2 ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">Live</span>
              <button 
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="ml-2 text-xs text-purple-600 hover:text-purple-800"
              >
                {autoRefresh ? 'Pause' : 'Resume'}
              </button>
            </div>
            <button 
              onClick={fetchLiveData} 
              disabled={refreshing} 
              className="flex items-center px-4 py-2 bg-white hover:bg-gray-50 rounded-lg shadow transition disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> 
              Refresh
            </button>
          </div>
        </div>

        {/* Debug Info Panel */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <h4 className="font-semibold text-yellow-800">Debug Info</h4>
          </div>
          <div className="mt-2 text-sm text-yellow-700">
            <p>Room ID: {room._id}</p>
            <p>Room Title: {room.title}</p>
            <p>Refresh Status: {refreshing ? 'Refreshing...' : 'Idle'}</p>
            <p>Auto Refresh: {autoRefresh ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Active Now</h3>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.activeStudents}</p>
            <p className="text-sm text-gray-500 mt-1">
              of {metrics.students.length} total students
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg Engagement</h3>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.avgEngagement}%</p>
            <p className="text-sm text-gray-500 mt-1">
              Across active sessions
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Highlights</h3>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.totalHighlights}</p>
            <p className="text-sm text-gray-500 mt-1">
              All time in this room
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Distractions</h3>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.alerts}</p>
            <p className="text-sm text-gray-500 mt-1">
              Phone detections
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-white rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => setActiveView('overview')}
            className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center ${
              activeView === 'overview'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Radio className="h-5 w-5 mr-2" />
            Live Overview
          </button>
          <button
            onClick={() => setActiveView('historical')}
            className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center ${
              activeView === 'historical'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="h-5 w-5 mr-2" />
            Historical Reports
          </button>
        </div>

        {/* Active Sessions Panel */}
        {metrics.activeSessions.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Play className="h-6 w-6 text-green-500 mr-3" />
                <h3 className="text-xl font-bold text-gray-800">Live Sessions</h3>
                <span className="ml-3 animate-pulse h-2 w-2 bg-green-500 rounded-full"></span>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                {metrics.activeSessions.length} Active
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metrics.activeSessions.map((session, index) => (
                <div 
                  key={session.sessionId || index} 
                  className="border border-green-200 rounded-xl p-5 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                        {session.student.avatar}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{session.student.name}</h4>
                        <p className="text-sm text-gray-600">{session.student.email}</p>
                      </div>
                    </div>
                    <div className="animate-pulse h-3 w-3 bg-green-500 rounded-full"></div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Engagement</span>
                      <div className="flex items-center">
                        <span className="font-bold text-gray-800 mr-2">{session.engagement}%</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              session.engagement >= 80 ? 'bg-green-500' : 
                              session.engagement >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${session.engagement}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Page</span>
                      <span className="font-bold text-gray-800">
                        Page {session.currentPage}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Duration</span>
                      <span className="font-bold text-gray-800">{session.duration}m</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Interactions</span>
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          📝 {session.highlights}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          ✏️ {session.annotations}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleViewLiveSession(session)}
                      className="flex-1 px-4 py-2 bg-white border border-green-500 text-green-600 hover:bg-green-50 rounded-lg font-medium text-sm transition-colors"
                    >
                      <Eye className="h-4 w-4 inline mr-1" /> View Details
                    </button>
                    <button
                      onClick={() => handleViewReport({
                        id: session.student.id,
                        name: session.student.name,
                        email: session.student.email
                      })}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      <FileText className="h-4 w-4 inline mr-1" /> Full Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="text-center py-8">
              <Play className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Active Sessions</h3>
              <p className="text-gray-600">Students haven't started studying in this room yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Room Code: <span className="font-bold text-purple-600">{room.code}</span>
              </p>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <UsersIcon className="h-6 w-6 text-purple-600 mr-3" />
              <h3 className="text-xl font-bold text-gray-800">All Students in Room</h3>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
              {metrics.students.length} Students
            </span>
          </div>
          
          {metrics.students.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No students in this room yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Add students using the "Add Student" button in the room card
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Engagement</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {metrics.students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold mr-3 ${
                            student.status === 'active' 
                              ? 'bg-gradient-to-br from-green-400 to-emerald-600 animate-pulse' 
                              : 'bg-gradient-to-br from-purple-400 to-indigo-500'
                          }`}>
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          student.status === 'active' 
                            ? 'bg-green-100 text-green-800 animate-pulse' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.status === 'active' ? (
                            <><Play className="h-3 w-3 inline mr-1" /> Live</>
                          ) : (
                            'Inactive'
                          )}
                        </span>
                        {student.status === 'active' && student.currentSession && (
                          <div className="text-xs text-gray-500 mt-1">
                            Since {student.currentSession.startTime}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {student.totalSessions}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {student.totalHours}h
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="font-medium text-sm mr-2">{student.avgEngagement}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                student.avgEngagement >= 80 ? 'bg-green-500' : 
                                student.avgEngagement >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${student.avgEngagement}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewReport(student)}
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveMetrics;