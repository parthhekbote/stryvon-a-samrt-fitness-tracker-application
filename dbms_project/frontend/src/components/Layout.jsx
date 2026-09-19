import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Dumbbell, 
  Search, 
  Utensils, 
  Bot, 
  Activity,
  LineChart, 
  User as UserIcon, 
  LogOut, 
  Flame, 
  Menu, 
  X,
  AlertTriangle
} from 'lucide-react';
import StryvonLogo from './StryvonLogo';
import AppAmbientBackground from './AppAmbientBackground';
import StreakCalendarModal from './StreakCalendarModal';
import { usePrefersReducedMotion, motionVariants, tapScaleProps } from '../utils/animationPresets';

export default function Layout({ user, onLogout, apiUrl, token }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleOpenStreakModal = async () => {
    setShowStreakModal(true);
    if (apiUrl && token) {
      try {
        const response = await fetch(`${apiUrl}/workout/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setWorkoutHistory(data.history || []);
        }
      } catch (err) {
        console.error('Failed to fetch workout history for calendar modal:', err);
      }
    }
  };

  const isProfileIncomplete = !user || 
    !user.age || 
    !user.gender || 
    !user.height || 
    !user.weight || 
    !user.goal_type;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Workouts', path: '/workouts', icon: Dumbbell },
    { name: 'Exercises', path: '/exercises', icon: Search },
    { name: 'Diet Tracker', path: '/diet', icon: Utensils },
    { name: 'AI Coach', path: '/coach', icon: Bot },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'Telemetry', path: '/telemetry', icon: Activity },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  const bottomNavTabs = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Workouts', path: '/workouts', icon: Dumbbell },
    { name: 'Diet', path: '/diet', icon: Utensils },
    { name: 'Coach', path: '/coach', icon: Bot },
    { name: 'Telemetry', path: '/telemetry', icon: Activity },
  ];

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  const currentStreakVal = user?.current_streak ?? user?.streak_count ?? 0;
  const longestStreakVal = user?.longest_streak ?? currentStreakVal;

  return (
    <div className="dark min-h-screen flex flex-col md:flex-row bg-[#0A0A0A] text-[#E5E5E5] font-sans transition-colors duration-300 relative">

      {/* Mobile Top Bar Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0A0A0A] border-b border-[#474747]/30 sticky top-0 z-40">
        <StryvonLogo showTagline={false} />
        <div className="flex items-center gap-2">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenStreakModal}
            className="flex items-center gap-1 bg-[#1E1E1E] text-[#D4FF00] border border-[#474747]/50 px-2.5 py-1 rounded-full text-[11px] font-extrabold font-display tracking-wider cursor-pointer hover:border-[#D4FF00]"
            title="Open Streak Calendar"
          >
            <Flame size={13} className="fill-[#D4FF00] animate-pulse" />
            <span>{currentStreakVal} D STREAK</span>
          </motion.button>
        </div>
      </header>

      {/* Slide-over Mobile Backdrop Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer (Desktop & Mobile Slide-over) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#0A0A0A] border-r border-[#474747]/30 flex flex-col justify-between p-6
        transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:w-64
        ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="flex flex-col gap-6">
          {/* Logo Badge & Close Button */}
          <div className="flex items-center justify-between">
            <StryvonLogo showTagline={true} />
            <motion.button 
              whileTap={{ scale: 0.92 }}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={22} />
            </motion.button>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center gap-3 bg-[#1E1E1E] p-3.5 rounded-2xl border border-[#474747]/40">
            <div className="h-10 w-10 rounded-full bg-[#D4FF00] text-[#0A0A0A] flex items-center justify-center font-black text-base shrink-0 shadow-md">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate text-[#E5E5E5]">{user?.name || 'Alex Mercer'}</p>
              <p className="text-[11px] text-[#474747] font-semibold truncate uppercase tracking-wider">{user?.goal_type || 'Muscle Gain'}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 pt-2">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileMenuOpen(false)}
              >
                {({ isActive }) => (
                  <motion.div
                    whileTap={{ scale: 0.96 }}
                    transition={tapScaleProps.transition}
                    className={`
                      flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all duration-200 group min-h-[44px]
                      ${isActive 
                        ? 'bg-[#D4FF00] text-[#0A0A0A] shadow-lg shadow-[#D4FF00]/25 font-black scale-[1.02]' 
                        : 'text-slate-300 hover:bg-[#1E1E1E] hover:text-[#D4FF00]'
                      }
                    `}
                  >
                    <item.icon 
                      size={18} 
                      className={`transition-colors ${
                        isActive 
                          ? 'text-[#0A0A0A] stroke-[2.5]' 
                          : 'text-slate-400 group-hover:text-[#D4FF00]'
                      }`} 
                    />
                    <span className="font-display tracking-widest text-xs">{item.name}</span>
                    {isActive && (
                      <motion.span 
                        layoutId="sidebarActiveDot"
                        className="ml-auto w-2 h-2 rounded-full bg-[#0A0A0A]" 
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer (Streak & Logout) */}
        <div className="flex flex-col gap-3 border-t border-[#474747]/30 pt-4">
          {(() => {
            const isStreakActive = currentStreakVal > 0;
            return (
              <motion.div
                whileTap={{ scale: 0.96 }}
                onClick={handleOpenStreakModal}
                className="flex items-center justify-between bg-[#1E1E1E] border border-[#474747]/40 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider font-display cursor-pointer hover:border-orange-500/50 hover:bg-[#252525] transition-all shadow-md group"
                title="View Streak Calendar"
              >
                <span className="text-[#E5E5E5]/90 font-extrabold group-hover:text-white transition-colors">WORKOUT STREAK</span>
                <div className="flex items-center gap-1.5">
                  <Flame 
                    size={16} 
                    className={isStreakActive ? "text-orange-500 fill-orange-500 animate-pulse" : "text-slate-500 fill-slate-500"} 
                  />
                  <span className={isStreakActive ? "text-orange-500 font-extrabold" : "text-slate-400 font-bold"}>
                    {currentStreakVal}
                  </span>
                </div>
              </motion.div>
            );
          })()}

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleLogoutClick}
            className="w-full py-3 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 transition-colors text-xs font-bold flex items-center justify-center gap-2 font-display tracking-wider cursor-pointer min-h-[44px]"
            title="Logout"
          >
            <LogOut size={16} />
          </motion.button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-h-screen p-4 sm:p-6 md:p-10 pb-24 md:pb-10 bg-[#0A0A0A] relative overflow-hidden">
        <AppAmbientBackground />
        
        {isProfileIncomplete && (
          <div className="mb-6 bg-gradient-to-r from-amber-500/15 via-[#1E1E1E] to-[#1E1E1E] border border-amber-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg relative z-20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
                <AlertTriangle size={18} />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-200">
                <span className="font-bold text-amber-400">Add your preferences for better tracking</span> — your workouts, diet, and AI Coach recommendations depend on this.
              </p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="w-full sm:w-auto px-4 py-2 bg-[#D4FF00] hover:bg-[#b8de00] text-black font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all shrink-0 cursor-pointer min-h-[38px] flex items-center justify-center gap-1.5 shadow-md"
            >
              Complete Profile
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet context={{ onOpenStreakModal: handleOpenStreakModal }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-[#474747]/40 px-2 py-1 flex justify-around items-center">
        {bottomNavTabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            end={tab.path === '/'}
            className="flex flex-col items-center justify-center py-1 px-3.5 rounded-xl min-h-[44px] min-w-[48px] transition-all relative group cursor-pointer"
          >
            {({ isActive }) => (
              <motion.div 
                whileTap={{ scale: 0.92 }}
                className="flex flex-col items-center justify-center"
              >
                <tab.icon 
                  size={21} 
                  className={`transition-all duration-200 ${
                    isActive 
                      ? 'text-[#D4FF00] stroke-[2.5] filter drop-shadow-[0_0_8px_rgba(212,255,0,0.7)] scale-110' 
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`} 
                />
                <span 
                  className={`text-[10px] font-display uppercase tracking-wider mt-0.5 transition-colors ${
                    isActive 
                      ? 'text-[#D4FF00] font-black' 
                      : 'text-slate-400 font-bold group-hover:text-slate-200'
                  }`}
                >
                  {tab.name}
                </span>
                {isActive && (
                  <motion.span 
                    layoutId="activeBottomTabDot"
                    className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] mt-0.5 shadow-[0_0_8px_#D4FF00]" 
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}

        {/* Slide-over Menu Drawer Toggle Button */}
        {(() => {
          const isBottomTab = bottomNavTabs.some(t => t.path === location.pathname);
          const isMenuDrawerActive = mobileMenuOpen || !isBottomTab;
          return (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-3.5 rounded-xl min-h-[44px] min-w-[48px] transition-all relative cursor-pointer"
            >
              <Menu 
                size={21} 
                className={`transition-all duration-200 ${
                  isMenuDrawerActive 
                    ? 'text-[#D4FF00] stroke-[2.5] filter drop-shadow-[0_0_8px_rgba(212,255,0,0.7)] scale-110' 
                    : 'text-slate-400 hover:text-slate-200'
                }`} 
              />
              <span 
                className={`text-[10px] font-display uppercase tracking-wider mt-0.5 transition-colors ${
                  isMenuDrawerActive 
                    ? 'text-[#D4FF00] font-black' 
                    : 'text-slate-400 font-bold'
                }`}
              >
                Menu
              </span>
              {isMenuDrawerActive && (
                <motion.span 
                  layoutId="activeBottomTabDot"
                  className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] mt-0.5 shadow-[0_0_8px_#D4FF00]" 
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })()}
      </nav>

      {/* Shared Single Streak Calendar Modal */}
      <StreakCalendarModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        streakCount={currentStreakVal}
        highestStreak={longestStreakVal}
        history={workoutHistory}
      />
    </div>
  );
}

