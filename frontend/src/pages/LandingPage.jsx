import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Brain, Activity, Zap, Target } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    scrolls: 0,
    activeTime: 0
  });

  useEffect(() => {
    let startTime = Date.now();
    let scrollCount = 0;

    const handleScroll = () => {
      scrollCount++;
      setStats(prev => ({ ...prev, scrolls: scrollCount }));
    };

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setStats(prev => ({ ...prev, activeTime: elapsed }));
    }, 1000);

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold">DriftDetect</span>
          </div>
          <Button 
            onClick={() => navigate('/dashboard')} 
            variant="outline" 
            className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
            data-testid="nav-dashboard-button"
          >
            View Dashboard
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="inline-block mb-4 px-4 py-2 bg-blue-500/20 rounded-full text-blue-300 text-sm font-medium">
          Powered by LSTM Neural Networks
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent" data-testid="hero-title">
          Intelligent Focus
          <br />
          Drift Detection
        </h1>
        <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
          Real-time AI-powered monitoring that tracks your behavior patterns and adapts the interface to keep you focused and productive.
        </p>
        <div className="flex gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={() => navigate('/dashboard')} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 text-lg"
            data-testid="view-dashboard-button"
          >
            View Dashboard
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-6 text-lg"
            data-testid="learn-more-button"
          >
            Learn More
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-gray-800/50 backdrop-blur p-6 rounded-xl border border-gray-700" data-testid="feature-lstm">
            <Brain className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">LSTM Architecture</h3>
            <p className="text-gray-400">
              Advanced neural network with 64→32 LSTM units trained on 5,000+ real user sessions.
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur p-6 rounded-xl border border-gray-700" data-testid="feature-tracking">
            <Activity className="w-12 h-12 text-green-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Real-Time Tracking</h3>
            <p className="text-gray-400">
              Monitors scrolls, clicks, mouse movements, idle time, and tab visibility every 5 seconds.
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur p-6 rounded-xl border border-gray-700" data-testid="feature-adaptation">
            <Zap className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Dynamic Adaptation</h3>
            <p className="text-gray-400">
              UI automatically adjusts when drift detected - alerts, highlights, and recommendations.
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur p-6 rounded-xl border border-gray-700" data-testid="feature-accuracy">
            <Target className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">87% Accuracy</h3>
            <p className="text-gray-400">
              Proven performance on test data with continuous learning from your patterns.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-12" data-testid="how-it-works-title">How the LSTM Model Works</h2>
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-8 rounded-xl border border-blue-500/30">
            <h3 className="text-2xl font-bold mb-6 text-blue-300">Input Features</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-blue-400">•</span>
                <div>
                  <strong>usage_seconds</strong> - Active time on page
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400">•</span>
                <div>
                  <strong>tabs_open</strong> - Number of browser tabs
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400">•</span>
                <div>
                  <strong>cpu_usage</strong> - System resource utilization
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400">•</span>
                <div>
                  <strong>scroll_events</strong> - Scroll interaction count
                </div>
              </li>
            </ul>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 rounded-xl border border-purple-500/30">
            <h3 className="text-2xl font-bold mb-6 text-purple-300">Model Architecture</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-purple-400">•</span>
                <div>
                  <strong>LSTM Layer 1:</strong> 64 units, tanh activation
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400">•</span>
                <div>
                  <strong>Dropout:</strong> 20% regularization
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400">•</span>
                <div>
                  <strong>LSTM Layer 2:</strong> 32 units, tanh activation
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400">•</span>
                <div>
                  <strong>Dense Output:</strong> Sigmoid for probability
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Focus Monitor Widget */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto bg-gray-800/50 backdrop-blur p-8 rounded-xl border border-gray-700 text-center" data-testid="focus-monitor-widget">
          <h3 className="text-2xl font-bold mb-4">Focus Monitor</h3>
          <div className="text-gray-400 mb-2">
            Active Time: <span className="text-blue-400 font-mono">{stats.activeTime}s</span> | 
            Scrolls: <span className="text-green-400 font-mono">{stats.scrolls}</span>
          </div>
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="mt-4 bg-blue-500 hover:bg-blue-600"
            data-testid="focus-monitor-start-button"
          >
            Start Monitoring
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-500 border-t border-gray-800">
        <p>Powered by LSTM Neural Networks • Real-time Focus Detection</p>
      </footer>
    </div>
  );
};

export default LandingPage;