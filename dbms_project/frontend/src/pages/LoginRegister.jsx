import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StryvonLogo from '../components/StryvonLogo';
import StryvonMotionGraphic from '../components/StryvonMotionGraphic';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from '../config/firebase';
import { usePrefersReducedMotion } from '../utils/animationPresets';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Flame, 
  Zap, 
  Trophy,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function LoginRegister({ onLogin, apiUrl }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [welcomeBanner, setWelcomeBanner] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goalType, setGoalType] = useState('Maintain');

  // Goal options for registration selector
  const fitnessGoals = [
    { id: 'Fat Loss', label: 'Fat Loss' },
    { id: 'Maintain', label: 'Maintain & Tone' },
    { id: 'Muscle Gain', label: 'Muscle Gain' },
    { id: 'Endurance', label: 'Endurance Training' }
  ];

  // Process Google Sign-In redirect result on page load if popup COOP was bypassed
  useEffect(() => {
    let isSubscribed = true;
    async function checkRedirect() {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && isSubscribed) {
          setGoogleLoading(true);
          const idToken = await result.user.getIdToken();
          const response = await fetch(`${apiUrl}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });
          const data = await response.json().catch(() => ({ message: 'Invalid response from server.' }));
          if (response.ok && isSubscribed) {
            if (data.isNewUser) {
              setWelcomeBanner(`Welcome to STRYVON, ${data.user?.name || 'Athlete'}! Your account has been created.`);
            }
            onLogin(data.token, data.user, data.isNewUser);
            navigate('/', { replace: true });
          } else if (isSubscribed) {
            setError(data.message || 'Google sign-in backend verification failed.');
          }
        }
      } catch (err) {
        console.error('Redirect sign-in error:', err);
        if (isSubscribed) {
          setError('Google sign-in verification error: ' + (err.message || 'Failed to complete redirect'));
        }
      } finally {
        if (isSubscribed) {
          setGoogleLoading(false);
        }
      }
    }
    checkRedirect();
    return () => {
      isSubscribed = false;
    };
  }, [apiUrl, onLogin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    setLoading(true);

    const endpoint = isLogin ? `${apiUrl}/auth/login` : `${apiUrl}/auth/register`;
    const payload = isLogin 
      ? { email, password } 
      : { name, email, password, age, gender, height, weight, goal_type: goalType };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json().catch(() => ({ message: 'Invalid response from server.' }));
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      onLogin(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        setError(`Network error: Unable to connect to authentication server at ${apiUrl}. Please ensure backend server is active.`);
      } else {
        setError(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const response = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json().catch(() => ({ message: 'Invalid response from server.' }));
      console.log('Google auth response from backend:', response.status, data);

      if (!response.ok) {
        throw new Error(data.message || 'Google sign-in backend verification failed.');
      }

      if (data.isNewUser) {
        setWelcomeBanner(`Welcome to STRYVON, ${data.user?.name || 'Athlete'}! Your account has been created.`);
      }
      onLogin(data.token, data.user, data.isNewUser);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google Sign-In popup was closed before completing authentication.');
      } else if (err.code === 'auth/popup-blocked' || err.message?.includes('Cross-Origin-Opener-Policy') || err.code === 'auth/cancelled-popup-request') {
        console.warn('Popup blocked or COOP restricted. Falling back to signInWithRedirect...');
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          setError('Google Sign-In redirect failed: ' + redirectErr.message);
        }
      } else if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        setError(`Network error: Unable to connect to backend server at ${apiUrl}. Please verify backend status.`);
      } else {
        setError(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0A0A0A] text-[#E5E5E5] font-sans overflow-hidden relative">

      {/* LEFT COLUMN: Motivating Cinematic Hero Panel with Bodybuilder Background & Ambient Motion */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 relative overflow-hidden bg-[#0A0A0A]">
        
        {/* Layer 1: Organic Deep Background Smudge Glow Blobs (Drifting Slow Loop) */}
        <motion.div 
          animate={
            prefersReducedMotion 
              ? {} 
              : { 
                  x: [0, 35, -25, 0],
                  y: [0, -45, 25, 0],
                  scale: [1, 1.12, 0.92, 1],
                  opacity: [0.15, 0.25, 0.15]
                }
          }
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-[#D4FF00]/15 rounded-full blur-[140px] pointer-events-none z-0" 
        />

        {/* Layer 2A: Orb behind Top-Right Floating Motivation Engine Card */}
        <motion.div 
          animate={
            prefersReducedMotion
              ? {}
              : {
                  x: [0, -30, 20, 0],
                  y: [0, 25, -20, 0],
                  scale: [1, 1.2, 0.95, 1],
                  opacity: [0.12, 0.22, 0.12]
                }
          }
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-16 right-8 w-72 h-72 bg-[#D4FF00]/20 rounded-full blur-[100px] pointer-events-none z-0"
        />

        {/* Layer 2B: Orb behind Bottom-Left Floating Community Records Card */}
        <motion.div 
          animate={
            prefersReducedMotion 
              ? {} 
              : { 
                  x: [0, 25, -20, 0],
                  y: [0, -30, 15, 0],
                  scale: [0.9, 1.15, 1],
                  opacity: [0.1, 0.2, 0.1]
                }
          }
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-10 right-10 w-96 h-96 bg-[#D4FF00]/12 rounded-full blur-[160px] pointer-events-none z-0" 
        />

        {/* Cinematic Bodybuilder Image with Soft Smudge Feather Mask */}
        <motion.div 
          animate={prefersReducedMotion ? {} : { scale: [1, 1.03, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-cover bg-center z-0 opacity-60 pointer-events-none"
          style={{ 
            backgroundImage: `url('/assets/hero_bodybuilder.png')`,
            WebkitMaskImage: 'radial-gradient(circle at 45% 50%, rgba(0, 0, 0, 1) 35%, rgba(0, 0, 0, 0) 85%), linear-gradient(to right, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
            maskImage: 'radial-gradient(circle at 45% 50%, rgba(0, 0, 0, 1) 35%, rgba(0, 0, 0, 0) 85%), linear-gradient(to right, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
            WebkitMaskComposite: 'destination-in',
            maskComposite: 'intersect'
          }}
        />

        {/* Layer 3: Ambient Moving Light Rays & Atmosphere Overlay on Left Photo */}
        <motion.div 
          animate={
            prefersReducedMotion 
              ? {} 
              : { 
                  x: ['-15%', '15%', '-15%'], 
                  y: ['-10%', '10%', '-10%'],
                  opacity: [0.12, 0.28, 0.12]
                }
          }
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#D4FF00]/12 via-transparent to-transparent pointer-events-none z-[2] mix-blend-screen"
        />

        {/* Dark Vignette Atmospheric Smudge Fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/70 z-[1] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/60 via-transparent to-[#0A0A0A] z-[1] pointer-events-none" />

        {/* Animated Floating Telemetry Card 1 - Live Motivation Ticker */}
        <motion.div 
          initial={{ y: -30, opacity: 0 }}
          animate={
            prefersReducedMotion
              ? { opacity: 1, y: 0 }
              : { y: [0, -12, 0], opacity: 1 }
          }
          transition={{ y: { duration: 6, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.8 } }}
          className="absolute top-24 right-12 bg-[#1E1E1E]/90 backdrop-blur-xl border border-[#D4FF00]/40 p-4 rounded-2xl shadow-2xl shadow-black/80 flex items-center gap-3.5 z-20"
        >
          <div className="h-10 w-10 bg-[#D4FF00] text-black rounded-xl flex items-center justify-center font-black shadow-md shadow-[#D4FF00]/30">
            <Flame size={20} className="fill-black" />
          </div>
          <div>
            <div className="text-[10px] font-black text-[#D4FF00] uppercase tracking-widest flex items-center gap-1.5 font-display">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF00] animate-ping" />
              MOTIVATION ENGINE
            </div>
            <div className="text-xs font-extrabold text-[#E5E5E5]">Discipline Beats Motivation</div>
          </div>
        </motion.div>

        {/* Animated Floating Telemetry Card 2 - Heavy Lift Stat Badge */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={
            prefersReducedMotion
              ? { opacity: 1, y: 0 }
              : { y: [0, 14, 0], opacity: 1 }
          }
          transition={{ y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }, opacity: { duration: 0.8 } }}
          className="absolute bottom-32 left-12 bg-[#1E1E1E]/90 backdrop-blur-xl border border-[#474747]/50 p-4 rounded-2xl shadow-2xl shadow-black/80 flex items-center gap-3.5 z-20"
        >
          <div className="h-10 w-10 bg-[#D4FF00]/20 text-[#D4FF00] rounded-xl flex items-center justify-center font-black">
            <Trophy size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black text-[#D4FF00] uppercase tracking-widest font-display">COMMUNITY RECORDS</div>
            <div className="text-xs font-extrabold text-[#E5E5E5]">10k+ Personal Bests Logged Today</div>
          </div>
        </motion.div>

        {/* Brand Header Logo Component */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="z-10"
        >
          <StryvonLogo showTagline={true} />
        </motion.div>

        {/* DeepSeek-Style Ambient SVG Motion Mesh (behind headline) */}
        <div className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none opacity-85">
          <StryvonMotionGraphic />
        </div>

        {/* Center Display Typography & Motivational Tagline */}
        <div className="my-auto z-10 max-w-xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] text-xs font-black uppercase tracking-widest font-display"
          >
            <Zap size={14} className="fill-[#D4FF00]" />
            UNLEASH YOUR PEAK POTENTIAL
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="font-display text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] uppercase text-white drop-shadow-2xl"
          >
            FORGE<br />
            <span className="text-[#D4FF00] drop-shadow-[0_0_25px_rgba(212,255,0,0.5)]">YOUR</span><br />
            LEGACY.
          </motion.h1>
        </div>

        {/* Bottom Stats & Motivational Quote Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex flex-col gap-6 pt-6 border-t border-[#474747]/30 z-10"
        >
          {/* Animated Motivational Quote Ticker */}
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#D4FF00] tracking-wide uppercase font-display">
            <Sparkles size={14} />
            <span>"PERFORM. PUSH. PROGRESS."</span>
          </div>

          <div className="flex gap-12 font-display">
            <div>
              <span className="text-4xl font-black text-[#D4FF00] block">2.4M+</span>
              <span className="text-[10px] text-[#474747] font-extrabold uppercase tracking-widest">Lifts Logged</span>
            </div>
            <div>
              <span className="text-4xl font-black text-[#D4FF00] block">98.4%</span>
              <span className="text-[10px] text-[#474747] font-extrabold uppercase tracking-widest">Goal Achievement</span>
            </div>
            <div>
              <span className="text-4xl font-black text-[#D4FF00] block">100%</span>
              <span className="text-[10px] text-[#474747] font-extrabold uppercase tracking-widest">AI Telemetry</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* RIGHT COLUMN: Authentication Form Container with DeepSeek-style Ambient Glow Drifts */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-16 overflow-y-auto bg-[#0A0A0A] relative overflow-hidden">
        
        {/* Layer 1 (Deepest): Slow-moving ambient glow/gradient blob behind sign-in form */}
        <div 
          className="ambient-glow-orb-1 absolute top-1/4 right-1/4 w-72 sm:w-[28rem] h-72 sm:h-[28rem] bg-[#D4FF00]/15 rounded-full blur-[80px] sm:blur-[130px] pointer-events-none z-0" 
        />

        {/* Layer 2C: Faint Ambient Orb at Bottom-Right of Form Container */}
        <div 
          className="ambient-glow-orb-2 absolute bottom-10 right-10 w-60 h-60 bg-[#D4FF00]/10 rounded-full blur-[70px] sm:blur-[110px] pointer-events-none z-0" 
        />

        {/* Mobile Ambient SVG Motion Mesh — floating neon energy ring background for mobile phones */}
        <div className="lg:hidden absolute inset-0 flex items-center justify-center z-0 pointer-events-none opacity-40 overflow-hidden scale-75">
          <StryvonMotionGraphic />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-6 sm:space-y-7 my-auto z-10"
        >

          {/* Mobile Header Branding Logo (visible on screen widths < lg) */}
          <div className="lg:hidden flex items-center justify-between pb-2 border-b border-[#474747]/20">
            <StryvonLogo showTagline={false} />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] text-[10px] font-black uppercase tracking-widest font-display">
              <Zap size={12} className="fill-[#D4FF00]" />
              AI COACH
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex justify-end">
            <div className="flex bg-[#1E1E1E] p-1.5 rounded-2xl border border-[#474747]/40 relative">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`py-2.5 px-5 sm:px-6 rounded-xl text-xs font-black tracking-wider uppercase transition-all duration-300 relative z-10 font-display min-h-[44px] flex items-center justify-center ${
                  isLogin 
                    ? 'bg-[#D4FF00] text-[#0A0A0A] shadow-lg shadow-[#D4FF00]/25' 
                    : 'text-[#474747] hover:text-white'
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`py-2.5 px-5 sm:px-6 rounded-xl text-xs font-black tracking-wider uppercase transition-all duration-300 relative z-10 font-display min-h-[44px] flex items-center justify-center ${
                  !isLogin 
                    ? 'bg-[#D4FF00] text-[#0A0A0A] shadow-lg shadow-[#D4FF00]/25' 
                    : 'text-[#474747] hover:text-white'
                }`}
              >
                REGISTER
              </button>
            </div>
          </div>

          {/* Header Title */}
          <div>
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight uppercase text-white">
              {isLogin ? 'WELCOME BACK.' : 'JOIN STRYVON.'}
            </h2>
            <p className="text-xs text-[#E5E5E5]/70 mt-1.5 font-semibold">
              {isLogin 
                ? 'Sign in to access your workout telemetry & STRYVON AI Coach.' 
                : 'Fill in your details to start your custom high-performance program.'}
            </p>
          </div>

          {/* Welcome Banner for New Users */}
          <AnimatePresence>
            {welcomeBanner && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] p-4 rounded-xl text-xs font-bold"
              >
                <Sparkles size={18} className="shrink-0 text-[#D4FF00]" />
                <span>{welcomeBanner}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs font-semibold"
              >
                <ShieldAlert size={18} className="shrink-0 text-rose-500" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div 
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: isLogin ? -15 : 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 15 : -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Registration Extra Field: Full Name */}
                {!isLogin && (
                  <div>
                    <label className="text-[11px] font-extrabold text-[#474747] block mb-1.5 uppercase tracking-widest font-display">
                      FULL NAME
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Alex Morgan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#474747]/50 rounded-xl py-3 px-4 text-sm text-[#E5E5E5] placeholder:text-[#474747] focus:outline-none focus:border-[#D4FF00] transition-all focus:ring-1 focus:ring-[#D4FF00] min-h-[44px]"
                    />
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label className="text-[11px] font-extrabold text-[#474747] block mb-1.5 uppercase tracking-widest font-display">
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1E1E1E] border border-[#474747]/50 rounded-xl py-3 px-4 text-sm text-[#E5E5E5] placeholder:text-[#474747] focus:outline-none focus:border-[#D4FF00] transition-all focus:ring-1 focus:ring-[#D4FF00] min-h-[44px]"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-extrabold text-[#474747] uppercase tracking-widest font-display">
                      PASSWORD
                    </label>
                    {isLogin && (
                      <button 
                        type="button" 
                        onClick={() => alert('Password reset link sent if account exists.')}
                        className="text-[11px] font-bold text-[#D4FF00] hover:underline font-display tracking-wider"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#474747]/50 rounded-xl py-3 pl-4 pr-11 text-sm text-[#E5E5E5] placeholder:text-[#474747] focus:outline-none focus:border-[#D4FF00] transition-all focus:ring-1 focus:ring-[#D4FF00] min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#474747] hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                {!isLogin && (
                  <div>
                    <label className="text-[11px] font-extrabold text-[#474747] block mb-1.5 uppercase tracking-widest font-display">
                      CONFIRM PASSWORD
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#1E1E1E] border border-[#474747]/50 rounded-xl py-3 pl-4 pr-11 text-sm text-[#E5E5E5] placeholder:text-[#474747] focus:outline-none focus:border-[#D4FF00] transition-all focus:ring-1 focus:ring-[#D4FF00] min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#474747] hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Registration Extra Fields */}
                {!isLogin && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-extrabold text-[#474747] block mb-1.5 uppercase tracking-widest font-display">AGE</label>
                        <input
                          type="number"
                          placeholder="24"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          className="w-full bg-[#1E1E1E] border border-[#474747]/50 rounded-xl py-3 px-4 text-sm text-[#E5E5E5] focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-extrabold text-[#474747] block mb-1.5 uppercase tracking-widest font-display">GENDER</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full bg-[#1E1E1E] border border-[#474747]/50 rounded-xl py-3 px-4 text-sm text-[#E5E5E5] focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-extrabold text-[#474747] block mb-1.5 uppercase tracking-widest font-display">HEIGHT (CM)</label>
                        <input
                          type="number"
                          placeholder="178"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          className="w-full bg-[#1E1E1E] border border-[#474747]/50 rounded-xl py-3 px-4 text-sm text-[#E5E5E5] focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-extrabold text-[#474747] block mb-1.5 uppercase tracking-widest font-display">WEIGHT (KG)</label>
                        <input
                          type="number"
                          placeholder="74"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-full bg-[#1E1E1E] border border-[#474747]/50 rounded-xl py-3 px-4 text-sm text-[#E5E5E5] focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                        />
                      </div>
                    </div>

                    {/* Goal selector */}
                    <div>
                      <label className="text-[11px] font-extrabold text-[#474747] block mb-2 uppercase tracking-widest font-display">PRIMARY FITNESS GOAL</label>
                      <div className="grid grid-cols-2 gap-2">
                        {fitnessGoals.map((g) => (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            key={g.id}
                            onClick={() => setGoalType(g.id)}
                            className={`p-3 rounded-xl text-xs font-bold text-center border transition-all min-h-[44px] flex items-center justify-center ${
                              goalType === g.id 
                                ? 'bg-[#D4FF00]/15 border-[#D4FF00] text-[#D4FF00] shadow-sm shadow-[#D4FF00]/10' 
                                : 'bg-[#1E1E1E] border-[#474747]/40 text-[#474747] hover:text-white'
                            }`}
                          >
                            {g.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Primary CTA Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4FF00] hover:bg-[#c2eb00] text-[#0A0A0A] font-extrabold font-display text-xl py-3.5 rounded-xl shadow-lg shadow-[#D4FF00]/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50 mt-6 cursor-pointer min-h-[48px]"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'} <ArrowRight size={20} />
                </span>
              )}
            </motion.button>
          </form>

          {/* Separator */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#474747]/30"></div>
            <span className="flex-shrink mx-4 text-[10px] font-extrabold text-[#474747] uppercase tracking-widest font-display">OR</span>
            <div className="flex-grow border-t border-[#474747]/30"></div>
          </div>

          {/* Social Authentication / Google Sign-In */}
          <div className="w-full">
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              disabled={loading || googleLoading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-[#0A0A0A] hover:bg-[#141414] border border-[#D4FF00]/50 hover:border-[#D4FF00] text-white rounded-xl py-3.5 px-4 text-sm font-bold font-display tracking-wider uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              {googleLoading ? (
                <div className="h-5 w-5 border-2 border-[#D4FF00] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3s.7 5.6 1.9 8l3.7-2.9c-.6-.7-1-1.6-1-2.6z"/>
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                  </svg>
                  <span>CONTINUE WITH GOOGLE</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Toggle Link */}
          <p className="text-center text-xs text-[#E5E5E5]/70 pt-2 font-medium">
            {isLogin ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="font-bold text-[#D4FF00] hover:underline cursor-pointer font-display tracking-wider"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="font-bold text-[#D4FF00] hover:underline cursor-pointer font-display tracking-wider"
                >
                  Sign In
                </button>
              </>
            )}
          </p>

        </motion.div>
      </div>
    </div>
  );
}

