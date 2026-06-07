import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Check, Trash2, Settings, ShieldCheck, Flame, Trophy, 
  TrendingUp, AlertTriangle, Calendar, Award, Clock, Laptop, Smartphone, Sparkles, CheckCircle
} from 'lucide-react';
import { notificationEngine, NotificationPreferences, GateNotification } from '../services/notificationEngine';

interface NotificationsTabProps {
  onNotificationsUpdated: () => void;
}

export default function NotificationsTab({ onNotificationsUpdated }: NotificationsTabProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(notificationEngine.getPreferences());
  const [history, setHistory] = useState<GateNotification[]>(notificationEngine.getHistory());
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [prefsSavedMsg, setPrefsSavedMsg] = useState(false);
  
  // Track PWA install prompt event
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check Notification API permission
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    // Listen for PWA installation trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    if (permission === 'granted') {
      notificationEngine.triggerBrowserNotification(
        '🔔 Notifications Enabled',
        'GATEOS is ready to keep you aligned with your AIR < 100 targets!'
      );
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleTogglePref = (key: keyof Omit<NotificationPreferences, 'dailyReminderTime' | 'revisionReminderTime'>) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    notificationEngine.savePreferences(updated);
    triggerPrefsMsg();
  };

  const handleTimeChange = (key: 'dailyReminderTime' | 'revisionReminderTime', value: string) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    notificationEngine.savePreferences(updated);
    triggerPrefsMsg();
  };

  const triggerPrefsMsg = () => {
    setPrefsSavedMsg(true);
    setTimeout(() => setPrefsSavedMsg(false), 2000);
  };

  const handleMarkAsRead = (id: string) => {
    notificationEngine.markAsRead(id);
    setHistory(notificationEngine.getHistory());
    onNotificationsUpdated();
  };

  const handleMarkAllAsRead = () => {
    notificationEngine.markAllAsRead();
    setHistory(notificationEngine.getHistory());
    onNotificationsUpdated();
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all notifications from your local feed history?')) {
      notificationEngine.clearHistory();
      setHistory([]);
      onNotificationsUpdated();
    }
  };

  // Helper to format timestamps relatively
  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Get matching icon based on notification type
  const getNotificationIcon = (type: GateNotification['type']) => {
    switch (type) {
      case 'streak':
        return <Flame className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />;
      case 'milestone':
        return <Trophy className="h-4.5 w-4.5 text-yellow-400" />;
      case 'weeklyReport':
        return <TrendingUp className="h-4.5 w-4.5 text-blue-400" />;
      case 'critical':
        return <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />;
      case 'revision':
        return <Calendar className="h-4.5 w-4.5 text-[#8B7CFF]" />;
      case 'mockReminder':
        return <Award className="h-4.5 w-4.5 text-emerald-400" />;
      case 'todayFocus':
        return <Sparkles className="h-4.5 w-4.5 text-purple-400" />;
      default:
        return <Clock className="h-4.5 w-4.5 text-gray-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8 font-outfit text-xs">
      
      {/* 1. Left Column: Notifications History List (Span 2) */}
      <div className="glass-card p-5 md:p-8 rounded-[20px] lg:col-span-2 space-y-6 flex flex-col h-[600px]">
        <div className="flex justify-between items-center border-b border-white/[0.06] pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#6D5DF6]/10 border border-[#6D5DF6]/20 flex items-center justify-center">
              <Bell className="h-5 w-5 text-[#8B7CFF]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white m-0">Mentor Notification Center</h3>
              <span className="text-[10px] text-secondary">Diagnostic guidance logs and daily action reminders</span>
            </div>
          </div>

          <div className="flex gap-2">
            {history.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 text-gray-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark all read
                </button>
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 rounded-lg border border-transparent bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear feed
                </button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable Alerts Feed */}
        <div className="flex-grow overflow-y-auto space-y-3 pr-1">
          <AnimatePresence mode="popLayout">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-secondary space-y-3">
                <Bell className="h-10 w-10 text-white/10 animate-bounce" />
                <div>
                  <p className="font-bold text-white/60">Your notification feed is empty.</p>
                  <p className="text-[10px] text-[#7D8590] max-w-xs mt-1">
                    When the notification engine detects critical alerts, revision dates, or milestone changes, your personal mentor messages will appear here.
                  </p>
                </div>
              </div>
            ) : (
              history.map((item) => (
                <motion.div
                  key={item.id}
                  layoutId={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => !item.read && handleMarkAsRead(item.id)}
                  className={`p-4 rounded-xl border transition-all relative overflow-hidden flex gap-3.5 cursor-pointer ${
                    item.read 
                      ? 'bg-white/[0.01] border-white/[0.04] opacity-60 hover:opacity-85' 
                      : 'bg-white/[0.03] border-white/[0.08] hover:border-[#6D5DF6]/30 shadow-lg shadow-purple-950/5'
                  }`}
                >
                  {/* Left accent color strip for unread */}
                  {!item.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6D5DF6]" />
                  )}

                  {/* Icon */}
                  <div className="shrink-0 h-8 w-8 bg-white/3 border border-white/5 rounded-lg flex items-center justify-center">
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Message body */}
                  <div className="flex-grow space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white text-xs">{item.title}</span>
                      <span className="text-[9px] text-[#7D8590] font-semibold">{formatTimeAgo(item.timestamp)}</span>
                    </div>
                    <p className="text-[#B4BAC5] text-[11px] leading-relaxed whitespace-pre-line m-0">
                      {item.message}
                    </p>
                  </div>

                  {/* Mark single as read */}
                  {!item.read && (
                    <div className="shrink-0 self-center">
                      <div className="h-2 w-2 bg-[#8B7CFF] rounded-full" />
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Right Column: Settings and Setup */}
      <div className="space-y-6 md:space-y-8">
        
        {/* Onboarding & Mobile / PWA Installer Card */}
        <div className="glass-card p-5 md:p-6 rounded-[20px] space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 m-0 border-b border-white/[0.06] pb-3">
            <Smartphone className="h-4.5 w-4.5 text-[#6D5DF6]" />
            Mobile & Mobile Push Setup
          </h3>

          <div className="space-y-4">
            {/* Native Browser Notification Permission Button */}
            <div className="space-y-2">
              <span className="micro-tag">BROWSER PERMISSIONS</span>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-[#7D8590]" />
                  <div>
                    <span className="font-bold text-white block">Desktop Alerts</span>
                    <span className="text-[9px] text-secondary capitalize">{permissionStatus}</span>
                  </div>
                </div>

                {permissionStatus !== 'granted' ? (
                  <button
                    onClick={handleRequestPermission}
                    className="px-3 py-1.5 bg-[#6D5DF6] hover:bg-[#5b4ee4] text-white font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Enable
                  </button>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                    <ShieldCheck className="h-4 w-4 fill-emerald-500/10" />
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* PWA Mobile install tip */}
            <div className="space-y-2">
              <span className="micro-tag">ANDROID INSTALLABLE EXPERIENCE</span>
              {isInstallable ? (
                <div className="p-3 rounded-xl bg-[#6D5DF6]/10 border border-[#6D5DF6]/20 space-y-2.5">
                  <div>
                    <span className="font-bold text-white block">Install GATEOS App</span>
                    <span className="text-[9px] text-[#B4BAC5]">Install directly to your device home screen.</span>
                  </div>
                  <button
                    onClick={handleInstallPWA}
                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all text-center cursor-pointer shadow shadow-purple-950/20"
                  >
                    Install Now
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white/2 border border-white/5 space-y-1.5">
                  <span className="font-bold text-white block">Standalone App Tip</span>
                  <p className="text-[10px] text-secondary m-0 leading-normal">
                    To add GATEOS to your Android or iOS device home screen, tap the browser's menu (e.g. Chrome <b>⋮</b> or Safari <b>⎋</b>) and select <b>"Add to Home screen"</b> or <b>"Install App"</b>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preferences Switches Panel */}
        <div className="glass-card p-5 md:p-6 rounded-[20px] space-y-5">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 m-0">
              <Settings className="h-4.5 w-4.5 text-[#8B7CFF]" />
              Notification Preferences
            </h3>
            {prefsSavedMsg && (
              <span className="text-emerald-400 font-bold text-[9px] flex items-center gap-1 animate-pulse">
                <CheckCircle className="h-3 w-3" /> Saved!
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Preference switches */}
            {[
              { key: 'dailyGoalReminder' as const, title: 'Daily Goal Reminder', desc: 'Alert if today\'s study hours are below target.' },
              { key: 'revisionReminder' as const, title: 'Revision Spacing Alerts', desc: 'Warn when topics are due for active revision.' },
              { key: 'criticalTopicAlert' as const, title: 'Critical Topic Alerts', desc: 'Alert on low-completion, high-priority syllabus elements.' },
              { key: 'weeklyReport' as const, title: 'Weekly Progress Reports', desc: 'Sunday digests of study hours, ranks, and streaks.' },
              { key: 'mockReminder' as const, title: 'Upcoming Mock Alarms', desc: 'Alert if no mock exams are logged in the last 7 days.' },
              { key: 'airUpdates' as const, title: 'AIR & Readiness Predictor', desc: 'Notify on rank improvements or readiness changes.' },
              { key: 'milestones' as const, title: 'Milestone Achievements', desc: 'Notify when subjects transition to "Strong" status.' },
            ].map((pref) => (
              <div key={pref.key} className="flex justify-between items-start gap-4">
                <div className="space-y-0.5">
                  <span className="font-bold text-white text-xs block">{pref.title}</span>
                  <span className="text-[10px] text-secondary block leading-normal">{pref.desc}</span>
                </div>

                <button
                  onClick={() => handleTogglePref(pref.key)}
                  className={`w-9 h-5 rounded-full shrink-0 relative transition-colors duration-200 focus:outline-none cursor-pointer ${
                    prefs[pref.key] ? 'bg-[#6D5DF6]' : 'bg-white/10'
                  }`}
                >
                  <div 
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all duration-200 ${
                      prefs[pref.key] ? 'left-4.75' : 'left-0.75'
                    }`}
                  />
                </button>
              </div>
            ))}

            {/* Custom Reminder Times */}
            <div className="border-t border-white/[0.06] pt-4 space-y-3">
              <h4 className="font-bold text-white text-xs m-0">Custom Reminder Times</h4>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="micro-tag block mb-1">DAILY REMINDER</label>
                  <input
                    type="time"
                    value={prefs.dailyReminderTime}
                    onChange={(e) => handleTimeChange('dailyReminderTime', e.target.value)}
                    className="w-full p-2 rounded-lg glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="micro-tag block mb-1">REVISION ALERT</label>
                  <input
                    type="time"
                    value={prefs.revisionReminderTime}
                    onChange={(e) => handleTimeChange('revisionReminderTime', e.target.value)}
                    className="w-full p-2 rounded-lg glass-input text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
