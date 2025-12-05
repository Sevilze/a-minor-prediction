import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon';
import { BackendStatus } from '../../types';
import { AuthUser } from '../../services/auth';

interface HeaderProps {
  backendStatus: BackendStatus;
  user: AuthUser | null;
  authChecked: boolean;
  onMenuClick: () => void;
  onLogin: () => void;
  onLogout: () => void;
  lastLatency?: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  backendStatus,
  user,
  authChecked,
  onMenuClick,
  onLogin,
  onLogout,
  lastLatency,
}) => {
  const [showAbout, setShowAbout] = useState(false);
  const [showApiStatus, setShowApiStatus] = useState(false);
  const aboutRef = useRef<HTMLDivElement>(null);
  const apiStatusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aboutRef.current && !aboutRef.current.contains(event.target as Node)) {
        setShowAbout(false);
      }
      if (apiStatusRef.current && !apiStatusRef.current.contains(event.target as Node)) {
        setShowApiStatus(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLatencyColor = (latency: number | null | undefined) => {
    if (latency === null || latency === undefined) return 'text-white/50';
    if (latency < 100) return 'text-green-400';
    if (latency < 300) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <header className="flex flex-shrink-0 w-full items-center justify-between border-b border-white/10 px-4 md:px-6 py-3 bg-background-dark z-20 relative">
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 -ml-2 text-white/80 hover:text-white"
        >
          <Icon name="menu" className="text-2xl" />
        </button>

        <div className="size-8 text-primary bg-primary/10 p-1.5 rounded-lg flex-shrink-0">
          <svg
            fill="none"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <path
              d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z"
              fill="currentColor"
            />
            <path
              clipRule="evenodd"
              d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z"
              fill="currentColor"
              fillRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] font-sans">
          ChordAI
        </h2>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div ref={apiStatusRef} className="relative">
          <button
            onClick={() => setShowApiStatus(!showApiStatus)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5 ${
              showApiStatus ? 'bg-white/5' : ''
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'connected'
                  ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                  : backendStatus === 'checking'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
              }`}
            />
            <span className="text-xs text-white/60 hidden sm:inline font-sans">
              {backendStatus === 'connected'
                ? 'Connected'
                : backendStatus === 'checking'
                ? 'Connecting...'
                : 'Offline'}
            </span>
            {backendStatus === 'connected' && lastLatency !== null && lastLatency !== undefined && (
              <span className={`text-xs font-mono hidden sm:inline ${getLatencyColor(lastLatency)}`}>
                {lastLatency}ms
              </span>
            )}
            <Icon name="expand_more" className="text-sm text-white/40" />
          </button>

          {showApiStatus && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-background-dark border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white/60 uppercase tracking-wider font-sans">API Status</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        backendStatus === 'connected' ? 'bg-green-500' : backendStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    />
                    <span className={`text-xs font-medium font-sans ${
                      backendStatus === 'connected' ? 'text-green-400' : backendStatus === 'checking' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {backendStatus === 'connected' ? 'Online' : backendStatus === 'checking' ? 'Checking' : 'Offline'}
                    </span>
                  </div>
                </div>
                
                {backendStatus === 'connected' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50 font-sans">Last Latency</span>
                      <span className={`font-mono font-medium ${getLatencyColor(lastLatency)}`}>
                        {lastLatency !== null && lastLatency !== undefined ? `${lastLatency}ms` : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {backendStatus === 'disconnected' && (
                <div className="p-3 bg-red-500/5">
                  <p className="text-xs text-red-400/80 mb-2 font-sans">Backend server is offline. Start it with:</p>
                  <code className="block bg-black/40 rounded px-2 py-1.5 text-[10px] text-white/70 font-mono break-all">
                    cd backend && python run_http2.py
                  </code>
                </div>
              )}
            </div>
          )}
        </div>

        <div ref={aboutRef} className="relative">
          <button
            onClick={() => setShowAbout(!showAbout)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors font-sans ${
              showAbout ? 'bg-white/5 text-white' : ''
            }`}
          >
            <Icon name="info" className="text-lg" />
            <span className="hidden sm:inline">About</span>
          </button>

          {showAbout && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-background-dark border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 text-primary bg-primary/10 p-2 rounded-lg flex-shrink-0">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor" />
                      <path clipRule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fillRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold font-sans">ChordAI</h3>
                    <p className="text-xs text-white/50 font-sans">AI-Powered Chord Recognition</p>
                  </div>
                </div>
                <p className="text-xs text-white/60 leading-relaxed font-sans">
                  Analyze chord progressions from audio files using deep learning. Upload your music and get instant chord predictions with timestamps.
                </p>
              </div>
              
              <div className="p-3 space-y-2">
                <a
                  href="https://github.com/Sevilze/a-minor-prediction"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <Icon name="code" className="text-lg text-white/40 group-hover:text-white/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium font-sans">Source Code</p>
                    <p className="text-xs text-white/40 truncate font-sans">github.com/Sevilze/a-minor-prediction</p>
                  </div>
                  <Icon name="open_in_new" className="text-sm text-white/30" />
                </a>
                
                <div className="flex items-center gap-3 px-3 py-2 text-xs text-white/40 font-sans">
                  <Icon name="favorite" className="text-sm text-red-400/60" />
                  <span>Built with React, TypeScript & PyTorch</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            {user.picture_url ? (
              <img
                src={user.picture_url}
                alt={user.name}
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary font-sans">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-white/80 hidden md:inline font-sans">
              {user.name}
            </span>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              title="Logout"
            >
              <Icon name="logout" className="text-lg" />
            </button>
          </div>
        ) : authChecked && backendStatus === 'connected' ? (
          <button
            onClick={onLogin}
            className="flex items-center gap-2 rounded-lg bg-primary hover:bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors font-sans"
          >
            <Icon name="login" className="text-lg" />
            Sign In
          </button>
        ) : null}
      </div>
    </header>
  );
};
