// =================================================================
// FILE: src/components/student/StudentPDFViewer.js
// ✅ COMPLETE OPTIMIZED VERSION - ALL FEATURES PRESERVED
// ✅ FIXES: Metrics smoothing, performance, proper normalization + syntax fixes
// =================================================================

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo 
} from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import io from 'socket.io-client';
import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Highlighter,
  FileText, Clock, X, AlertTriangle, Activity, Eye, EyeOff, User,
  Palette, Heart, Brain, Coffee, Focus, Frown, Meh, Smile, Smartphone,
  Download, Trash2, Edit3, CheckCircle, Info, Settings, Maximize, Minimize,
  Share2, Save, BarChart2, Shield, Zap, Target, Award, TrendingUp, HelpCircle,
  Lock, RefreshCw, BookOpen, MousePointer2, Layout, Sparkles
} from 'lucide-react';

// Required PDF Worker and Rendering Styles
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

import { sessionsAPI, highlightsAPI } from '../../services/api';
import WebcamMonitor from './WebcamMonitor';
import HighlightPanel from './HighlightPanel';

// ✅ IMPROVEMENT: Configure PDF.js Worker outside component
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// ✅ IMPROVEMENT: Move constants outside component to prevent recreation
const HIGHLIGHT_COLORS = [
  { name: 'yellow', hex: '#FFEB3B', label: 'Important' },
  { name: 'green', hex: '#4CAF50', label: 'Clear' },
  { name: 'blue', hex: '#2196F3', label: 'Reference' },
  { name: 'pink', hex: '#E91E63', label: 'Critical' },
  { name: 'orange', hex: '#FF9800', label: 'Review' },
  { name: 'purple', hex: '#9C27B0', label: 'Complex' }
];

// ✅ IMPROVEMENT: Extract helper functions outside component
const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getEmotionIcon = (emotion) => {
  const e = emotion?.toLowerCase() || 'neutral';
  switch(e) {
    case 'happy': return <Smile className="h-6 w-6 text-green-400" />;
    case 'focused': return <Target className="h-6 w-6 text-indigo-400" />;
    case 'stressed': return <Frown className="h-6 w-6 text-rose-400" />;
    case 'neutral': return <Meh className="h-6 w-6 text-yellow-400" />;
    default: return <User className="h-6 w-6 text-slate-500" />;
  }
};

const StudentPDFViewer = ({ session, onEndSession }) => {
  // ----------------------------------------------------------------
  // 1. STATE MANAGEMENT
  // ----------------------------------------------------------------
  
  // PDF Document Control
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfError, setPdfError] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  
  // Highlighting & UI Management
  const [highlights, setHighlights] = useState([]);
  const [showHighlightPanel, setShowHighlightPanel] = useState(true);
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [isSavingHighlight, setIsSavingHighlight] = useState(false);
  
  // Session Metrics & Timers
  const [showSummary, setShowSummary] = useState(false);
  const [duration, setDuration] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // 🎯 THE BIOMETRIC ANALYTICS ENGINE STATE
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    faceDetected: false,
    lookingAtScreen: true,
    postureScore: 0,
    blinkRate: 15,
    engagementScore: 0,
    attentionScore: 0,
    fatigueLevel: 0,
    stressLevel: 0,
    focusQuality: 0,
    emotionalState: 'neutral',
    hasPhone: false,
    eyeStrain: 0,
    lastUpdate: null
  });

  // ----------------------------------------------------------------
  // 2. REFS
  // ----------------------------------------------------------------
  const socketRef = useRef(null);
  const viewerRef = useRef(null);
  const timerRef = useRef(null);
  const pageStartTimeRef = useRef(new Date());
  const sessionEndedRef = useRef(false);
  const lastMetricsEmit = useRef(Date.now() - 3000); // Fixed: start in past so first emit is immediate
  const metricsBuffer = useRef([]); // ✅ NEW: For smoothing metrics
  const metricsTimeoutRef = useRef(null); // For clearing buffer on inactivity

  // ----------------------------------------------------------------
  // 3. INTERNAL HELPERS
  // ----------------------------------------------------------------

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setIsPdfLoading(false);
    setPdfError(null);
    console.log(`✅ PDF loaded: ${numPages} pages`);
  };

  // ----------------------------------------------------------------
  // 4. METRICS PROCESSING ENGINE (✅ FIXED & OPTIMIZED)
  // ----------------------------------------------------------------
  
  const handleWebcamMetrics = useCallback((metrics) => {
    // console.log('🔵 handleWebcamMetrics called with:', metrics); // Uncomment only if debugging
    if (!metrics) return;
  
    // Helper to find metric value from multiple possible key names
    const getMetricValue = (keys, fallback = 0) => {
      for (const key of keys) {
        if (metrics[key] !== undefined && metrics[key] !== null) {
          return metrics[key];
        }
      }
      return fallback;
    };

    // ✅ Normalize metric values (0.8 -> 80%, but keep 80 as 80%)
    const normalize = (val) => {
      if (val === undefined || val === null || isNaN(val)) return 0;
      const num = parseFloat(val);
      return num <= 1 ? Math.round(num * 100) : Math.round(num);
    };

    // Extract and normalize metrics
    const engagement = normalize(getMetricValue(['engagementScore', 'engagement', 'attentionScore']));
    const focus = normalize(getMetricValue(['focusQuality', 'focus', 'concentration']));
    const fatigue = normalize(getMetricValue(['fatigueLevel', 'fatigue', 'drowsiness']));
    const posture = normalize(getMetricValue(['postureScore', 'posture']));
    const stress = normalize(getMetricValue(['stressLevel', 'stress']));
    const blink = getMetricValue(['blinkRate', 'blink_rate'], 15);
    const isLooking = getMetricValue(['lookingAtScreen', 'looking'], true);
    const phoneDetected = getMetricValue(['hasPhone', 'phoneDetected'], false);

    // ✅ Add to buffer for smoothing (rolling average of last 3 readings)
    metricsBuffer.current.push({ engagement, focus, fatigue, posture, stress });
    if (metricsBuffer.current.length > 3) {
      metricsBuffer.current.shift();
    }

    // Calculate smoothed values
    const smoothed = metricsBuffer.current.reduce((acc, curr) => ({
      engagement: acc.engagement + curr.engagement,
      focus: acc.focus + curr.focus,
      fatigue: acc.fatigue + curr.fatigue,
      posture: acc.posture + curr.posture,
      stress: acc.stress + curr.stress
    }), { engagement: 0, focus: 0, fatigue: 0, posture: 0, stress: 0 });

    const count = metricsBuffer.current.length;

    setRealTimeMetrics(prev => ({
      ...prev,
      faceDetected: Boolean(metrics.faceDetected),
      lookingAtScreen: metrics.faceDetected ? (isLooking !== false) : true,
      postureScore: Math.round(smoothed.posture / count),
      blinkRate: blink,
      engagementScore: Math.round(smoothed.engagement / count),
      focusQuality: Math.round(smoothed.focus / count) || Math.round(smoothed.engagement / count),
      fatigueLevel: Math.round(smoothed.fatigue / count),
      stressLevel: Math.round(smoothed.stress / count),
      emotionalState: getMetricValue(['emotionalState', 'emotion'], 'neutral'),
      hasPhone: Boolean(phoneDetected),
      eyeStrain: normalize(getMetricValue(['eyeStrain'], 0)),
      lastUpdate: Date.now()
    }));

    // Clear previous timeout
    if (metricsTimeoutRef.current) clearTimeout(metricsTimeoutRef.current);
    metricsTimeoutRef.current = setTimeout(() => {
      metricsBuffer.current = [];
    }, 12000);

    // ✅ FIXED: Socket Sync with proper condition
    const now = Date.now();
    const timeSinceLastEmit = now - lastMetricsEmit.current;

    // console.log('🟡 Socket emit check:', { // Uncomment only if debugging
    //   hasSocketRef: !!socketRef.current,
    //   socketConnected,
    //   timeSinceLastEmit,
    //   shouldEmit: timeSinceLastEmit >= 3000,
    //   sessionId: session?.sessionId
    // });

    // ✅ CRITICAL FIX: Proper throttle condition
    if (socketRef.current && socketConnected && session?.sessionId && timeSinceLastEmit >= 3000) {
      // console.log('✅ EMITTING METRICS TO SOCKET'); // Uncomment if needed
      lastMetricsEmit.current = now; // Update BEFORE emit
      socketRef.current.emit('metrics', {
        engagement_score: Math.round(smoothed.engagement / count),
        posture: {
          score: Math.round(smoothed.posture / count),
          detected: Boolean(metrics.faceDetected)
        },
        presence: {
          detected: Boolean(metrics.faceDetected)
        },
        facial: {
          blink_rate: blink,
          emotion: getMetricValue(['emotionalState', 'emotion'], 'neutral')
        },
        focus: {
          quality: Math.round(smoothed.focus / count) || Math.round(smoothed.engagement / count),
          looking_at_screen: isLooking
        },
        health: {
          fatigue: Math.round(smoothed.fatigue / count),
          stress: Math.round(smoothed.stress / count),
          eye_strain: normalize(getMetricValue(['eyeStrain'], 0))
        },
        timestamp: new Date().toISOString()
      });
    }
  }, [socketConnected, session?.sessionId]);

  // ----------------------------------------------------------------
  // 5. HIGHLIGHT ENGINE (✅ OPTIMIZED)
  // ----------------------------------------------------------------
  
  // ✅ NEW: Memoize current page highlights
  const currentPageHighlights = useMemo(() => {
    return highlights.filter(h => h.page_number === pageNumber);
  }, [highlights, pageNumber]);

  const handleTextSelection = useCallback(async () => {
    if (isSavingHighlight) return; // Prevent duplicate saves
    
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const text = selection.toString().trim();
      if (!text || text.length < 2) return;

      const pdfPageElement = document.querySelector(`.react-pdf__Page[data-page-number="${pageNumber}"]`) || 
                             document.querySelector('.react-pdf__Page');
      
      if (!pdfPageElement) return;

      const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
      const pageRect = pdfPageElement.getBoundingClientRect();

      const xCoord = ((selectionRect.left - pageRect.left) / pageRect.width) * 100;
      const yCoord = ((selectionRect.top - pageRect.top) / pageRect.height) * 100;
      const wPercent = (selectionRect.width / pageRect.width) * 100;
      const hPercent = (selectionRect.height / pageRect.height) * 100;

      setIsSavingHighlight(true);

      const response = await highlightsAPI.create({
        session_id: session.sessionId,
        page_number: pageNumber,
        text,
        color: selectedColor,
        position: { x: xCoord, y: yCoord, width: wPercent, height: hPercent }
      });

      const saved = response.data?.data || response.data;
      console.log('✅ Highlight saved:', saved._id);
      setHighlights(prev => [...prev, saved]);

      if (socketRef.current && socketConnected) {
        socketRef.current.emit('highlight-created', { 
          text: text.substring(0, 50), 
          page: saved.page_number,
          page_number: saved.page_number,
          sessionId: session.sessionId
        });
      }

      selection.removeAllRanges();
    } catch (err) {
      console.error('❌ Failed to save highlight:', err);
    } finally {
      setIsSavingHighlight(false);
    }
  }, [isSavingHighlight, pageNumber, session?.sessionId, selectedColor, socketConnected]);

  const handleHighlightDelete = useCallback(async (id) => {
    if (!window.confirm("Confirm delete?")) return;
    try {
      await highlightsAPI.delete(id);
      setHighlights(prev => prev.filter(h => h._id !== id));
      console.log('✅ Highlight deleted');
    } catch (e) {
      console.error("❌ Delete failed:", e);
    }
  }, []);

  const handleHighlightEdit = useCallback(async (highlight) => {
    const note = prompt("Edit note:", highlight.notes || "");
    if (note !== null) {
      try {
        await highlightsAPI.update(highlight._id, { notes: note });
        const res = await highlightsAPI.getBySession(session.sessionId);
        setHighlights(res.data?.data || res.data || []);
        console.log('✅ Highlight updated');
      } catch (e) {
        console.error("❌ Edit failed:", e);
      }
    }
  }, [session?.sessionId]);

  const renderHighlightsOnPage = () => {
    return currentPageHighlights.map((h) => (
      <div
        key={h._id}
        className="absolute rounded-sm mix-blend-multiply opacity-40 hover:opacity-60 transition-all pointer-events-auto"
        style={{
          backgroundColor: HIGHLIGHT_COLORS.find(c => c.name === h.color)?.hex || '#FFEB3B',
          left: `${h.position?.x}%`,
          top: `${h.position?.y}%`,
          width: `${h.position?.width}%`,
          height: `${h.position?.height}%`,
          zIndex: 10
        }}
        title={h.text}
      />
    ));
  };

  // ----------------------------------------------------------------
  // 6. CORE SESSION HANDLERS (✅ OPTIMIZED)
  // ----------------------------------------------------------------
  
  const loadPDF = useCallback(() => {
    if (!session?.documentPath) return;
    try {
      const serverUrl = process.env.REACT_APP_API_URL.replace('/api', '');
      let path = session.documentPath;
      if (path.includes('/uploads/')) path = path.substring(path.indexOf('/uploads/'));
      setPdfUrl({ url: `${serverUrl}${path}`, httpHeaders: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      console.log('✅ PDF URL configured');
    } catch (e) {
      setPdfError('Failed to fetch document stream.');
      console.error('❌ PDF load error:', e);
    }
  }, [session]);

  const initializeSocket = useCallback(() => {
    // Prevent duplicate socket connections
    if (socketRef.current?.connected) {
      console.log('✅ Socket already connected');
      return;
    }
 
    if (!session?.sessionId) {
      console.log('⚠️ No session ID, skipping socket init');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No auth token found');
      return;
    }

    console.log('🔌 Initializing socket connection...');
 
    // Clean up old socket if exists but disconnected
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
 
    const socketUrl = process.env.REACT_APP_BACKEND_URL?.replace('/api', '') || 'http://localhost:5001';
    console.log('🔗 Connecting to:', socketUrl);
 
    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000
    });
 
    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected:', socketRef.current.id);
      setSocketConnected(true);
    
      // JOIN SESSION IMMEDIATELY
      socketRef.current.emit('join-session', { sessionId: session.sessionId });
      console.log('📤 Emitted join-session:', session.sessionId);
    });
 
    socketRef.current.on('session-joined', (data) => {
      console.log('✅ Session joined successfully:', data);
    });

    socketRef.current.on('session-error', (error) => {
      console.error('❌ Session error:', error);
    });
  
    socketRef.current.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setSocketConnected(false);
    
      // Auto-reconnect if not a deliberate disconnect
      if (reason === 'io server disconnect') {
        console.log('🔄 Attempting reconnection...');
        socketRef.current?.connect();
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setSocketConnected(false);
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
      setSocketConnected(true);
      // Re-join session after reconnect
      socketRef.current.emit('join-session', { sessionId: session.sessionId });
    });
  }, [session?.sessionId]);

  const changePage = useCallback((offset) => {
    const now = new Date();
    const spent = Math.floor((now - pageStartTimeRef.current) / 1000);
    setPageNumber(prev => {
      const target = Math.max(1, Math.min(prev + offset, numPages || prev));
      if (socketRef.current && socketConnected && spent > 1) {
        socketRef.current.emit('page-navigation', { page: target, duration: spent });
      }
      pageStartTimeRef.current = now;
      return target;
    });
  }, [numPages, socketConnected]);

  const handleEndSession = useCallback(async () => {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/sessions/${session.sessionId}/end`, {}, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
      });
      console.log('✅ Session ended successfully');
    } catch (e) {
      console.error('❌ Session end error:', e);
    }
    setShowSummary(true);
  }, [session?.sessionId]);

  useEffect(() => {
    if (session) {
      console.log('🎬 Initializing session:', session.sessionId);
      loadPDF();
      initializeSocket();
      highlightsAPI.getBySession(session.sessionId).then(res => {
        const data = res.data?.data || res.data || [];
        setHighlights(data);
        console.log(`✅ Loaded ${data.length} highlights`);
      });
    }
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    return () => {
      console.log('🧹 Cleaning up session');
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
      if (pdfUrl) URL.revokeObjectURL(pdfUrl); // Clean up blob URL
    };
  }, [session, loadPDF, initializeSocket]);

  // ----------------------------------------------------------------
  // 7. RENDERING: SUMMARY VIEW
  // ----------------------------------------------------------------

  if (showSummary) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 selection:bg-indigo-500/30">
        <div className="max-w-5xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] animate-in fade-in zoom-in duration-700">
          
          <div className="w-full md:w-1/3 bg-indigo-700 p-12 text-white flex flex-col justify-between relative overflow-hidden">
             <div className="absolute -top-10 -left-10 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
             <div className="relative z-10">
                <Zap className="text-indigo-300 mb-8" size={60} />
                <h2 className="text-5xl font-black leading-[1.05] mb-6 tracking-tighter uppercase">Work<br/>Synced.</h2>
                <p className="text-indigo-100 font-medium text-lg opacity-80">Metrics and excerpts archived successfully.</p>
             </div>
             <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4 bg-white/10 p-5 rounded-2xl border border-white/10">
                   <Award className="text-indigo-300" size={32} />
                   <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Achievement</p>
                      <p className="font-bold text-lg">Focus Scholar</p>
                   </div>
                </div>
                <button onClick={onEndSession} className="w-full bg-white text-indigo-700 py-6 rounded-[2rem] font-black text-xl hover:bg-indigo-50 transition-all active:scale-95 shadow-xl">
                   CLOSE HUB
                </button>
             </div>
          </div>

          <div className="w-full md:w-2/3 p-16 overflow-y-auto custom-scrollbar bg-slate-50">
             <div className="grid grid-cols-2 gap-8 mb-16">
                <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm">
                   <Clock className="text-indigo-600 mb-4" size={40} />
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Time</h4>
                   <p className="text-4xl font-black text-slate-900 tracking-tighter">{Math.floor(duration/60)}m <span className="text-lg text-slate-400">{duration%60}s</span></p>
                </div>
                <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm">
                   <Highlighter className="text-emerald-500 mb-4" size={40} />
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Highlights</h4>
                   <p className="text-4xl font-black text-slate-900 tracking-tighter">{highlights.length}</p>
                </div>
             </div>

             <div className="space-y-10">
                <div className="flex justify-between items-center border-b border-slate-200 pb-8 uppercase font-black text-slate-800 tracking-widest text-xl">
                   <span>Session Logs</span>
                   <Download size={24} className="text-indigo-600 cursor-pointer" />
                </div>
                <div className="space-y-6">
                   {highlights.map((h, i) => (
                     <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                        <div className="flex justify-between text-[11px] font-black text-slate-400 mb-4 tracking-widest uppercase items-center">
                           <span>Page {h.page_number}</span>
                           <span className="bg-slate-100 px-3 py-1 rounded-full">{h.color}</span>
                        </div>
                        <p className="text-slate-600 text-lg italic leading-relaxed">"{h.text}"</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // 8. RENDERING: MAIN WORKSPACE
  // ----------------------------------------------------------------

  return (
    <div className="h-screen bg-slate-950 flex overflow-hidden font-sans selection:bg-indigo-500/40">
      
      {/* 🟢 LEFT WORKSPACE (60% or 75%) */}
      <div className="flex flex-col relative h-full transition-all duration-700 ease-in-out" style={{ width: showHighlightPanel ? '60%' : '75%' }}>
        
        {/* Navigation Header */}
        <header className="h-20 bg-slate-900/60 backdrop-blur-2xl border-b border-slate-800/50 px-10 flex items-center justify-between z-50">
           <div className="flex items-center gap-10">
              <div className="flex items-center gap-4 bg-black/50 px-6 py-3 rounded-[1.25rem] border border-slate-800 shadow-2xl">
                 <Clock className="h-6 w-6 text-indigo-500" />
                 <span className="text-white font-mono text-xl font-black tracking-[0.1em]">{formatTime(duration)}</span>
              </div>
              {socketConnected && (
                <div className="hidden xl:flex items-center gap-3 px-5 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                   <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                   <span className="text-emerald-500 text-xs font-black uppercase tracking-[0.2em]">Secure Link</span>
                </div>
              )}
           </div>

           <div className="flex items-center gap-6">
              <div className="flex items-center bg-black/40 rounded-2xl p-2 border border-slate-800 shadow-xl">
                 <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="p-3 hover:bg-slate-800 text-white disabled:opacity-20 rounded-xl transition-all active:scale-90">
                    <ChevronLeft size={24} />
                 </button>
                 <div className="px-8 min-w-[120px] text-center border-x border-slate-800">
                    <span className="text-white text-base font-black tracking-tighter">{pageNumber}</span>
                    <span className="text-slate-600 text-xs font-bold mx-3">/</span>
                    <span className="text-slate-500 text-base font-bold tracking-tighter">{numPages || '..'}</span>
                 </div>
                 <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="p-3 hover:bg-slate-800 text-white disabled:opacity-20 rounded-xl transition-all active:scale-90">
                    <ChevronRight size={24} />
                 </button>
              </div>

              <div className="flex items-center bg-black/40 rounded-2xl p-2 border border-slate-800 shadow-xl">
                 <button onClick={() => setScale(s => Math.max(0.4, s-0.1))} className="p-3 hover:bg-slate-800 text-white rounded-xl transition-all"><ZoomOut size={20} /></button>
                 <span className="text-white text-xs font-black min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
                 <button onClick={() => setScale(s => Math.min(3.0, s+0.1))} className="p-3 hover:bg-slate-800 text-white rounded-xl transition-all"><ZoomIn size={20} /></button>
              </div>

              <button 
                onClick={handleEndSession}
                className="bg-rose-600 hover:bg-rose-500 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_15px_35px_rgba(225,29,72,0.35)] active:scale-95"
              >
                END STUDY
              </button>
           </div>
        </header>

        {/* Scrollable PDF Container */}
        <main 
          ref={viewerRef}
          className="flex-1 overflow-auto bg-slate-900 flex justify-center p-20 custom-scrollbar relative overflow-x-hidden"
          onMouseUp={handleTextSelection}
        >
          <div className="relative shadow-[0_60px_120px_rgba(0,0,0,0.85)] transition-all duration-500 origin-top h-fit">
            {pdfUrl && (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center gap-10 mt-48">
                    <div className="w-32 h-32 border-[16px] border-slate-800 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-indigo-400 font-black text-xl uppercase tracking-[0.5em]">Mapping Environment</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="bg-white"
                />
              </Document>
            )}
            
            {renderHighlightsOnPage()}
          </div>
        </main>

        {/* Floating Tool Dock */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-3xl border border-slate-700 shadow-[0_30px_70px_rgba(0,0,0,0.9)] rounded-[3rem] px-12 py-7 flex items-center gap-12 z-50 animate-in slide-in-from-bottom-24 duration-1000">
            <div className="flex items-center gap-8">
               <span className="text-slate-600 text-[11px] font-black uppercase tracking-[0.4em]">Color Hub</span>
               <div className="flex gap-4">
                  {HIGHLIGHT_COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`w-10 h-10 rounded-full border-[6px] transition-all hover:scale-125 ${
                        selectedColor === c.name ? 'border-white shadow-[0_0_25px_rgba(255,255,255,0.5)] scale-110' : 'border-transparent opacity-25'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
               </div>
            </div>
            <div className="w-px h-14 bg-slate-800" />
            <button 
              onClick={() => setShowHighlightPanel(!showHighlightPanel)}
              className={`flex items-center gap-5 text-xs font-black transition-all hover:scale-105 active:scale-95 ${showHighlightPanel ? 'text-indigo-400' : 'text-slate-600'}`}
            >
              <div className={`p-4 rounded-2xl shadow-inner ${showHighlightPanel ? 'bg-indigo-500/10' : 'bg-slate-900'}`}>
                 <Highlighter size={28} />
              </div>
              <div className="text-left">
                 <p className="tracking-[0.2em] uppercase mb-1 opacity-50">Captures</p>
                 <p className="text-2xl font-black tracking-tighter tabular-nums">{highlights.length}</p>
              </div>
            </button>
        </div>
      </div>

      {/* 🟡 MIDDLE: HIGHLIGHT FEED (15%) */}
      {showHighlightPanel && (
        <aside className="w-[15%] bg-slate-900 border-l border-slate-800 flex flex-col z-20 overflow-hidden shadow-2xl">
          <HighlightPanel
            highlights={highlights}
            onHighlightClick={h => setPageNumber(h.page_number)}
            onHighlightDelete={handleHighlightDelete}
            onHighlightEdit={handleHighlightEdit}
            currentPage={pageNumber}
          />
        </aside>
      )}

      {/* 🔵 RIGHT: AI ANALYTICS SIDEBAR (25%) */}
      <aside className="w-[25%] bg-black border-l border-slate-800 flex flex-col z-30 shadow-2xl overflow-y-auto custom-scrollbar">
        {/* Optical Interface */}
        <div className="p-10 bg-slate-900/50 border-b border-slate-800">
           <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 shadow-inner">
                    <Shield size={20} />
                 </div>
                 <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Sense Interface</span>
              </div>
              <div className="flex gap-2">
                 <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-150" />
              </div>
           </div>
           
           <div className="relative group overflow-hidden rounded-[3rem] border-4 border-slate-800 shadow-2xl">
              <WebcamMonitor
                sessionId={session?.sessionId}
                autoStart={true}
                onMetricsUpdate={handleWebcamMetrics}
                className="grayscale group-hover:grayscale-0 transition-all duration-1000 transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
           </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="p-12 space-y-10">
          
          {/* Main Flow State Metric */}
          <div className="p-10 rounded-[3.5rem] bg-gradient-to-br from-indigo-950/90 to-slate-900 border border-indigo-500/20 shadow-2xl relative overflow-hidden group transition-all hover:border-indigo-500/40">
             <div className="absolute -right-12 -top-12 text-indigo-500/5 group-hover:rotate-[45deg] transition-transform duration-[2000ms] pointer-events-none">
                <Zap size={200} />
             </div>
             <div className="flex justify-between items-center mb-8 relative z-10 text-[10px] font-black text-indigo-300 uppercase tracking-[0.5em]">Session Engagement <Activity className="h-7 w-7 text-indigo-400" /></div>
             <div className="flex items-baseline gap-3 relative z-10">
                <p className="text-8xl font-black text-white tracking-tighter tabular-nums">{realTimeMetrics.engagementScore}</p>
                <span className="text-3xl font-bold text-indigo-500/40">%</span>
             </div>
             <div className="mt-12 h-5 bg-black/60 rounded-full overflow-hidden border border-white/5 p-1.5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_30px_rgba(99,102,241,0.7)]" 
                  style={{ width: `${realTimeMetrics.engagementScore}%` }} 
                />
             </div>
          </div>

          {/* Indicators Grid */}
          <div className="grid grid-cols-2 gap-6">
             <div className={`p-8 rounded-[2.5rem] border flex flex-col items-center justify-center transition-all duration-700 ${realTimeMetrics.faceDetected ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                <div className={`p-4 rounded-3xl mb-4 ${realTimeMetrics.faceDetected ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                   {realTimeMetrics.faceDetected ? <User className="text-emerald-500" size={32} /> : <EyeOff className="text-rose-500" size={32} />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${realTimeMetrics.faceDetected ? 'text-emerald-500' : 'text-rose-400'}`}>
                   {realTimeMetrics.faceDetected ? 'Visual Link' : 'Searching'}
                </span>
             </div>
             <div className="p-8 rounded-[2.5rem] border border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center">
                <div className="p-4 bg-slate-800 rounded-3xl mb-4 shadow-inner">
                   {getEmotionIcon(realTimeMetrics.emotionalState)}
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{realTimeMetrics.emotionalState}</span>
             </div>
          </div>

          {/* Caution Logic */}
          {(realTimeMetrics.hasPhone || (realTimeMetrics.faceDetected && !realTimeMetrics.lookingAtScreen)) && (
            <div className="p-8 rounded-[2.5rem] bg-rose-600 border-b-8 border-rose-800 shadow-[0_25px_50px_rgba(225,29,72,0.45)] animate-pulse">
               <div className="flex items-center gap-6">
                  <div className="p-5 bg-rose-700 rounded-[2rem] text-white shadow-2xl">
                     <AlertTriangle size={36} />
                  </div>
                  <div>
                     <p className="text-white font-black text-sm uppercase tracking-widest mb-1 tracking-widest">Caution</p>
                     <p className="text-rose-100 text-[12px] font-bold leading-tight opacity-90">
                        {realTimeMetrics.hasPhone ? 'Phone Restriction Active' : 'Attention drift detected.'}
                     </p>
                  </div>
               </div>
            </div>
          )}

          {/* PERFORMANCE DETAIL BLOCK */}
          <div className="space-y-5">
             <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-[2.5rem] group hover:border-cyan-500/40 transition-all shadow-lg">
                <div className="flex justify-between items-center mb-5">
                   <div className="flex items-center gap-4">
                      <div className="p-4 rounded-2xl bg-slate-800 text-cyan-400 group-hover:bg-cyan-500/10 shadow-inner"><Focus size={22} /></div>
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Concentration</span>
                   </div>
                   <span className="text-lg font-black text-white tabular-nums">{realTimeMetrics.focusQuality}%</span>
                </div>
                <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full bg-cyan-500 transition-all duration-1000 ease-out" style={{ width: `${realTimeMetrics.focusQuality}%` }} />
                </div>
             </div>

             <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-[2.5rem] group hover:border-emerald-500/40 transition-all shadow-lg">
                <div className="flex justify-between items-center mb-5">
                   <div className="flex items-center gap-4">
                      <div className="p-4 rounded-2xl bg-slate-800 text-emerald-400 group-hover:bg-emerald-500/10 shadow-inner"><TrendingUp size={22} /></div>
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Skeleton Status</span>
                   </div>
                   <span className="text-lg font-black text-white tabular-nums">{realTimeMetrics.postureScore}/100</span>
                </div>
                <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${realTimeMetrics.postureScore}%` }} />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-5 text-center">
                <div className="p-8 bg-slate-950/80 rounded-[2.5rem] border border-slate-800 flex flex-col justify-between h-40 shadow-xl group hover:border-orange-500/20">
                   <div className="flex items-center justify-center gap-2 text-orange-500 opacity-40 uppercase text-[10px] font-black tracking-widest"><Coffee size={14} /> Fatigue</div>
                   <div>
                      <p className="text-4xl font-black text-white tabular-nums mb-3">{realTimeMetrics.fatigueLevel}%</p>
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden"><div className={`h-full transition-all duration-700 ${realTimeMetrics.fatigueLevel > 60 ? 'bg-orange-500' : 'bg-slate-700'}`} style={{ width: `${realTimeMetrics.fatigueLevel}%` }} /></div>
                   </div>
                </div>
                <div className="p-8 bg-slate-950/80 rounded-[2.5rem] border border-slate-800 flex flex-col justify-between h-40 shadow-xl group hover:border-rose-500/20">
                   <div className="flex items-center justify-center gap-2 text-rose-500 opacity-40 uppercase text-[10px] font-black tracking-widest"><Heart size={14} /> Stress</div>
                   <div>
                      <p className="text-4xl font-black text-white tabular-nums mb-3">{realTimeMetrics.stressLevel}%</p>
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden"><div className={`h-full transition-all duration-700 ${realTimeMetrics.stressLevel > 60 ? 'bg-rose-500' : 'bg-slate-700'}`} style={{ width: `${realTimeMetrics.stressLevel}%` }} /></div>
                   </div>
                </div>
             </div>
             
             {/* Health Indicator: Ocular Blink Rate */}
             <div className="p-8 bg-slate-950/80 rounded-[3rem] border border-slate-800 flex justify-between items-center group transition-all hover:bg-slate-900 shadow-2xl">
                <div className="flex items-center gap-6">
                   <div className="p-5 rounded-[2rem] bg-sky-500/10 group-hover:bg-sky-500/20 transition-all text-sky-400 shadow-inner">
                      <Eye size={32} />
                   </div>
                   <div>
                      <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em]">Blink Frequency</p>
                      <div className="flex items-center gap-2 mt-2">
                         <div className={`w-2 h-2 rounded-full ${realTimeMetrics.blinkRate >= 12 && realTimeMetrics.blinkRate <= 20 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500'}`} />
                         <p className={`text-[11px] font-bold ${realTimeMetrics.blinkRate >= 12 && realTimeMetrics.blinkRate <= 20 ? 'text-emerald-500/80' : 'text-amber-500/80'} tracking-tight uppercase`}>
                            {realTimeMetrics.blinkRate >= 12 && realTimeMetrics.blinkRate <= 20 ? 'Stable' : 'Dryness Warning'}
                         </p>
                      </div>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-4xl font-black text-white tabular-nums leading-none">{realTimeMetrics.blinkRate}</p>
                   <p className="text-[10px] font-black text-slate-700 uppercase mt-2 tracking-widest">BPM</p>
                </div>
             </div>
          </div>

          {/* Material Consumption Tracker */}
          <div className="p-12 rounded-[3.5rem] bg-slate-900 border border-slate-800 shadow-inner relative overflow-hidden group">
             <div className="flex justify-between items-end mb-8 relative z-10">
                <div>
                   <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Material Depth</span>
                   <p className="text-5xl font-black text-white mt-4 tracking-tighter tabular-nums leading-none">
                     {pageNumber} <span className="text-slate-700 text-2xl font-bold mx-2">/</span> <span className="text-slate-600 text-3xl font-bold">{numPages}</span>
                   </p>
                </div>
                <div className="text-right">
                   <span className="text-indigo-400 font-black text-3xl tabular-nums tracking-tighter leading-none">
                     {numPages ? Math.round((pageNumber/numPages)*100) : 0}
                   </span>
                   <span className="text-indigo-600 font-black text-sm ml-1">%</span>
                </div>
             </div>
             <div className="h-4 bg-black/60 rounded-full overflow-hidden border border-white/5 relative z-10 shadow-inner p-1">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-[1500ms] ease-in-out shadow-[0_0_30px_rgba(79,70,229,0.7)] rounded-full" 
                  style={{ width: `${numPages ? (pageNumber/numPages)*100 : 0}%` }} 
                />
             </div>
             <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-indigo-500 pointer-events-none transform group-hover:scale-125 transition-transform duration-[4000ms]">
                <BookOpen size={160} />
             </div>
          </div>

          {/* AI Neural Advisory Block */}
          {duration > 1500 && (
             <div className="p-10 rounded-[3rem] bg-indigo-600/10 border border-indigo-500/20 flex gap-8 items-start shadow-2xl animate-in slide-in-from-right duration-1000">
                <Brain className="text-indigo-400 shrink-0 mt-2" size={32} />
                <div className="space-y-3">
                   <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em]">AI Advisory</p>
                   <p className="text-sm text-slate-400 leading-relaxed font-medium italic opacity-90 leading-relaxed">
                      "Session duration exceeds threshold. To maintain cognitive efficiency, we suggest a 5-minute eye reset."
                   </p>
                </div>
             </div>
          )}

        </div>

        {/* Global Privacy/Security Footer */}
        <footer className="mt-auto p-12 border-t border-slate-900 bg-black/95 flex flex-col items-center">
           <div className="flex items-center gap-4 text-slate-700 mb-4 transition-all hover:text-indigo-500">
              <Lock size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Encrypted Sense Stream</span>
           </div>
           <p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest text-center leading-relaxed max-w-xs">
             Biometric monitoring is local. Encrypted metrics only shared with authorized educator.
           </p>
        </footer>
      </aside>
    </div>
  );
};

export default React.memo(StudentPDFViewer);