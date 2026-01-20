// FILE: frontend/src/components/student/StudySession.js
// ✅ FIXED VERSION: With better session lifecycle management

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentPDFViewer from './StudentPDFViewer';
import { sessionsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const StudySession = ({ 
  documentId, 
  room,
  onSessionComplete
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  
  // Use refs to track state without triggering re-renders
  const sessionInitializedRef = useRef(false);
  const cleanupCalledRef = useRef(false);
  const componentMountedRef = useRef(true);

  // Single session initialization effect
  useEffect(() => {
    // Set mounted flag
    componentMountedRef.current = true;
    
    return () => {
      componentMountedRef.current = false;
    };
  }, []);

  // Session Initialization - ONE TIME ONLY
  useEffect(() => {
    // Early returns
    if (sessionInitializedRef.current) {
      console.log('🔷 Session already initialized, skipping');
      return;
    }
    
    if (sessionEnded) {
      console.log('🔷 Session already ended, skipping initialization');
      return;
    }
    
    if (!componentMountedRef.current) {
      console.log('🔷 Component not mounted, skipping');
      return;
    }

    console.log('🔷 StudySession: Starting initialization...');
    
    if (!user) {
      setError('User not authenticated. Please log in.');
      setLoading(false);
      return;
    }
    
    if (!documentId) {
      setError('No document provided.');
      setLoading(false);
      return;
    }

    const startSession = async () => {
      try {
        console.log('🔷 Starting session for document:', documentId, 'user:', user._id);
        
        const response = await sessionsAPI.startSession({
          document_id: documentId,
          room_id: room?._id || null,
          student_id: user._id,
        });
        
        if (response && response.session) {
          console.log('✅ Session created:', response.session._id);
          
          if (componentMountedRef.current) {
            sessionInitializedRef.current = true;
            setActiveSession(response.session);
            setError(null);
          }
        } else {
          throw new Error('Invalid response from server');
        }
        
      } catch (err) {
        console.error('❌ Failed to start session:', err);
        
        if (componentMountedRef.current) {
          setError(err.response?.data?.message || err.message || 'Failed to start session');
        }
      } finally {
        if (componentMountedRef.current) {
          setLoading(false);
        }
      }
    };

    startSession();
    
  }, [user, documentId, room, sessionEnded]);

  // Session Termination Handler - FIXED
  const handleEndSession = useCallback(async (sessionData = null) => {
    console.log('🔷 handleEndSession called');
    
    if (!componentMountedRef.current) {
      console.log('🔷 Component not mounted, skipping');
      return;
    }
    
    if (cleanupCalledRef.current) {
      console.log('🔷 Cleanup already called');
      return;
    }
    
    cleanupCalledRef.current = true;
    
    const sessionToEnd = sessionData || activeSession;
    
    if (!sessionToEnd?._id) {
      console.warn('⚠️ No session ID to end');
      
      if (componentMountedRef.current) {
        setSessionEnded(true);
        setTimeout(() => navigate('/student/dashboard'), 500);
      }
      return;
    }

    try {
      console.log('🔷 Ending session:', sessionToEnd._id);
      
      // Mark as ended first
      if (componentMountedRef.current) {
        setSessionEnded(true);
      }
      
      // Call API
      await sessionsAPI.endSession(sessionToEnd._id);
      console.log('✅ Session ended successfully');
      
      // Call callback if provided
      if (onSessionComplete && componentMountedRef.current) {
        onSessionComplete(sessionToEnd);
      }
      
      // Navigate after a brief delay
      if (componentMountedRef.current) {
        setTimeout(() => {
          if (componentMountedRef.current) {
            navigate('/student/dashboard');
          }
        }, 1000);
      }
      
    } catch (err) {
      console.error('❌ Error ending session:', err);
      
      // Still navigate even if ending fails
      if (componentMountedRef.current) {
        setTimeout(() => navigate('/student/dashboard'), 1000);
      }
    }
  }, [activeSession, navigate, onSessionComplete]);

  // Cleanup on unmount - SIMPLIFIED
  useEffect(() => {
    return () => {
      console.log('🔷 StudySession unmounting');
      
      // Only try to end session if not already ended
      if (!cleanupCalledRef.current && activeSession?._id && componentMountedRef.current) {
        console.log('🔷 Auto-ending session on unmount');
        
        // Use timeout to avoid race conditions
        setTimeout(() => {
          if (activeSession?._id) {
            sessionsAPI.endSession(activeSession._id).catch(err => {
              console.error('❌ Auto-end failed:', err);
            });
          }
        }, 100);
      }
    };
  }, [activeSession]);

  // ============================================
  // RENDER STATES
  // ============================================

  // Loading State
  if (loading && !error && !activeSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-[6px] border-slate-800 border-t-indigo-600 mx-auto mb-6"></div>
          <p className="text-indigo-400 text-xl font-bold mb-2">Starting Study Session</p>
          <p className="text-slate-500">Loading document and initializing AI monitoring...</p>
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-150"></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-300"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || (!loading && !activeSession)) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center p-6">
        <div className="text-center max-w-md bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-10">
          <div className="text-rose-500 text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl text-white mb-3 font-bold">Session Error</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            {error || 'Failed to start study session. Please try again.'}
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/student/dashboard')}
              className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-lg font-bold transition-all hover:scale-[1.02] active:scale-95"
            >
              Back to Dashboard
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-medium transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if session has necessary data
  if (activeSession && !activeSession.document_path) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center">
        <div className="text-center max-w-md">
          <div className="text-yellow-500 text-5xl mb-4">📄</div>
          <h2 className="text-xl text-white mb-2">Document Not Found</h2>
          <p className="text-slate-400 mb-6">The document path is not available for this session.</p>
          <button 
            onClick={() => handleEndSession()}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            End Session
          </button>
        </div>
      </div>
    );
  }

  // Prepare session object for StudentPDFViewer
  const sessionForViewer = activeSession ? {
    sessionId: activeSession._id,
    documentPath: activeSession.document_path,
    student_id: activeSession.student_id || user._id,
    userId: user._id,
    type: room ? 'room' : 'self-study',
    room: room,
    startTime: activeSession.start_time,
    // Add any other required fields from activeSession
    ...activeSession
  } : null;

  // Final check before rendering
  if (!sessionForViewer || !sessionForViewer.sessionId) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Finalizing session setup...</p>
        </div>
      </div>
    );
  }

  console.log('🔷 Rendering PDF viewer for session:', sessionForViewer.sessionId);

  return (
    <div className="study-session-container" style={{ height: '100vh', overflow: 'hidden' }}>
      <StudentPDFViewer 
        key={`session-${sessionForViewer.sessionId}`} // Force re-render on new session
        session={sessionForViewer}
        onEndSession={handleEndSession}
      />
    </div>
  );
};

export default React.memo(StudySession);