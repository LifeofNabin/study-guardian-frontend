// ✅ FIXED: Close button now properly exits summary without auto-starting new session
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import io from 'socket.io-client';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  Highlighter,
  FileText,
  Clock,
  X,
  Save,
  Share2,
  AlertCircle,
  Trash2,
  CheckCircle
} from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

import { sessionsAPI, interactionsAPI } from '../../services/api';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const StudentPDFViewer = ({ session, onEndSession }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [highlights, setHighlights] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [loadingHighlights, setLoadingHighlights] = useState(true);
  const pageRefs = useRef({});

  const [sessionData, setSessionData] = useState({
    startTime: new Date(),
    highlights: [],
    pageVisits: {},
    totalTimeOnPage: {}
  });
  const [showSummary, setShowSummary] = useState(false);
  const [aiInsights, setAiInsights] = useState('');
  const [duration, setDuration] = useState(0);

  const socketRef = useRef(null);
  const pageStartTimeRef = useRef(new Date());
  const timerRef = useRef(null);
  const viewerRef = useRef(null);
  const sessionEndedRef = useRef(false); // ✅ Track if session already ended

  // ✅ CORRECTED: New loadPDF function that uses documentPath from session
  const loadPDF = useCallback(() => {
    console.log('📄 Loading PDF for session:', session);

    try {
      // Priority 1: Use documentPath if provided (new unified approach)
      if (session?.documentPath) {
        let documentPath = session.documentPath;
        console.log('Original documentPath:', documentPath);
        
        // ✅ Normalize path - extract from /uploads/ onwards
        if (documentPath.includes('/uploads/')) {
          const uploadsIndex = documentPath.indexOf('/uploads/');
          documentPath = documentPath.substring(uploadsIndex);
          console.log('Normalized documentPath:', documentPath);
        }
        
        // Remove '/api' from REACT_APP_API_URL to get base server URL
        const serverBaseUrl = process.env.REACT_APP_API_URL.replace('/api', '');
        
        // Construct full PDF URL
        const fullPdfUrl = `${serverBaseUrl}${documentPath}`;
        console.log('✅ Constructed PDF URL:', fullPdfUrl);
        
        const token = localStorage.getItem('token');
        setPdfUrl({
          url: fullPdfUrl,
          httpHeaders: { 'Authorization': `Bearer ${token}` }
        });
        setPdfError('');
        return;
      }

      // Fallback: Original logic for backward compatibility
      if (session?.type === 'room') {
        if (!session.room || (!session.room.pdf_path && !session.room.has_pdf)) {
          setPdfError('No study materials available. Please ask your teacher to upload materials.');
          return;
        }
        const roomId = session.room._id;
        const token = localStorage.getItem('token');
        setPdfUrl({
          url: `${process.env.REACT_APP_API_URL}/rooms/${roomId}/pdf`,
          httpHeaders: { 'Authorization': `Bearer ${token}` }
        });
        setPdfError('');
      } else if (session?.type === 'self-study' || session?.type === 'selfstudy') {
        if (!session.routine || !session.routine.pdf_path) {
          setPdfError('No study materials available for this routine.');
          return;
        }
        const token = localStorage.getItem('token');
        const serverBaseUrl = process.env.REACT_APP_API_URL.replace('/api', '');
        setPdfUrl({
          url: `${serverBaseUrl}/uploads/pdfs/personal/${session.routine.pdf_path}`,
          httpHeaders: { 'Authorization': `Bearer ${token}` }
        });
        setPdfError('');
      } else {
        setPdfError('Invalid session type or missing document path');
      }
    } catch (error) {
      console.error('❌ Error loading PDF:', error);
      setPdfError('Failed to load study materials');
    }
  }, [session]);

  // Robust loadHighlights: supports backend returning array, response.data array, or array wrapped differently
  const loadHighlights = useCallback(async () => {
    if (!session?.sessionId) return;

    try {
      setLoadingHighlights(true);
      console.log('🔍 Loading highlights for session:', session.sessionId);

      const resp = await interactionsAPI.getInteractionsBySession(session.sessionId);

      // Normalize to array
      let interactions = [];
      if (Array.isArray(resp)) {
        interactions = resp;
      } else if (Array.isArray(resp?.data)) {
        interactions = resp.data;
      } else if (Array.isArray(resp?.response?.data)) {
        interactions = resp.response.data;
      } else {
        // Try to probe for arrays in nested fields
        for (const key of Object.keys(resp || {})) {
          if (Array.isArray(resp[key])) {
            interactions = resp[key];
            break;
          }
        }
      }

      console.log('📥 Received interactions (normalized):', interactions.length);

      const highlightInteractions = interactions.filter(
        interaction => interaction.type === 'highlight'
      );

      const loadedHighlights = highlightInteractions.map(interaction => ({
        id: interaction._id || interaction.id || interaction._doc?._id,
        text: interaction.data?.text || interaction.text || '',
        page: interaction.data?.page || interaction.page || 1,
        timestamp: interaction.timestamp || interaction.createdAt || Date.now(),
        color: interaction.data?.color || '#FFEB3B',
        rects: interaction.data?.rects || interaction.rects || []
      }));

      setHighlights(loadedHighlights);
      setSessionData(prev => ({ ...prev, highlights: loadedHighlights }));
      console.log(`✅ Loaded ${loadedHighlights.length} highlights`);
    } catch (error) {
      console.error('❌ Error loading highlights:', error);
      setHighlights([]);
    } finally {
      setLoadingHighlights(false);
    }
  }, [session?.sessionId]);

  // Helper to send interaction and normalize response
  const sendInteraction = useCallback(async (type, data = {}) => {
    if (!session?.sessionId) return null;
    try {
      const result = await interactionsAPI.saveInteraction(session.sessionId, type, {
        ...data,
        page: data.page || pageNumber,
        scale: data.scale || scale
      });

      // Normalize possible return shapes
      if (!result) return null;
      if (result._id || result.id) return result;
      if (result.data && (result.data._id || result.data.id)) return result.data;
      if (result.response?.data && (result.response.data._id || result.response.data.id)) return result.response.data;

      if (result.data && typeof result.data === 'object') return result.data;

      return result;
    } catch (error) {
      console.error(`❌ Error saving ${type} interaction:`, error);
      return null;
    }
  }, [session?.sessionId, pageNumber, scale]);

  // Load PDF & highlights and start socket/timer when sessionId becomes available
  useEffect(() => {
    // Load pdf when session present
    if (session) {
      loadPDF();
    }

    // Load highlights whenever sessionId becomes available/changes
    if (session?.sessionId) {
      loadHighlights();
    }

    // Start timer
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }

    // Socket connect only for room sessions with sessionId
    if (session?.type === 'room' && session?.sessionId) {
      socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001', {
        auth: { token: localStorage.getItem('token') }
      });

      socketRef.current.emit('joinSession', {
        sessionId: session.sessionId,
        roomId: session.room?._id
      });
    }

    return () => {
      // ✅ Prevent cleanup from running multiple times
      if (sessionEndedRef.current) return;
      
      // Cleanup
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // End session on unmount only if not already ended
      if (session?.sessionId && !showSummary) {
        handleEndSession(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.sessionId, session?.type, loadPDF, loadHighlights]);

  useEffect(() => {
    if (!numPages) return;

    const timeOnPage = Math.floor((new Date() - pageStartTimeRef.current) / 1000);

    sendInteraction('page_change', {
      prevPage: pageNumber,
      duration: timeOnPage,
    });

    setSessionData(prev => ({
      ...prev,
      pageVisits: {
        ...prev.pageVisits,
        [pageNumber]: (prev.pageVisits[pageNumber] || 0) + 1
      },
      totalTimeOnPage: {
        ...prev.totalTimeOnPage,
        [pageNumber]: (prev.totalTimeOnPage[pageNumber] || 0) + timeOnPage
      }
    }));

    pageStartTimeRef.current = new Date();
  }, [pageNumber, numPages, sendInteraction]);

  useEffect(() => {
    const handleScroll = () => {
      if (!viewerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = viewerRef.current;
      const denom = (scrollHeight - clientHeight);
      const scrollPercent = denom > 0 ? Math.round((scrollTop / denom) * 100) : 0;

      if (Date.now() - handleScroll.lastCall < 5000) return;
      handleScroll.lastCall = Date.now();

      sendInteraction('scroll', { scrollPercent });
    };

    handleScroll.lastCall = 0;

    const viewerElement = viewerRef.current;
    if (viewerElement) {
      viewerElement.addEventListener('scroll', handleScroll);
      return () => {
        viewerElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [sendInteraction]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfError('');
    console.log('✅ PDF loaded successfully:', numPages, 'pages');
  };

  // ENHANCED: Save highlight with position coordinates (robust)
  const handleTextSelection = async () => {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const text = selection.toString().trim();

      if (!text) return;
      setSelectedText(text);

      // Get bounding rectangles for the selected text
      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());

      // Find the page element that corresponds to current pageNumber
      let pageElement = null;
      if (viewerRef.current) {
        pageElement =
          viewerRef.current.querySelector(`.react-pdf__Page[data-page-number="${pageNumber}"]`) ||
          viewerRef.current.querySelector('.react-pdf__Page');
      }

      if (!pageElement || rects.length === 0) {
        console.warn('Could not get selection position');
        return;
      }

      const pageRect = pageElement.getBoundingClientRect();

      // Convert screen coordinates to PDF page coordinates (percentage-based)
      const highlightRects = rects.map(rect => ({
        left: ((rect.left - pageRect.left) / pageRect.width) * 100,
        top: ((rect.top - pageRect.top) / pageRect.height) * 100,
        width: (rect.width / pageRect.width) * 100,
        height: (rect.height / pageRect.height) * 100
      }));

      // Save to backend with position data
      const savedInteraction = await sendInteraction('highlight', {
        text,
        rects: highlightRects,
        color: '#FFEB3B',
        page: pageNumber
      });

      let created = null;
      if (!savedInteraction) {
        console.warn('No created interaction returned from backend');
      } else if (savedInteraction._id || savedInteraction.id) {
        created = savedInteraction;
      } else if (savedInteraction.data && (savedInteraction.data._id || savedInteraction.data.id)) {
        created = savedInteraction.data;
      } else {
        created = savedInteraction;
      }

      if (created) {
        const newHighlight = {
          id: created._id || created.id,
          text,
          page: pageNumber,
          timestamp: created.timestamp || created.createdAt || Date.now(),
          color: created.data?.color || created.color || '#FFEB3B',
          rects: created.data?.rects || highlightRects
        };

        setHighlights(prev => [...prev, newHighlight]);
        setSessionData(prev => ({
          ...prev,
          highlights: [...prev.highlights, newHighlight]
        }));

        console.log('✅ Highlight saved with position:', newHighlight);
      }

      setTimeout(() => selection.removeAllRanges(), 100);
    } catch (error) {
      console.error('❌ Error handling text selection:', error);
    }
  };

  // Delete highlight (robust)
  const deleteHighlight = async (highlightId) => {
    try {
      if (!highlightId) return;
      await interactionsAPI.deleteInteraction(highlightId);

      setHighlights(prev => prev.filter(h => h.id !== highlightId));
      setSessionData(prev => ({
        ...prev,
        highlights: prev.highlights.filter(h => h.id !== highlightId)
      }));

      console.log('✅ Highlight deleted:', highlightId);
    } catch (error) {
      console.error('❌ Error deleting highlight:', error);
      alert('Failed to delete highlight. Please try again.');
    }
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.max(1, Math.min(newPage, numPages || prevPageNumber));
    });
  };

  const changeZoom = (delta) => {
    setScale(prevScale => {
      const next = Math.max(0.5, Math.min(prevScale + delta, 2.5));
      sendInteraction('zoom', { scale: next });
      return next;
    });
  };

  // ---------- FIXED handleEndSession ----------
  const handleEndSession = async (shouldShowSummary = true) => {
    // ✅ FIXED: Prevent double-ending
    if (sessionEndedRef.current) {
      console.log('ℹ️ Session already ended, skipping...');
      
      // ✅ If we're supposed to show summary but it's already ended, just show it
      if (shouldShowSummary && !showSummary) {
        setShowSummary(true);
      } else if (!shouldShowSummary) {
        onEndSession();
      }
      return; // ← IMPORTANT: Make sure this return exists!
    }

    try {
      sessionEndedRef.current = true; // Mark as ended

      const timeOnPage = Math.floor((new Date() - pageStartTimeRef.current) / 1000);
      if (timeOnPage > 0) {
        sendInteraction('page_change', {
          prevPage: pageNumber,
          duration: timeOnPage,
        });
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      console.log(`Sending end session for ID: ${session?.sessionId}`);
      if (session?.sessionId) {
        try {
          await sessionsAPI.endSession(session.sessionId);
          console.log('✅ Backend session ended successfully.');
        } catch (error) {
          // ✅ Handle "already ended" gracefully
          if (error.response?.data?.message === 'Session is already ended') {
            console.log('ℹ️ Session was already ended on server.');
          } else {
            throw error; // Re-throw other errors
          }
        }
      }

      if (shouldShowSummary) {
        try {
          const insightsResponse = await axios.post(
            `${process.env.REACT_APP_API_URL}/ai/generate-insights`,
            { sessionId: session.sessionId },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          setAiInsights(insightsResponse.data?.insights || '');
        } catch (aiError) {
          console.log('AI insights not available or failed:', aiError);
          setAiInsights('');
        }
      }
    } catch (error) {
      console.error('❌ Error ending session or fetching insights:', error);
    }

    if (shouldShowSummary) {
      setShowSummary(true);
    } else {
      onEndSession();
    }
  };
  // ---------- end handleEndSession ----------

  const downloadHighlights = () => {
    const content = highlights.map((h, i) =>
      `${i + 1}. [Page ${h.page}] ${h.text}`
    ).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `highlights-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareReport = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/interactions/share-report`,
        {
          sessionId: session.sessionId,
          aiInsights,
          teacherEmail: session.type === 'room' ? session.room.teacher_id?.email : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Report shared successfully!');
    } catch (error) {
      console.error('Failed to share report:', error.response?.data || error);
      alert('Failed to share report: ' + (error.response?.data?.message || 'Server error.'));
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCompletionPercentage = () => {
    if (!numPages) return 0;
    const uniquePages = Object.keys(sessionData.pageVisits).length;
    return Math.round((uniquePages / numPages) * 100);
  };

  // ✅ FIXED: Close button handler - just close summary and go to dashboard
  const handleCloseSummary = () => {
    setShowSummary(false);
    onEndSession(); // Navigate to dashboard
  };

  if (pdfError) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Study Materials</h2>
          <p className="text-gray-600 mb-6">{pdfError}</p>
          <button
            onClick={onEndSession}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Session Summary</h2>
              <button
                onClick={handleCloseSummary}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700">Duration</p>
                    <p className="text-2xl font-bold text-blue-900">{formatTime(duration)}</p>
                  </div>
                  <Clock className="h-10 w-10 text-blue-600 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6"> 
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">Highlights</p>
                    <p className="text-2xl font-bold text-green-900">{highlights.length}</p>
                  </div>
                  <Highlighter className="h-10 w-10 text-green-600 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700">Pages Viewed</p>
                    <p className="text-2xl font-bold text-purple-900">{Object.keys(sessionData.pageVisits).length}</p>
                  </div>
                  <FileText className="h-10 w-10 text-purple-600 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700">Completion</p>
                    <p className="text-2xl font-bold text-orange-900">{getCompletionPercentage()}%</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-orange-600 opacity-80" />
                </div>
              </div>
            </div>

            {aiInsights && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-lg text-sm mr-3">
                    AI
                  </span>
                  Study Insights
                </h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{aiInsights}</p>
              </div>
            )}

            {highlights.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Your Highlights ({highlights.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {highlights.map((highlight, index) => (
                    <div key={highlight.id || index} className="bg-white rounded-lg p-4 border-l-4 border-yellow-400">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-800">{highlight.text}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            Page {highlight.page} • {new Date(highlight.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteHighlight(highlight.id)}
                          className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete highlight"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              {highlights.length > 0 && (
                <button
                  onClick={downloadHighlights}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center transition-colors"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download Highlights
                </button>
              )}
              {session?.type === 'room' && (
                <button
                  onClick={shareReport}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex items-center justify-center transition-colors"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  Share with Teacher
                </button>
              )}
              <button
                onClick={handleCloseSummary}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Viewer
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">
            {session?.type === 'room' ? session.room?.title : session?.subject}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Clock className="h-4 w-4" />
            <span>{formatTime(duration)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <FileText className="h-4 w-4" />
            <span>{getCompletionPercentage()}% complete</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-300">
            {highlights.length} highlights
          </span>
          <button
            onClick={() => handleEndSession(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            End Session
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div
        className="flex-1 overflow-auto bg-gray-800 p-8"
        ref={viewerRef}
      >
        <div className="max-w-5xl mx-auto">
          {pdfUrl ? (
            <div
              className="relative bg-white shadow-2xl"
              onMouseUp={handleTextSelection}
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => {
                  console.error('PDF load error:', error);
                  setPdfError('Failed to load PDF. The file may be corrupted or unavailable.');
                }}
                loading={
                  <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-white">Loading PDF...</p>
                    </div>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>

              {/* Highlight Overlay Layer */}
              <div
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ mixBlendMode: 'multiply' }}
              >
                {highlights
                  .filter(h => h.page === pageNumber && h.rects && h.rects.length > 0)
                  .map((highlight) => (
                    <React.Fragment key={highlight.id}>
                      {highlight.rects.map((rect, idx) => (
                        <div
                          key={`${highlight.id}-${idx}`}
                          className="absolute transition-opacity hover:opacity-70 cursor-pointer pointer-events-auto"
                          style={{
                            left: `${rect.left}%`,
                            top: `${rect.top}%`,
                            width: `${rect.width}%`,
                            height: `${rect.height}%`,
                            backgroundColor: highlight.color,
                            opacity: 0.4
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete this highlight?\n\n"${highlight.text}"`)) {
                              deleteHighlight(highlight.id);
                            }
                          }}
                          title={`Click to delete: ${highlight.text.substring(0, 50)}...`}
                        />
                      ))}
                    </React.Fragment>
                  ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-screen">
              <div className="text-center text-white">
                <FileText className="h-16 w-16 mx-auto mb-4" />
                <p>Loading study materials...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changeZoom(-0.1)}
            disabled={scale <= 0.5}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium px-3">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => changeZoom(0.1)}
            disabled={scale >= 2.5}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={pageNumber}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!Number.isNaN(page) && page >= 1 && page <= (numPages || 1)) {
                  setPageNumber(page);
                }
              }}
              className="w-16 px-2 py-1 bg-gray-700 text-white text-center rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              min={1}
              max={numPages || 1}
            />
            <span className="text-gray-300">/ {numPages || '...'}</span>
          </div>

          <button
            onClick={() => changePage(1)}
            disabled={pageNumber >= (numPages || 1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Highlighter className="h-5 w-5 text-yellow-400" />
            <span>Select text to highlight</span>
          </div>
          <button
            onClick={downloadHighlights}
            disabled={highlights.length === 0}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Download Highlights"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Recent Highlights Sidebar */}
      {highlights.length > 0 && (
        <div className="fixed right-4 bottom-24 bg-gray-800 text-white rounded-lg shadow-xl p-4 max-w-xs max-h-96 overflow-y-auto">
          <h4 className="text-sm font-semibold mb-2 flex items-center sticky top-0 bg-gray-800 pb-2">
            <Highlighter className="h-4 w-4 mr-2 text-yellow-400" />
            All Highlights ({highlights.length})
          </h4>
          <div className="space-y-2">
            {highlights.slice().reverse().map((highlight, index) => (
              <div key={highlight.id || index} className="text-xs bg-gray-700 rounded p-2 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-2">
                    <p className="line-clamp-2">{highlight.text}</p>
                    <p className="text-gray-400 mt-1">Page {highlight.page}</p>
                  </div>
                  <button
                    onClick={() => deleteHighlight(highlight.id)}
                    className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPDFViewer;
