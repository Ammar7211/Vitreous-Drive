import React, { useState, useEffect } from 'react';
import { auth } from './firebase'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { supabase } from './supabase'; 
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; 
import { Routes, Route } from 'react-router-dom'; // 👈 Note: Router is gone, only Routes and Route remain
import Home from './Home '; 
import LogBook from './LogBook'; 
import './App.css';

const InputGroup = ({ label, id, type, placeholder, value, onChange, required }) => (
  <div className="input-group">
    <label htmlFor={id}>{label}</label>
    <input type={type} id={id} placeholder={placeholder} value={value} onChange={onChange} required={required} />
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPass) { alert("Passwords do not match!"); setLoading(false); return; }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        const { error: dbError } = await supabase.from('driver_profiles').insert([{ firebase_uid: firebaseUser.uid, email: firebaseUser.email }]);
        if (dbError) throw dbError;
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) { alert(error.message); setLoading(false); }
  };

  if (authChecking) return <div className="app-wrapper"></div>;

  return (
    <div className="app-wrapper">
      <div className="ripple ripple-1"></div>
      <div className="ripple ripple-2"></div>
      <div className="ripple ripple-3"></div>

      <AnimatePresence mode="wait">
        {user ? (
          <motion.div 
            key="dashboard" layoutId="glass-card" className="dashboard-expanded"
            initial={{ opacity: 0, borderRadius: 28 }} animate={{ opacity: 1, borderRadius: 36 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%' }}>
              
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/logbook/:id" element={<LogBook />} />
              </Routes>

            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="auth" layoutId="glass-card" className="auth-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="header">
                <h1>Vitreous <span>Drive</span></h1>
                <p>Fleet management, clearly defined.</p>
              </div>
              <form onSubmit={handleAuth}>
                <InputGroup label="Email Address" type="email" placeholder="driver@vitreous.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <InputGroup label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                {isSignUp && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="signup-expand">
                    <InputGroup label="Confirm Password" type="password" placeholder="••••••••" onChange={(e) => setConfirmPass(e.target.value)} required />
                  </motion.div>
                )}
                <button className="btn-primary" disabled={loading}>{loading ? <Loader2 className="spinner" size={20} /> : (isSignUp ? "Create Account" : "Sign In")}</button>
              </form>
              <p className="toggle-text">{isSignUp ? "Already have an account? " : "New here? "}<span onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? "Sign In" : "Create Account"}</span></p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;