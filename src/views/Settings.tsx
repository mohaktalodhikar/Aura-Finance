import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { updateProfile, deleteUser } from 'firebase/auth';

export default function Settings() {
  const { currency, updateCurrency } = useData();
  const [activeTab, setActiveTab] = useState('Profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(true);
  const [timezone, setTimezone] = useState('EST');
  const [activeToast, setActiveToast] = useState<string | null>(null);

  // User Profile State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('https://i.pravatar.cc/150?img=68');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        setEmail(user.email || '');
        setName(user.displayName || '');
        if (user.photoURL) {
          setPhotoURL(user.photoURL);
        }
        
        // Fetch additional data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.name) setName(data.name);
          if (data.phone) setPhone(data.phone);
          if (data.photoURL) setPhotoURL(data.photoURL);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        showToast('Image must be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoURL(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        // Update Auth Profile
        await updateProfile(user, { 
          displayName: name,
          photoURL: photoURL !== 'https://i.pravatar.cc/150?img=68' ? photoURL : user.photoURL
        });
        
        // Update Firestore Document
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          name,
          phone,
          photoURL: photoURL !== 'https://i.pravatar.cc/150?img=68' ? photoURL : null
        });
        
        showToast('Settings saved successfully!');
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      showToast('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (user) {
        // Delete user document from Firestore
        await deleteDoc(doc(db, 'users', user.uid));
        // Delete user from Auth
        await deleteUser(user);
        // The onAuthStateChanged listener in App.tsx will handle redirecting to Login
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        showToast('Please log out and log back in to delete your account.');
      } else {
        showToast('Failed to delete account.');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const showToast = (message: string) => {
    setActiveToast(message);
    setTimeout(() => setActiveToast(null), 3000);
  };

  const tabs = [
    { id: 'Profile', icon: 'person' },
    { id: 'Linked Accounts', icon: 'account_balance' },
    { id: 'Notifications', icon: 'notifications' },
    { id: 'Security', icon: 'security' },
    { id: 'Appearance', icon: 'palette' },
  ];

  return (
    <div className="p-8 flex flex-col gap-8 flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full relative">
      
      {/* Toast Notification */}
      {activeToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm animate-in slide-in-from-top-4 fade-in flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          {activeToast}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1">
          <h1 className="text-4xl font-black text-primary font-headline tracking-tighter mb-2">Settings</h1>
          <p className="text-slate-500 font-medium">Manage your account, preferences, and connected institutions.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Settings Navigation (Sidebar) */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-2">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-3 ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white font-bold shadow-md' 
                    : 'text-slate-600 hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                {tab.id}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 flex flex-col gap-8">
          
          {activeTab === 'Profile' ? (
            <>
              {/* Profile Section */}
              <section className="glass-card p-8 animate-in fade-in">
                <h2 className="text-xl font-bold text-primary font-headline mb-6 border-b border-outline-variant pb-4">Personal Information</h2>
                
                <div className="flex flex-col sm:flex-row gap-8 items-start mb-8">
                  <div className="relative group cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      title="Upload profile picture"
                    />
                    <div className="w-24 h-24 rounded-full bg-surface-container-high overflow-hidden border-4 border-white shadow-md">
                      <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="material-symbols-outlined text-white">photo_camera</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                      <input 
                        type="email" 
                        value={email}
                        disabled
                        className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 cursor-not-allowed focus:outline-none transition-all" 
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed directly.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Phone Number</label>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button 
                    onClick={handleSave}
                    className="px-6 py-3 bg-primary-container text-white rounded-xl font-bold text-sm hover:brightness-125 active:scale-95 transition-all shadow-md flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </section>

              {/* Preferences Section */}
              <section className="glass-card p-8 animate-in fade-in">
                <h2 className="text-xl font-bold text-primary font-headline mb-6 border-b border-outline-variant pb-4">Preferences</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-primary text-sm mb-1">Currency</h4>
                      <p className="text-xs text-slate-500">Select your primary currency for all displays.</p>
                    </div>
                    <select 
                      value={currency}
                      onChange={(e) => updateCurrency(e.target.value)}
                      className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:border-secondary transition-all cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-primary text-sm mb-1">Timezone</h4>
                      <p className="text-xs text-slate-500">Used for transaction dates and notifications.</p>
                    </div>
                    <select 
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:border-secondary transition-all cursor-pointer"
                    >
                      <option value="EST">Eastern Time (EST)</option>
                      <option value="PST">Pacific Time (PST)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                    <div>
                      <h4 className="font-bold text-primary text-sm mb-1">AI Insights</h4>
                      <p className="text-xs text-slate-500">Allow Aura AI to analyze your data for personalized recommendations.</p>
                    </div>
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={aiInsightsEnabled}
                        onChange={(e) => setAiInsightsEnabled(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                    </label>
                  </div>
                </div>
              </section>

              {/* Danger Zone */}
              <section className="border border-red-200 bg-red-50 p-8 rounded-2xl mt-4 animate-in fade-in">
                <h2 className="text-xl font-bold text-red-600 font-headline mb-2">Danger Zone</h2>
                <p className="text-sm text-red-500/80 mb-6">Irreversible actions related to your account.</p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Delete Account</h4>
                    <p className="text-xs text-slate-500">Permanently delete your account and all associated data.</p>
                  </div>
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 active:scale-95 transition-all"
                  >
                    Delete Account
                  </button>
                </div>
              </section>
            </>
          ) : activeTab === 'Notifications' ? (
            <section className="glass-card p-8 rounded-3xl border border-white shadow-sm animate-in fade-in">
              <h2 className="text-xl font-bold text-primary-container font-headline mb-6 border-b border-outline-variant/20 pb-4">Notification Preferences</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-primary-container text-sm mb-1">Email Summaries</h4>
                    <p className="text-xs text-slate-500">Receive weekly reports of your spending and budget status.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-primary-container text-sm mb-1">Large Transaction Alerts</h4>
                    <p className="text-xs text-slate-500">Get notified when a transaction exceeds $500.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-primary-container text-sm mb-1">Budget Warnings</h4>
                    <p className="text-xs text-slate-500">Alert me when I reach 80% of any budget category.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                  <div>
                    <h4 className="font-bold text-primary-container text-sm mb-1">Push Notifications</h4>
                    <p className="text-xs text-slate-500">Receive instant alerts on your mobile device.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleSave}
                  className="px-6 py-3 bg-primary-container text-white rounded-xl font-bold text-sm hover:brightness-125 active:scale-95 transition-all shadow-md"
                >
                  Save Preferences
                </button>
              </div>
            </section>
          ) : activeTab === 'Security' ? (
            <section className="glass-card p-8 rounded-3xl border border-white shadow-sm animate-in fade-in">
              <h2 className="text-xl font-bold text-primary-container font-headline mb-6 border-b border-outline-variant/20 pb-4">Security Settings</h2>
              
              <div className="space-y-8">
                <div>
                  <h4 className="font-bold text-primary-container text-sm mb-4">Authentication</h4>
                  <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between border border-outline-variant/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <span className="material-symbols-outlined">password</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Password</p>
                        <p className="text-xs text-slate-500">Last changed 3 months ago</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-white border border-outline-variant/30 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-50 transition-all">
                      Update
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-primary-container text-sm mb-4">Two-Factor Authentication (2FA)</h4>
                  <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between border border-outline-variant/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <span className="material-symbols-outlined">phonelink_lock</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Authenticator App</p>
                        <p className="text-xs text-emerald-600 font-medium">Enabled</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-white border border-outline-variant/30 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-50 transition-all">
                      Manage
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-primary-container text-sm mb-4">Active Sessions</h4>
                  <div className="space-y-3">
                    <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between border border-outline-variant/20">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">computer</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">MacBook Pro - Chrome</p>
                          <p className="text-xs text-emerald-600 font-medium">Current Session • New York, USA</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between border border-outline-variant/20">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">smartphone</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">iPhone 14 Pro - Safari</p>
                          <p className="text-xs text-slate-500">Last active 2 hours ago • New York, USA</p>
                        </div>
                      </div>
                      <button className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="glass-card p-12 rounded-3xl border border-white shadow-sm flex flex-col items-center justify-center text-center animate-in fade-in h-64">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">{tabs.find(t => t.id === activeTab)?.icon}</span>
              <h2 className="text-xl font-bold text-primary-container font-headline mb-2">{activeTab} Settings</h2>
              <p className="text-slate-500 text-sm">This section is currently under construction.</p>
            </div>
          )}

        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-red-600 font-headline">Delete Account?</h2>
              <button onClick={() => setShowDeleteModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete your account? This action cannot be undone and all your financial data will be permanently removed.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-surface-container-low text-slate-700 rounded-xl font-bold text-sm hover:bg-surface-container-high transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
