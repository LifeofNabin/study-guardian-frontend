/**
 * FILE PATH: frontend/src/components/student/StudySession.js
 * ✅ OPTIMIZED: PDF takes full width, floating metrics panel with hide/show
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentPDFViewer from './StudentPDFViewer';
import WebcamMonitor from './WebcamMonitor';
import MetricsPanel from './MetricsPanel';
import { sessionsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

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
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [metrics, setMetrics] = useState({});

  // ✅ NEW: Panel visibility states
  const [showPanel, setShowPanel] = useState(true);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  const sessionId = activeSession?._id;
  const documentPath = activeSession?.document_path; 
  const sessionStartTime = useMemo(() => activeSession ? new Date(activeSession.start_time).getTime() : Date.now(), [activeSession]);

  // Session Initialization
  useEffect(() => {
    if (!user || !documentId) {
      setError('User or document not defined.');
      setLoading(false);
      return;
    }

    const startSession = async () => {
      try {
        setLoading(true);
        const response = await sessionsAPI.startSession({
          document_id: documentId,
          room_id: room?._id,
          student_id: user._id,
        });
        
        setActiveSession(response.session);
        setLoading(false);
      } catch (err) {
        console.error('Error starting session:', err);
        setError('Failed to start study session.');
        setLoading(false);
      }
    };

    startSession();
  }, [user, documentId, room]);

  // Session Termination Handler
  const handleEndSession = useCallback(async () => {
    if (!sessionId) return;
    
    if (!window.confirm('Are you sure you want to end your study session?')) return;

    try {
      const response = await sessionsAPI.endSession(sessionId);

      if (onSessionComplete) {
        onSessionComplete(response.session);
      }

      navigate(`/student/analytics/session/${sessionId}`);
    } catch (err) {
      console.error('Error ending session:', err);
      alert('Failed to end session. Please try again.');
    }
  }, [sessionId, navigate, onSessionComplete]);

  // Handle metrics updates from WebcamMonitor
  const handleMetricsUpdate = useCallback((newMetrics) => {
    setMetrics(newMetrics);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="mt-4 text-gray-400">Starting session and loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !documentPath || !sessionId) {
    return (
      <div className="min-h-screen bg-gray-900 text-red-400 flex justify-center items-center">
        <div className="text-center">
          <p className="text-xl mb-4">Error: {error || 'Invalid session data or document path.'}</p>
          <button 
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col relative">
      {/* Top bar */}
      <div className="flex justify-between items-center bg-gray-800 text-white p-3 shadow-md z-10">
        <h2 className="text-lg font-semibold">
          {room ? `${room.title} - Guided Study` : 'Self Study Session'}
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
          >
            {showPanel ? (
              <>
                <ChevronRight className="h-4 w-4" />
                Hide Metrics
              </>
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                Show Metrics
              </>
            )}
          </button>
          <button
            onClick={handleEndSession}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Main content - PDF takes full width */}
      <div className="flex-1 relative overflow-hidden">
        {/* PDF Viewer - Full Width */}
        <div className="absolute inset-0 overflow-auto">
          <StudentPDFViewer 
            sessionId={sessionId} 
            documentPath={documentPath} 
          />
        </div>

        {/* ✅ Floating Metrics Panel - Right Side */}
        {showPanel && (
          <div 
            className={`absolute top-4 right-4 bottom-4 bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl shadow-2xl border-2 border-purple-500/30 transition-all duration-300 z-20 ${
              isPanelExpanded ? 'w-[500px]' : 'w-[360px]'
            }`}
            style={{
              maxHeight: 'calc(100vh - 120px)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white p-3 rounded-t-2xl flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <h3 className="font-bold text-sm">Live Monitoring</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title={isPanelExpanded ? "Compact View" : "Expanded View"}
                >
                  {isPanelExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Hide Panel"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex flex-col h-[calc(100%-48px)] overflow-hidden">
              {/* ✅ Webcam Monitor - Compact & Minimal */}
              <div className="p-2 border-b border-purple-500/20 bg-gray-900/50">
                <div className="relative rounded-xl overflow-hidden" style={{ maxHeight: '200px' }}>
                  <WebcamMonitor 
                    sessionId={sessionId} 
                    className="w-full"
                    showControls={false}
                    autoStart={true}
                    onMetricsUpdate={handleMetricsUpdate}
                    onProcessingChange={setIsWebcamActive}
                  />
                </div>
              </div>

              {/* ✅ Metrics Panel - Optimized Scrollable */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <MetricsPanel 
                  sessionId={sessionId}
                  startTime={sessionStartTime}
                  isWebcamActive={isWebcamActive}
                  metrics={metrics}
                />
              </div>
            </div>
          </div>
        )}

        {/* ✅ Minimal Show Panel Button (when hidden) - Fixed position */}
        {!showPanel && (
          <button
            onClick={() => setShowPanel(true)}
            className="fixed top-24 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-l-lg shadow-lg transition-all z-20 flex items-center gap-1 group"
            title="Show Metrics Panel"
            style={{ writingMode: 'vertical-rl' }}
          >
            <ChevronLeft className="h-4 w-4 rotate-90 group-hover:translate-x-1 transition-transform" />
            <span className="text-xs font-semibold tracking-wider">METRICS</span>
          </button>
        )}
      </div>
      
      {/* ✅ Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(139, 92, 246, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.8);
        }
      `}</style>
    </div>
  );
};

export default StudySession;