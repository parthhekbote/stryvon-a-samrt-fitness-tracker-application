import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Dumbbell, 
  Search, 
  Utensils, 
  Bot, 
  LineChart, 
  Settings, 
  LogOut, 
  Flame, 
  Menu, 
  X 
} from 'lucide-react';
import StryvonLogo from './StryvonLogo';
import AppAmbientBackground from './AppAmbientBackground';
import { usePrefersReducedMotion, motionVariants, tapScaleProps } from '../utils/animationPresets';

export default function Layout({ user, onLogout, darkMode, setDarkMode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Workouts', path: '/workouts', icon: Dumbbell },
    { name: 'Exercises', path: '/exercises', icon: Search },
    { name: 'Diet Tracker', path: '/diet', icon: Utensils },
    { name: 'AI Coach', path: '/coach', icon: Bot },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'Settings', path: '/profile', icon: Settings },
  ];

  const bottomNavTabs = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Workouts', path: '/workouts', icon: Dumbbell },
    { name: 'Diet', path: '/diet', icon: Utensils },
    { name: 'AI Coach', path: '/coach', icon: Bot },
  ];

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="dark min-h-screen flex flex-col md:flex-row bg-[#0A0A0A] text-[#E5E5E5] font-sans transition-colors duration-300 relative">

      {/* Mobile Top Bar Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0A0A0A] border-b border-[#474747]/30 sticky top-0 z-40">
        <StryvonLogo showTagline={false} />
        <div className="flex items-center gap-2">
          {user?.streak_count > 0 && (
            <motion.div 
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 bg-[#1E1E1E] text-[#D4FF00] border border-[#474747]/50 px-2.5 py-1 rounded-full text-[11px] font-extrabold font-display tracking-wider"
            >
              <Flame size={13} className="fill-[#D4FF00] animate-pulse" />
              <span>{user.streak_count} D STREAK</span>
            </motion.div>
          )}
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
                onClick={() => setMobileMenuOpen(false)}
              >
                {({ isActive }) => (
                  <motion.div
                    whileTap={{ scale: 0.96 }}
                    transition={tapScaleProps.transition}
                    className={`
                      flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all duration-200 group min-h-[44px]
                      ${isActive 
                        ? 'bg-[#D4FF00] text-[#0A0A0A] shadow-lg shadow-[#D4FF00]/20 font-black' 
                        : 'text-[#E5E5E5]/70 hover:bg-[#1E1E1E] hover:text-white'
                      }
                    `}
                  >
                    <item.icon size={18} className={isActive ? 'text-[#0A0A0A] stroke-[2.5]' : 'text-[#474747] group-hover:text-[#D4FF00] transition-colors'} />
                    <span className="font-display tracking-widest text-xs">{item.name}</span>
                  </motion.div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer (Streak & Logout) */}
        <div className="flex flex-col gap-3 border-t border-[#474747]/30 pt-4">
          {user?.streak_count > 0 && (
            <div className="flex items-center justify-between bg-[#1E1E1E] text-[#D4FF00] border border-[#474747]/40 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider font-display">
              <span className="flex items-center gap-2">
                <Flame size={16} className="fill-[#D4FF00] animate-pulse" />
                ACTIVE STREAK
              </span>
              <span>{user.streak_count} DAYS</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleLogoutClick}
            className="w-full py-3 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 transition-colors text-xs font-bold flex items-center justify-center gap-2 font-display tracking-wider cursor-pointer min-h-[44px]"
            title="Logout"
          >
            <LogOut size={16} />
            <span>EXIT ACCOUNT</span>
          </motion.button>
        </div>
      </aside>

      {/* Main Content Area with Route Transition & Ambient Motion Graphic */}
      <main className="flex-1 overflow-y-auto min-h-screen p-4 sm:p-6 md:p-10 pb-24 md:pb-10 bg-[#0A0A0A] relative overflow-hidden">
        <AppAmbientBackground />
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-[#474747]/40 px-2 py-1.5 flex justify-around items-center">
        {bottomNavTabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[44px] min-w-[44px] transition-all
              ${isActive ? 'text-[#D4FF00]' : 'text-[#E5E5E5]/60 hover:text-white'}
            `}
          >
            {({ isActive }) => (
              <motion.div 
                whileTap={{ scale: 0.92 }}
                className="flex flex-col items-center justify-center"
              >
                <tab.icon size={20} className={isActive ? 'text-[#D4FF00] stroke-[2.5]' : 'text-[#474747]'} />
                <span className="text-[10px] font-display font-bold uppercase tracking-wider mt-0.5">{tab.name}</span>
              </motion.div>
            )}
          </NavLink>
        ))}

        {/* Slide-over Menu Drawer Toggle Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[44px] min-w-[44px] transition-all ${mobileMenuOpen ? 'text-[#D4FF00]' : 'text-[#E5E5E5]/60 hover:text-white'}`}
        >
          <Menu size={20} className={mobileMenuOpen ? 'text-[#D4FF00] stroke-[2.5]' : 'text-[#474747]'} />
          <span className="text-[10px] font-display font-bold uppercase tracking-wider mt-0.5">Menu</span>
        </motion.button>
      </nav>
    </div>
  );
}

