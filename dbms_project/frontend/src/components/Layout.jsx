import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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

export default function Layout({ user, onLogout, darkMode, setDarkMode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Workouts', path: '/workouts', icon: Dumbbell },
    { name: 'Exercises', path: '/exercises', icon: Search },
    { name: 'Diet Tracker', path: '/diet', icon: Utensils },
    { name: 'AI Coach', path: '/coach', icon: Bot },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'Settings', path: '/profile', icon: Settings },
  ];

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="dark min-h-screen flex flex-col md:flex-row bg-[#0A0A0A] text-[#E5E5E5] font-sans transition-colors duration-300">

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#0A0A0A] border-b border-[#474747]/30 sticky top-0 z-40">
        <StryvonLogo showTagline={false} />
        <div className="flex items-center gap-3">
          {user?.streak_count > 0 && (
            <div className="flex items-center gap-1.5 bg-[#1E1E1E] text-[#D4FF00] border border-[#474747]/50 px-3 py-1 rounded-full text-xs font-bold font-display tracking-wider">
              <Flame size={14} className="fill-[#D4FF00]" />
              <span>{user.streak_count} DAY STREAK</span>
            </div>
          )}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop & Tablet) - Brand Specs */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0A0A0A] border-r border-[#474747]/30 flex flex-col justify-between p-6
        transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col gap-6">
          {/* Logo Badge */}
          <div className="flex items-center justify-between">
            <StryvonLogo showTagline={true} />
            <button 
              className="md:hidden p-1 text-slate-400 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center gap-3 bg-[#1E1E1E] p-3 rounded-2xl border border-[#474747]/40">
            <div className="h-10 w-10 rounded-full bg-[#D4FF00] text-[#0A0A0A] flex items-center justify-center font-black text-base shrink-0 shadow-md">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate text-[#E5E5E5]">{user?.name || 'Alex Mercer'}</p>
              <p className="text-xs text-[#474747] font-semibold truncate uppercase tracking-wider">{user?.goal_type || 'Muscle Gain'}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 pt-2">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all duration-200 group
                  ${isActive 
                    ? 'bg-[#D4FF00] text-[#0A0A0A] shadow-lg shadow-[#D4FF00]/20 font-black' 
                    : 'text-[#E5E5E5]/70 hover:bg-[#1E1E1E] hover:text-white'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={isActive ? 'text-[#0A0A0A] stroke-[2.5]' : 'text-[#474747] group-hover:text-[#D4FF00] transition-colors'} />
                    <span className="font-display tracking-widest text-sm">{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer (Streak, Theme & Logout) */}
        <div className="flex flex-col gap-3 border-t border-[#474747]/30 pt-4">
          {/* Streak Indicator Badge */}
          {user?.streak_count > 0 && (
            <div className="flex items-center justify-between bg-[#1E1E1E] text-[#D4FF00] border border-[#474747]/40 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider font-display">
              <span className="flex items-center gap-2">
                <Flame size={16} className="fill-[#D4FF00]" />
                ACTIVE STREAK
              </span>
              <span>{user.streak_count} DAYS</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center">
            <button
              onClick={handleLogoutClick}
              className="w-full py-3 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 transition-colors text-xs font-bold flex items-center justify-center gap-2 font-display tracking-wider"
              title="Logout"
            >
              <LogOut size={16} />
              <span>EXIT ACCOUNT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen p-6 md:p-10 pb-20 md:pb-10 bg-[#0A0A0A]">
        <Outlet />
      </main>
    </div>
  );
}

