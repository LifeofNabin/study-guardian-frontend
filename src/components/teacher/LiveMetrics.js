// FILE: frontend/src/components/teacher/LiveMetrics.js
// ✅ REPLACE YOUR EXISTING LiveMetrics.js WITH THIS

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, Activity, Eye, AlertTriangle, RefreshCw, FileText
} from 'lucide-react';
import { sessionsAPI, roomsAPI } from '../../services/api';
import ComprehensiveStudentReport from './ComprehensiveStudentReport';

const LiveMetrics = ({ room, onBack }) => {
  const [activeView, setActiveView] = useState('overview');
  const [metrics, setMetrics] = useState({
    activeStudents: 0,
    avgEngagement: 0,
    totalHighlights: 0,
    alerts: 0,
    students: []
  });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [room._id]);

  const fetchMetrics = async () => {
    setRefreshing(true);
    try {
      const roomResponse = await roomsAPI.getById(room._id);
      const roomData = roomResponse.data.room || roomResponse.data;
      
      let roomSessions = [];
      try {
        const sessionsResponse = await sessionsAPI.getRecent();
        const allSessions = sessionsResponse.data || [];
        
        // Filter sessions for this room
        roomSessions = allSessions.filter(s => {
          const roomIdStr = s.room_id?._id?.toString() || s.room_id?.toString();
          return roomIdStr === room._id?.toString();
        });
        
        console.log(`✅ Found ${roomSessions.length} sessions for room ${room.title}`);
      } catch (err) {
        console.warn('Could not fetch sessions:', err);
      }
      
      const activeStudents = new Set(
        roomSessions.filter(s => s.is_active).map(s => {
          return s.student_id?._id?.toString() || s.student_id?.toString();
        })
      ).size;
      
      const avgEngagement = roomSessions.length > 0 
        ? roomSessions.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / roomSessions.length 
        : 0;
      
      const students = (roomData.allowed_students || []).map(student => {
        const studentId = student._id?.toString() || student.toString();
        const studentName = student.name || 'Unknown Student';
        const studentEmail = student.email || '';
        
        // Find all sessions for this student
        const studentSessions = roomSessions.filter(s => {
          const sessionStudentId = s.student_id?._id?.toString() || s.student_id?.toString();
          return sessionStudentId === studentId;
        });
        
        const activeSession = studentSessions.find(s => s.is_active);
        
        // Calculate total duration
        const totalDuration = studentSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
        
        return {
          id: studentId,
          name: studentName,
          email: studentEmail,
          status: activeSession ? 'Active' : 'Inactive',
          currentEngagement: activeSession ? (activeSession.engagement_score || 0) : 0,
          totalSessions: studentSessions.length,
          totalHours: totalDuration / 3600,
          avgEngagement: studentSessions.length > 0 
            ? studentSessions.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / studentSessions.length 
            : 0,
          lastActive: studentSessions.length > 0 
            ? studentSessions[studentSessions.length - 1].start_time 
            : null
        };
      });

      setMetrics({
        activeStudents,
        avgEngagement: Math.round(avgEngagement),
        totalHighlights: roomSessions.reduce((sum, s) => 
          sum + (s.interactions?.filter(i => i.type === 'highlight').length || 0), 0
        ),
        alerts: 0,
        students
      });
    } catch (error) {
      console.error('❌ Error fetching metrics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewReport = (student) => {
    console.log('📊 Opening comprehensive report for:', student.name);
    setSelectedStudent(student);
    setActiveView('student-detail');
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

  // Main Overview
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-800 transition">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">{room.title}</h1>
            <p className="text-gray-600">Live Monitoring Dashboard</p>
          </div>
          <button 
            onClick={fetchMetrics} 
            disabled={refreshing} 
            className="flex items-center px-4 py-2 bg-white hover:bg-gray-50 rounded-lg shadow transition disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> 
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Active Now</h3>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.activeStudents}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg Engagement</h3>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.avgEngagement}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Highlights</h3>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.totalHighlights}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Alerts</h3>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.alerts}</p>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Students</h3>
          
          {metrics.students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No students in this room yet</p>
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
                          <div className="h-10 w-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
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
                          student.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {student.totalSessions}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {student.totalHours.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="font-medium text-sm mr-2">{Math.round(student.avgEngagement)}%</span>
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