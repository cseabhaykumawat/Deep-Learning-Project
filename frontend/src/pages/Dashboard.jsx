import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Brain, Activity, Mouse, Clock, Eye, AlertTriangle, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [metrics, setMetrics] = useState({
    activeTime: 0,
    scrolls: 0,
    clicks: 0,
    mouseMovements: 0,
    idleTime: 0,
    tabCount: 1
  });
  const [driftAnalysis, setDriftAnalysis] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  // Start a new tracking session
  const startSession = useCallback(async () => {
    try {
      const response = await axios.post(`${API}/session/start`, {});
      const newSessionId = response.data.id;
      setSessionId(newSessionId);
      setIsTracking(true);
      return newSessionId;
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }, []);

  // Log tracking event
  const logEvent = useCallback(async (eventType, data = {}) => {
    if (!sessionId) return;
    
    try {
      await axios.post(`${API}/tracking/event`, {
        session_id: sessionId,
        event_type: eventType,
        data: data
      });
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }, [sessionId]);

  // Get drift analysis
  const getDriftAnalysis = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await axios.get(`${API}/tracking/analysis/${sessionId}`);
      setDriftAnalysis(response.data);
      
      // Show alert if drifting
      if (response.data.is_drifting && !showAlert) {
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 5000);
      }
    } catch (error) {
      console.error('Error getting drift analysis:', error);
    }
  }, [sessionId, showAlert]);

  // Initialize tracking on mount
  useEffect(() => {
    startSession();
  }, [startSession]);

  // Track active time
  useEffect(() => {
    if (!isTracking) return;

    const timer = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        activeTime: prev.activeTime + 1
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [isTracking]);

  // Track scroll events
  useEffect(() => {
    if (!isTracking) return;

    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setMetrics(prev => ({
          ...prev,
          scrolls: prev.scrolls + 1
        }));
        logEvent('scroll', { scrollY: window.scrollY });
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isTracking, logEvent]);

  // Track click events
  useEffect(() => {
    if (!isTracking) return;

    const handleClick = (e) => {
      setMetrics(prev => ({
        ...prev,
        clicks: prev.clicks + 1
      }));
      logEvent('click', { x: e.clientX, y: e.clientY });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isTracking, logEvent]);

  // Track mouse movements
  useEffect(() => {
    if (!isTracking) return;

    let moveTimeout;
    let moveCount = 0;
    const handleMouseMove = () => {
      moveCount++;
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        if (moveCount > 5) {
          setMetrics(prev => ({
            ...prev,
            mouseMovements: prev.mouseMovements + 1
          }));
          logEvent('mousemove', { count: moveCount });
        }
        moveCount = 0;
      }, 500);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(moveTimeout);
    };
  }, [isTracking, logEvent]);

  // Track idle time
  useEffect(() => {
    if (!isTracking) return;

    let idleTimer;
    let idleStartTime = Date.now();

    const resetIdle = () => {
      idleStartTime = Date.now();
    };

    const checkIdle = () => {
      const idleDuration = (Date.now() - idleStartTime) / 1000;
      if (idleDuration > 5) {
        setMetrics(prev => ({
          ...prev,
          idleTime: prev.idleTime + 5
        }));
        logEvent('idle', { duration: 5 });
        resetIdle();
      }
    };

    idleTimer = setInterval(checkIdle, 5000);
    document.addEventListener('mousemove', resetIdle);
    document.addEventListener('keypress', resetIdle);

    return () => {
      clearInterval(idleTimer);
      document.removeEventListener('mousemove', resetIdle);
      document.removeEventListener('keypress', resetIdle);
    };
  }, [isTracking, logEvent]);

  // Track tab visibility
  useEffect(() => {
    if (!isTracking) return;

    const handleVisibilityChange = () => {
      logEvent('visibility', { hidden: document.hidden });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTracking, logEvent]);

  // Periodic drift analysis
  useEffect(() => {
    if (!isTracking || !sessionId) return;

    const analysisTimer = setInterval(() => {
      getDriftAnalysis();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(analysisTimer);
  }, [isTracking, sessionId, getDriftAnalysis]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stopTracking = async () => {
    if (sessionId) {
      try {
        await axios.delete(`${API}/session/${sessionId}`);
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }
    setIsTracking(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold">DriftDetect Dashboard</span>
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              data-testid="back-home-button"
            >
              Back to Home
            </Button>
            {isTracking ? (
              <Button 
                onClick={stopTracking} 
                variant="destructive"
                data-testid="stop-tracking-button"
              >
                Stop Tracking
              </Button>
            ) : (
              <Button 
                onClick={startSession} 
                className="bg-blue-500 hover:bg-blue-600"
                data-testid="start-tracking-button"
              >
                Start Tracking
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Drift Alert */}
      {showAlert && driftAnalysis && driftAnalysis.is_drifting && (
        <div className="container mx-auto px-4 py-4" data-testid="drift-alert">
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-red-400 mb-1">Focus Drift Detected!</h3>
              <p className="text-gray-300">{driftAnalysis.recommendation}</p>
              <div className="mt-2 text-sm text-gray-400">
                Confidence: {(driftAnalysis.confidence * 100).toFixed(0)}% | 
                Drift Score: {driftAnalysis.drift_score.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      <main className="container mx-auto px-4 py-8">
        {/* Status Card */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6 mb-8" data-testid="status-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Tracking Status</h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isTracking ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/20 text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              {isTracking ? 'Active' : 'Inactive'}
            </div>
          </div>
          {sessionId && (
            <div className="text-sm text-gray-400">
              Session ID: <span className="font-mono text-gray-300">{sessionId}</span>
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6" data-testid="metric-active-time">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-8 h-8 text-blue-400" />
              <h3 className="text-lg font-semibold">Active Time</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400">{formatTime(metrics.activeTime)}</div>
            <div className="text-sm text-gray-400 mt-1">Total session time</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6" data-testid="metric-scrolls">
            <div className="flex items-center gap-3 mb-3">
              <Activity className="w-8 h-8 text-green-400" />
              <h3 className="text-lg font-semibold">Scroll Events</h3>
            </div>
            <div className="text-3xl font-bold text-green-400">{metrics.scrolls}</div>
            <div className="text-sm text-gray-400 mt-1">Page scrolls detected</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6" data-testid="metric-clicks">
            <div className="flex items-center gap-3 mb-3">
              <Mouse className="w-8 h-8 text-purple-400" />
              <h3 className="text-lg font-semibold">Click Events</h3>
            </div>
            <div className="text-3xl font-bold text-purple-400">{metrics.clicks}</div>
            <div className="text-sm text-gray-400 mt-1">User interactions</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6" data-testid="metric-mouse-movements">
            <div className="flex items-center gap-3 mb-3">
              <Mouse className="w-8 h-8 text-yellow-400" />
              <h3 className="text-lg font-semibold">Mouse Movements</h3>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{metrics.mouseMovements}</div>
            <div className="text-sm text-gray-400 mt-1">Movement bursts tracked</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6" data-testid="metric-idle-time">
            <div className="flex items-center gap-3 mb-3">
              <Eye className="w-8 h-8 text-red-400" />
              <h3 className="text-lg font-semibold">Idle Time</h3>
            </div>
            <div className="text-3xl font-bold text-red-400">{metrics.idleTime}s</div>
            <div className="text-sm text-gray-400 mt-1">Inactivity detected</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6" data-testid="metric-tabs">
            <div className="flex items-center gap-3 mb-3">
              <Activity className="w-8 h-8 text-pink-400" />
              <h3 className="text-lg font-semibold">Browser Tabs</h3>
            </div>
            <div className="text-3xl font-bold text-pink-400">{metrics.tabCount}</div>
            <div className="text-sm text-gray-400 mt-1">Estimated open tabs</div>
          </div>
        </div>

        {/* Drift Analysis */}
        {driftAnalysis && (
          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6" data-testid="drift-analysis-card">
            <h2 className="text-2xl font-bold mb-6">Focus Analysis</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {driftAnalysis.is_drifting ? (
                    <AlertTriangle className="w-12 h-12 text-red-400" />
                  ) : (
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold">
                      {driftAnalysis.is_drifting ? 'Drift Detected' : 'Focused'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Confidence: {(driftAnalysis.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Drift Score</span>
                    <span className="font-mono">{driftAnalysis.drift_score.toFixed(1)}/100</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        driftAnalysis.drift_score > 60 ? 'bg-red-500' : 
                        driftAnalysis.drift_score > 40 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(driftAnalysis.drift_score, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Recommendation</h4>
                <p className="text-gray-300 mb-4">{driftAnalysis.recommendation}</p>
                {Object.keys(driftAnalysis.factors).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-gray-400">Detected Factors:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(driftAnalysis.factors).map(([key, value]) => (
                        value && (
                          <span key={key} className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                            {key.replace(/_/g, ' ')}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isTracking && (
          <div className="mt-8 text-center text-gray-400">
            <p>Click "Start Tracking" to begin monitoring your focus patterns.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
