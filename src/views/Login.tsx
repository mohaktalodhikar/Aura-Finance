import React, { useState } from 'react';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { motion } from 'motion/react';
import { Github, Linkedin, Instagram } from 'lucide-react';

export default function Login() {
  const [showLanding, setShowLanding] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else {
        setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        if (!email.includes('@')) {
          throw new Error("Please enter a valid email address to log in.");
        }
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!email || !password || !name || !phone) {
          throw new Error("Please fill in all fields.");
        }
        sessionStorage.setItem('isSigningUp', 'true');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        
        await setDoc(doc(db, 'users', user.uid), {
          name,
          email,
          phone,
          createdAt: new Date().toISOString()
        });

        sessionStorage.removeItem('isSigningUp');
        await auth.signOut();

        setIsLogin(true);
        setSuccessMsg("Account created successfully! Please log in.");
        setPassword('');
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please log in instead.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password sign-in is not enabled. Please enable it in your Firebase Console under Authentication > Sign-in method.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      sessionStorage.removeItem('isSigningUp');
      setIsLoading(false);
    }
  };

  if (showLanding) {
    return (
      <div className="min-h-screen bg-background font-body text-on-background selection:bg-secondary-container overflow-x-hidden">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant/20">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <span className="text-2xl font-headline font-extrabold tracking-tighter text-primary">Aura Finance</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { setIsLogin(true); setShowLanding(false); }}
                className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setIsLogin(false); setShowLanding(false); }}
                className="px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-40 pb-20 px-6 relative">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-secondary/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-container/50 border border-secondary/20 mb-8">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span className="text-xs font-bold text-secondary uppercase tracking-widest">Introducing Aura AI</span>
              </div>
              <h1 className="text-6xl lg:text-7xl font-headline font-extrabold tracking-tight text-primary leading-[1.1] mb-6">
                The Architectural <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">Ledger.</span>
              </h1>
              <p className="text-xl text-on-surface-variant leading-relaxed mb-10 max-w-lg">
                Experience financial clarity through high-end editorial design. AI-driven insights, precision budget tracking, and goal planning for the modern wealth builder.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => { setIsLogin(false); setShowLanding(false); }}
                  className="px-8 py-4 bg-primary text-white rounded-2xl text-lg font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
                >
                  Start Building Wealth
                </button>
                <button 
                  onClick={() => { setIsLogin(true); setShowLanding(false); }}
                  className="px-8 py-4 bg-surface border-2 border-outline-variant/30 text-primary rounded-2xl text-lg font-bold hover:bg-surface-container transition-all"
                >
                  Sign In
                </button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="relative"
            >
              <div className="relative rounded-[2.5rem] overflow-hidden border-[8px] border-surface shadow-2xl shadow-primary/10 bg-surface-container-lowest aspect-[4/3]">
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
                  alt="Abstract architectural rendering" 
                  className="w-full h-full object-cover opacity-90"
                />
                
                {/* Floating UI Elements */}
                <motion.div 
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-8 left-8 bg-background/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600">trending_up</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Net Worth</p>
                    <p className="text-lg font-headline font-bold text-primary">$124,500.00</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-8 right-8 bg-background/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary">smart_toy</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Aura AI</p>
                    <p className="text-sm font-medium text-primary max-w-[150px] leading-tight">You are on track to hit your vacation goal!</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-surface-container-lowest relative z-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-primary tracking-tight mb-6">Engineered for Precision.</h2>
              <p className="text-xl text-on-surface-variant max-w-2xl mx-auto">Everything you need to architect your financial future, housed in a meticulously designed interface.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: "smart_toy",
                  title: "AI Financial Insights",
                  desc: "Chat directly with Aura AI. Get personalized advice, spending analysis, and actionable steps tailored to your exact financial context."
                },
                {
                  icon: "pie_chart",
                  title: "Precision Budgeting",
                  desc: "Set strict limits across custom categories. Visual progress bars and automated warnings keep you from ever overspending again."
                },
                {
                  icon: "flag",
                  title: "Goal Architecture",
                  desc: "Build your future with visual goal tracking. See exactly when you'll hit your milestones based on your current savings rate."
                },
                {
                  icon: "dashboard",
                  title: "Executive Dashboard",
                  desc: "Get a bird's-eye view of your net worth, cash flow, and recent activity through beautiful, interactive visualizations."
                },
                {
                  icon: "receipt_long",
                  title: "Transaction Tracking",
                  desc: "Log and categorize every expense and income stream with ease. Maintain a perfect, searchable ledger of your financial life."
                },
                {
                  icon: "public",
                  title: "Global Currency",
                  desc: "Seamlessly switch between USD, EUR, GBP, INR, and JPY. Your entire portfolio instantly adapts to your preferred currency."
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-surface p-8 rounded-[2rem] border border-outline-variant/20 shadow-sm hover:shadow-xl transition-shadow"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-on-primary-container text-2xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-2xl font-headline font-bold text-primary mb-4">{feature.title}</h3>
                  <p className="text-on-surface-variant leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary"></div>
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-secondary/30 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <h2 className="text-5xl md:text-6xl font-headline font-extrabold text-white tracking-tight mb-8">Ready to build your ledger?</h2>
            <><p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">Join the elite tier of wealth management. Start tracking, budgeting, and growing your net worth today.</p><button
        onClick={() => { setIsLogin(false); setShowLanding(false); } }
        className="px-10 py-5 bg-white text-primary rounded-full text-xl font-bold hover:scale-105 transition-transform shadow-2xl"
      >
        Create Free Account
      </button></>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-surface py-12 border-t border-outline-variant/20">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              <span className="font-headline font-bold text-primary">Aura Finance</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="https://github.com/mohaktalodhikar" target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                <Github className="w-6 h-6" />
              </a>
              <a href="https://www.linkedin.com/in/mohak-talodhikar/" target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                <Linkedin className="w-6 h-6" />
              </a>
              <a href="https://www.instagram.com/mohak_talodhikar/" target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                <Instagram className="w-6 h-6" />
              </a>
            </div>

            <p className="text-sm text-on-surface-variant">© {new Date().getFullYear()} Aura Finance. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 w-full bg-background font-body text-on-surface antialiased overflow-hidden">
      {/* Left Side: Visual/Editorial Column */}
      <section className="hidden md:flex relative flex-col justify-between p-12 bg-primary-container overflow-hidden">
        <button 
          onClick={() => setShowLanding(true)}
          className="absolute top-8 left-8 z-20 flex items-center gap-2 text-on-primary-container hover:text-primary transition-colors font-bold text-sm bg-white/50 backdrop-blur-md px-4 py-2 rounded-full"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Home
        </button>

        {/* Decorative Gradient Blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-container/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10 mt-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <span className="text-2xl font-headline font-extrabold tracking-tighter text-white">Aura Finance</span>
          </div>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-5xl lg:text-6xl font-headline font-extrabold text-white tracking-tight leading-[1.1] mb-6">
            The Architectural <br/><span className="text-secondary-fixed">Ledger.</span>
          </h1>
          <p className="text-on-primary-container text-lg max-w-md leading-relaxed">
            Experience financial clarity through high-end editorial design. Join an elite tier of wealth management and precision tracking.
          </p>
        </div>
        
        <div className="relative z-10">
          {/* Sophisticated Loader/Progress Indicator */}
          <div className="flex gap-2">
            <div className="h-1 w-12 bg-secondary rounded-full"></div>
            <div className="h-1 w-4 bg-on-primary-container/30 rounded-full"></div>
            <div className="h-1 w-4 bg-on-primary-container/30 rounded-full"></div>
          </div>
          <p className="mt-4 text-xs font-label uppercase tracking-widest text-on-primary-container/60">PREMIUM ASSETS</p>
        </div>
        
        {/* Foreground Aesthetic Element */}
        <div className="absolute right-0 bottom-0 w-3/4 translate-x-1/4 translate-y-1/4 opacity-40">
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEtlX3-0auaxc0PVPPvg1-QJ5PMLUdFHH_xOEdKrA_dwFt79iR-JHn6yO4WCZZndvb_3xtFZ1SfJ2JSGq7oW_Rv_3ujt2-4XcRYVk45ZNEqbHfHbfQe7lVKVps0uIWoCC61hkdYNgUQUwnyX93bgiSlYxJozfe-Ok34Wjj8Rpmv71u6brEda30RZG075OZ3FteLHhZLT2oFK91toLTEpWg7kr1LkoEzsBdpmElf8gk6q85epAjwBPKF5VdzFxrhHnczv96eIYc4Q" 
            alt="Abstract smooth architectural curves in deep navy and emerald tones" 
            className="w-full h-full object-cover rounded-[3rem]" 
            referrerPolicy="no-referrer"
          />
        </div>
      </section>

      {/* Right Side: Signup Form Column */}
      <section className="flex flex-col justify-center items-center px-6 lg:px-24 bg-surface py-12 overflow-y-auto relative">
        <button 
          onClick={() => setShowLanding(true)}
          className="md:hidden absolute top-6 left-6 z-20 flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-bold text-sm"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Home
        </button>

        <div className="w-full max-w-md mt-8 md:mt-0">
          <header className="mb-8 text-center">
            <h2 className="text-3xl font-headline font-bold text-primary tracking-tight mb-2">
              {isLogin ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-on-surface-variant font-medium">
              {isLogin ? 'Enter your credentials to access your account.' : 'Secure your financial future today.'}
            </p>
          </header>
          
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Phone Number</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                />
              </div>

              {/* Terms & Conditions Section */}
              {!isLogin && (
                <div className="flex items-start gap-3 py-2">
                  <div className="flex items-center h-5">
                    <input type="checkbox" id="terms" name="terms" required className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary/20 transition-all cursor-pointer" />
                  </div>
                  <div className="text-sm leading-tight text-on-surface-variant">
                    <label htmlFor="terms" className="font-medium cursor-pointer">
                      I agree to the <a href="#" className="text-primary font-bold hover:text-secondary underline decoration-secondary/30 transition-colors">Terms of Service</a> and <a href="#" className="text-primary font-bold hover:text-secondary underline decoration-secondary/30 transition-colors">Privacy Policy</a>.
                    </label>
                  </div>
                </div>
              )}
              
              {/* CTA Button */}
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-primary text-white rounded-xl font-headline font-bold text-lg tracking-tight hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined animate-spin">sync</span>
                  ) : (
                    isLogin ? 'Sign In' : 'Create Account'
                  )}
                </button>
              </div>
            </form>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-outline-variant/30"></div>
              <span className="flex-shrink-0 mx-4 text-on-surface-variant text-xs font-bold uppercase tracking-widest">Or</span>
              <div className="flex-grow border-t border-outline-variant/30"></div>
            </div>

            <div>
              <button 
                onClick={handleGoogleLogin} 
                disabled={isLoading}
                className="w-full py-3 px-6 bg-white border border-outline-variant/30 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 active:scale-[0.98] transition-all flex justify-center gap-3 items-center disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="text-center mt-6">
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-sm font-bold text-secondary hover:underline transition-all"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
