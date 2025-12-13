// FILE PATH: frontend/src/components/student/StudentDashboard.js
// ✅ COMPLETE VERSION: Teacher names + PDF status badges + All previous fixes

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Plus, Calendar, Clock, Users, TrendingUp,
  FileText, Target, PlayCircle, LogOut, Settings, Bell,
  Search, Filter, Award, Zap, AlertCircle, Trash2, Book,
  Upload, Check, X, ChevronDown, ChevronUp, Paperclip
} from 'lucide-react';
import StudyPlan from './StudyPlan';
import StudentPDFViewer from './StudentPDFViewer';
import WebcamMonitor from './WebcamMonitor';
import MetricsPanel from './MetricsPanel';
import Analytics from '../shared/Analytics';
import Notifications from '../shared/Notifications';
import { authAPI, roomsAPI, routinesAPI, interactionsAPI, sessionsAPI } from '../../services/api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [resumableSession, setResumableSession] = useState(null);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [showStudyPlan, setShowStudyPlan] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [expandedRoutine, setExpandedRoutine] = useState(null);
  const [uploadingPDF, setUploadingPDF] = useState({});
  
  const [stats, setStats] = useState({
    totalHours: 0,
    thisWeek: 0,
    avgEngagement: 0,
    completedSessions: 0,
    streak: 0,
    rank: 0
  });

  const [currentMetrics, setCurrentMetrics] = useState({
    faceDetected: false,
    lookingAtScreen: false,
    postureScore: 0,
    neckAngle: 0,
    backAngle: 0,
    hasPhone: false,
    engagementScore: 0,
    attentionRate: 0,
    blinkRate: 0,
    distractionCount: 0
  });

  useEffect(() => {
    checkActiveSession();
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user && !activeSession) {
      fetchRooms();
      fetchRoutines();
      fetchStats();
    }
  }, [user, activeSession]);

  const formatDuration = (minutes) => {
    if (!minutes || minutes <= 0) return 'Not set';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hStr = h > 0 ? `${h} hour${h > 1 ? 's' : ''}` : '';
    const mStr = m > 0 ? `${m} minute${m > 1 ? 's' : ''}` : '';
    return [hStr, mStr].filter(Boolean).join(' ');
  };

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      navigate('/login');
    }
  };

  const checkActiveSession = async () => {
    try {
      const response = await sessionsAPI.getActiveSession();
      if (response.data.success && response.data.session) {
        const session = response.data.session;
        console.log('📌 Found resumable session:', session);
        
        let sessionType = 'self-study';
        let roomDetails = null;
        let routineDetails = null;

        if (session.room_id) {
          try {
            const roomResponse = await roomsAPI.getById(session.room_id._id || session.room_id);
            roomDetails = roomResponse.data.room || roomResponse.data;
            sessionType = 'room';
          } catch (e) {
            console.error("Failed to fetch details for resumable session's room:", e);
            setResumableSession(null);
            setLoading(false);
            return;
          }
        } else if (session.document_id) {
          try {
            const routineResponse = await routinesAPI.getById(session.document_id);
            routineDetails = routineResponse.data.routine || routineResponse.data;
          } catch (e) {
            console.error("Failed to fetch details for resumable session's routine:", e);
            setResumableSession(null);
            setLoading(false);
            return;
          }
        }
        
        setResumableSession({
          type: sessionType,
          sessionId: session._id,
          session: session,
          room: roomDetails,
          routine: routineDetails,
          documentPath: roomDetails?.pdf_path || routineDetails?.pdf_path
        });
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error checking active session:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSession = () => {
    if (resumableSession) {
      console.log('▶️ Resuming session:', resumableSession);
      setActiveSession(resumableSession);
    }
  };

  const handleDiscardSession = async () => {
    const sessionId = resumableSession?.session?._id; 
    if (sessionId) {
      try {
        console.log('🗑️ Attempting to end session:', sessionId);
        await sessionsAPI.endSession(sessionId);
        console.log('✅ Old session discarded successfully');
      } catch (error) {
        console.error('❌ Error ending old session:', error);
        console.log('📥 Error response:', error.response?.data);
      }
    }
    setResumableSession(null);
  };

  const fetchRooms = async () => {
    try {
      console.log('🔍 Fetching rooms...');
      const response = await roomsAPI.getAll();
      const roomsData = response.data.rooms || response.data || [];
      const studentRooms = Array.isArray(roomsData) 
        ? roomsData.filter(room => {
            if (!room.allowed_students || room.allowed_students.length === 0) return false;
            return room.allowed_students.some(student => {
              if (typeof student === 'object' && student !== null) {
                const studentId = student._id?.toString() || student.toString();
                return studentId === user?._id?.toString() || student.email === user?.email;
              }
              return student.toString() === user?._id?.toString();
            });
          })
        : [];
      console.log('✅ Student rooms:', studentRooms);
      setRooms(studentRooms);
    } catch (error) {
      console.error('❌ Error fetching rooms:', error);
      setRooms([]);
    }
  };

  const fetchRoutines = async () => {
    try {
      console.log('🔍 Fetching routines...');
      const response = await routinesAPI.getAll();
      console.log('📥 Routines response:', response.data);
      const routinesData = response.data.routines || response.data || [];
      console.log('📊 Routines array:', routinesData);
      setRoutines(Array.isArray(routinesData) ? routinesData : []);
    } catch (error) {
      console.error('Error fetching routines:', error);
      setRoutines([]);
    }
  };

  const handleDeleteRoutine = async (routineId) => {
    if (window.confirm('Are you sure you want to delete this routine? This action cannot be undone.')) {
      try {
        await routinesAPI.delete(routineId);
        setRoutines(prevRoutines => prevRoutines.filter(r => r._id !== routineId));
        alert('Routine deleted successfully!');
      } catch (error) {
        console.error('Error deleting routine:', error);
        alert('Failed to delete routine. Please try again.');
      }
    }
  };

  const handleSubjectPDFUpload = async (routineId, subjectName, file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a valid PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('PDF file must be less than 10MB');
      return;
    }

    const uploadKey = `${routineId}-${subjectName}`;
    setUploadingPDF(prev => ({ ...prev, [uploadKey]: true }));

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('subject_name', subjectName);

      console.log(`📤 Uploading PDF for ${subjectName} in routine ${routineId}`);
      await routinesAPI.uploadSubjectPDF(routineId, formData);
      
      console.log('✅ PDF uploaded successfully');
      alert(`PDF uploaded successfully for ${subjectName}!`);
      
      await fetchRoutines();
    } catch (error) {
      console.error('❌ Error uploading PDF:', error);
      alert(`Failed to upload PDF: ${error.response?.data?.message || error.message}`);
    } finally {
      setUploadingPDF(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const fetchStats = async () => {
    try {
      const response = await interactionsAPI.getOverallAnalytics();
      const analytics = response.data.analytics || {};
      
      console.log('📊 Raw analytics data:', analytics);
      
      const totalHours = parseFloat(analytics.totalHours) || 0;
      const thisWeek = parseFloat(analytics.thisWeek) || 0;
      const avgEngagement = parseFloat(analytics.avgEngagement) || 0;
      
      setStats({
        totalHours: totalHours.toFixed(1),
        thisWeek: thisWeek.toFixed(1),
        avgEngagement: avgEngagement.toFixed(0),
        completedSessions: parseInt(analytics.completedSessions) || 0,
        streak: parseInt(analytics.streak) || 0,
        rank: parseInt(analytics.rank) || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({ totalHours: '0.0', thisWeek: '0.0', avgEngagement: '0', completedSessions: 0, streak: 0, rank: 0 });
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      alert('Please enter a room code');
      return;
    }
    try {
      setJoiningRoom(true);
      await roomsAPI.joinRoom(roomCode);
      setShowJoinRoom(false);
      setRoomCode('');
      await fetchRooms();
      alert('Successfully joined room!');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to join room.';
      alert(errorMessage);
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleStartRoomSession = async (room) => {
    if (!room.pdf_path && !room.has_pdf) {
      alert('This room has no study materials yet. Please contact your teacher.');
      return;
    }
    
    const resumableSessionId = resumableSession?.session?._id;
    if (resumableSessionId) {
      try {
        await sessionsAPI.endSession(resumableSessionId);
        setResumableSession(null);
      } catch (error) { 
        console.error('❌ Error ending previous session:', error); 
      }
    }
    
    try {
      let documentPath = room.pdf_path;
      if (documentPath && documentPath.includes('/uploads/')) {
        const uploadsIndex = documentPath.indexOf('/uploads/');
        documentPath = documentPath.substring(uploadsIndex);
      }
      
      const sessionData = { 
        room_id: room._id, 
        document_id: room._id, 
        document_path: documentPath
      };
      // This is the correct line that will fix the error
      const response = await sessionsAPI.startSession(sessionData);

      if (!response.data.success) throw new Error(response.data.message || 'Failed to create session');
      
      const session = response.data.session;
      setActiveSession({ 
        type: 'room', 
        room, 
        sessionId: session._id, 
        session: session, 
        documentPath: documentPath
      });
    } catch (error) {
      console.error('❌ Error starting session:', error);
      alert(`Failed to start session: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  };

  const handleStartSelfStudy = async (routine, subjectOrData) => {
    const subjectName = typeof subjectOrData === 'string' 
      ? subjectOrData 
      : subjectOrData.name;
    
    const subjectData = typeof subjectOrData === 'object' && subjectOrData.name
      ? subjectOrData
      : routine.subjects?.find(s => s.name === subjectName);

    console.log('🚀 Starting self-study:', {
      routine: routine.title,
      subjectName,
      subjectData,
      hasPDF: subjectData?.pdf_path || subjectData?.has_pdf
    });

    if (!subjectData?.pdf_path && !subjectData?.has_pdf && !subjectData?.pdfs?.length) {
      alert(`Please upload a PDF for "${subjectName}" before starting the session.`);
      console.warn('⚠️ No PDF available for subject:', subjectName);
      return;
    }

    const resumableSessionId = resumableSession?.session?._id;
    if (resumableSessionId) {
      try {
        await sessionsAPI.endSession(resumableSessionId);
        setResumableSession(null);
      } catch (error) { 
        console.error('❌ Error ending previous session:', error); 
      }
    }
    
    try {
      let documentPath = subjectData.pdf_path || subjectData.pdf_url;
      
      if (subjectData.pdfs && subjectData.pdfs.length > 0) {
        documentPath = subjectData.pdfs[0].path || subjectData.pdfs[0].url;
      }

      console.log('📄 Using document path:', documentPath);

      const sessionData = { 
        document_id: routine._id, 
        document_path: documentPath 
      };
      
      // CORRECT
      const response = await sessionsAPI.startSession(sessionData); 
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create session');
      }
      
      const session = response.data.session;
      setActiveSession({ 
        type: 'self-study', 
        routine, 
        subject: subjectName,
        sessionId: session._id, 
        session: session, 
        documentPath: documentPath 
      });

      console.log('✅ Self-study session started successfully');
    } catch (error) {
      console.error('❌ Error starting self-study session:', error);
      alert(`Failed to start session: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEndSession = async () => {
    const sessionId = activeSession?.session?._id; 
    if (sessionId) {
      try {
        const response = await sessionsAPI.endSession(sessionId);
        console.log('✅ Session ended successfully:', response.data);
      } catch (error) {
        console.error('❌ Error ending session:', error);
        
        if (error.response?.data?.message === 'Session is already ended') {
          console.log('ℹ️ Session was already ended, continuing...');
        } else {
          alert(`Failed to end session: ${error.response?.data?.message || error.message}`);
          return;
        }
      }
    }
    
    setActiveSession(null);
    setResumableSession(null);
  };

  const handleMetricsUpdate = (newMetrics) => {
    setCurrentMetrics(prev => ({ ...prev, ...newMetrics }));
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };
  
  const toggleRoutine = (routineId) => {
    setExpandedRoutine(prev => (prev === routineId ? null : routineId));
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         room.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterSubject === 'all' || room.subject === filterSubject;
    return matchesSearch && matchesFilter;
  });

  const subjects = [...new Set(rooms.map(room => room.subject).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (activeSession) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="flex h-screen">
          <div className="flex-1">
            <StudentPDFViewer session={activeSession} onEndSession={handleEndSession} />
          </div>
          <div className="w-96 bg-gray-800 p-4 space-y-4 overflow-y-auto">
            <WebcamMonitor session={activeSession} sessionId={activeSession.session._id} onMetricsUpdate={handleMetricsUpdate} />
            <MetricsPanel sessionId={activeSession.session._id} metrics={currentMetrics} />
          </div>
        </div>
      </div>
    );
  }

  if (showStudyPlan) {
    return <StudyPlan routines={routines || []} onBack={() => setShowStudyPlan(false)} onRoutineCreated={fetchRoutines} onStartSession={handleStartSelfStudy} />;
  }

  if (showAnalytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setShowAnalytics(false)} className="flex items-center text-gray-600 hover:text-gray-800 transition-colors">
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-800">My Analytics</h1>
            <div className="w-32"></div>
          </div>
          <Analytics type="student" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">StudyGuardian</h1>
              <p className="text-xs text-gray-500">Smart Learning Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Notifications />
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Settings className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">Student</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-50 rounded-full text-red-600 transition-colors" title="Logout">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {resumableSession && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <AlertCircle className="h-10 w-10" />
                <div>
                  <h3 className="text-xl font-bold">You have an unfinished session!</h3>
                  <p className="text-orange-100 text-sm">
                    {resumableSession.type === 'room' ? `Room: ${resumableSession.room?.title}` : `Routine: ${resumableSession.routine?.title}`}
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button onClick={handleResumeSession} className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center space-x-2">
                  <PlayCircle className="h-5 w-5" />
                  <span>Resume</span>
                </button>
                <button onClick={handleDiscardSession} className="bg-white bg-opacity-20 text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-30 transition-colors">
                  End & Start Fresh
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}! 👋</h2>
              <p className="text-blue-100">Ready to continue your learning journey?</p>
            </div>
            {stats.streak > 0 && (
              <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-300" />
                <p className="text-2xl font-bold">{stats.streak}</p>
                <p className="text-sm text-blue-100">Day Streak!</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Study Time</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalHours}h</p>
              </div>
              <Clock className="h-12 w-12 text-blue-500 opacity-80" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">This Week</p>
                <p className="text-3xl font-bold text-gray-800">{stats.thisWeek}h</p>
              </div>
              <Calendar className="h-12 w-12 text-green-500 opacity-80" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Engagement</p>
                <p className="text-3xl font-bold text-gray-800">{stats.avgEngagement}%</p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-500 opacity-80" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-800">{stats.completedSessions}</p>
              </div>
              <Target className="h-12 w-12 text-orange-500 opacity-80" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button onClick={() => setShowJoinRoom(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg p-6 flex items-center justify-between transition-all transform hover:scale-105">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-lg font-semibold">Join Room</span>
            </div>
          </button>
          <button onClick={() => setShowStudyPlan(true)} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-lg p-6 flex items-center justify-between transition-all transform hover:scale-105">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <Calendar className="h-6 w-6" />
              </div>
              <span className="text-lg font-semibold">Study Plan</span>
            </div>
          </button>
          <button onClick={() => setShowAnalytics(true)} className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl shadow-lg p-6 flex items-center justify-between transition-all transform hover:scale-105">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-lg font-semibold">Analytics</span>
            </div>
          </button>
        </div>

        {/* ✅ FIXED: My Classrooms with Teacher Names + PDF Status */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Users className="h-6 w-6 mr-2 text-blue-600" />
              My Classrooms
            </h2>
          </div>
          {filteredRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map(room => (
                <div key={room._id} className="bg-gray-50 rounded-xl p-5 border hover:shadow-lg transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{room.title}</h3>
                      <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {room.subject}
                      </span>
                    </div>
                    
                    {/* ✅ FIXED: Teacher Name Display */}
                    <p className="text-sm text-gray-600 mt-2 flex items-center">
                      <Users className="h-4 w-4 mr-1.5 text-gray-500" />
                      Teacher: {
                        room.teacher_id 
                          ? (typeof room.teacher_id === 'object' && room.teacher_id !== null)
                            ? (room.teacher_id.name || 'Not assigned')
                            : room.teacher_id
                          : 'Not assigned'
                      }
                    </p>
                    
                    {/* ✅ PDF Status Badge */}
                    <div className="mt-3 flex items-center">
                      {room.pdf_path || room.has_pdf ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center">
                          <Paperclip className="h-3 w-3 mr-1" />
                          Study material available
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          No materials yet
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleStartRoomSession(room)}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <PlayCircle className="h-5 w-5" />
                    <span>Start Session</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No classrooms yet</p>
              <p className="text-sm mt-2">Join a room using the code provided by your teacher</p>
            </div>
          )}
        </div>

        {/* ✅ FIXED: My Study Routines with PDF Status Badges */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Book className="h-6 w-6 mr-2 text-green-600" />
              My Study Routines
            </h2>
          </div>
          
          {routines && routines.length > 0 ? (
            <div className="space-y-4">
              {routines.map(routine => {
                const isExpanded = expandedRoutine === routine._id;
                
                // ✅ Calculate PDF status
                const totalSubjects = routine.subjects?.length || 0;
                const subjectsWithPDF = routine.subjects?.filter(s => 
                  s.pdf_path || s.has_pdf || (s.pdfs && s.pdfs.length > 0)
                ).length || 0;
                const allPDFsUploaded = totalSubjects > 0 && subjectsWithPDF === totalSubjects;
                
                return (
                  <div key={routine._id} className="bg-gray-50 rounded-xl border hover:shadow-md transition-shadow">
                    {/* Routine Header */}
                    <div 
                      className="p-5 cursor-pointer"
                      onClick={() => toggleRoutine(routine._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-800">{routine.title}</h3>
                            
                            {/* ✅ PDF Status Badge */}
                            {totalSubjects > 0 && (
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center ${
                                allPDFsUploaded 
                                  ? 'bg-green-100 text-green-700' 
                                  : subjectsWithPDF > 0
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                <Paperclip className="h-3 w-3 mr-1" />
                                {subjectsWithPDF}/{totalSubjects} PDFs
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatDuration(routine.duration)}
                            </span>
                            <span className="flex items-center">
                              <Book className="h-4 w-4 mr-1" />
                              {totalSubjects} subject{totalSubjects !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoutine(routine._id);
                            }}
                            className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                            title="Delete routine"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                          
                          {isExpanded ? (
                            <ChevronUp className="h-6 w-6 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Subjects View */}
                    {isExpanded && routine.subjects && routine.subjects.length > 0 && (
                      <div className="px-5 pb-5 space-y-3 border-t border-gray-200 pt-4">
                        {routine.subjects.map((subject, idx) => {
                          const uploadKey = `${routine._id}-${subject.name}`;
                          const isUploading = uploadingPDF[uploadKey];
                          const hasPDF = subject.pdf_path || subject.has_pdf || (subject.pdfs && subject.pdfs.length > 0);
                          
                          return (
                            <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3 flex-1">
                                  <h4 className="font-semibold text-gray-800">{subject.name}</h4>
                                  
                                  {/* ✅ Subject PDF Status Badge */}
                                  {hasPDF ? (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center">
                                      <Check className="h-3 w-3 mr-1" />
                                      PDF Ready
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex items-center">
                                      <X className="h-3 w-3 mr-1" />
                                      No PDF
                                    </span>
                                  )}
                                </div>
                                
                                <span className="text-sm text-gray-600">
                                  {formatDuration(subject.duration)}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {/* PDF Upload */}
                                <label className="flex-1 cursor-pointer">
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files[0]) {
                                        handleSubjectPDFUpload(routine._id, subject.name, e.target.files[0]);
                                      }
                                    }}
                                    disabled={isUploading}
                                  />
                                  <div className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors ${
                                    isUploading
                                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                                      : hasPDF
                                      ? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                                  }`}>
                                    {isUploading ? (
                                      <>
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                        <span className="text-sm text-gray-600">Uploading...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="h-4 w-4 text-gray-600" />
                                        <span className="text-sm text-gray-600">
                                          {hasPDF ? 'Replace PDF' : 'Upload PDF'}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </label>
                                
                                {/* Start Session Button */}
                                <button
                                  onClick={() => handleStartSelfStudy(routine, subject)}
                                  disabled={!hasPDF}
                                  className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
                                    hasPDF
                                      ? 'bg-green-600 hover:bg-green-700 text-white'
                                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}
                                >
                                  <PlayCircle className="h-4 w-4" />
                                  <span>Start</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Book className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No study routines yet</p>
              <p className="text-sm mt-2">Click "Study Plan" above to create your first routine</p>
            </div>
          )}
        </div>
      </div>

      {/* Join Room Modal */}
      {showJoinRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Join a Room</h2>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Enter room code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleJoinRoom}
                disabled={joiningRoom}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joiningRoom ? 'Joining...' : 'Join Room'}
              </button>
              <button
                onClick={() => {
                  setShowJoinRoom(false);
                  setRoomCode('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;