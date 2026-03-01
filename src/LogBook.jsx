import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, BookOpen, Loader2, Map, X } from 'lucide-react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom'; 
import './LogBook.css';

const LogBook = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Safely catch the vehicle data passed from Home.jsx via React Router
  const vehicle = location.state?.vehicle; 

  // CRITICAL SAFETY FIX: If there is no vehicle data, send them back home!
  if (!vehicle) {
    return <Navigate to="/" />;
  }

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Now it is safe to read total_km because we know vehicle exists
  const [currentKm, setCurrentKm] = useState(Number(vehicle.total_km));

  const [formData, setFormData] = useState({
    new_reading: '',
    note: '',
    log_date: new Date().toISOString().split('T')[0] 
  });

  useEffect(() => {
    fetchLogs();
  }, [vehicle.id]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('vehicle_logs')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error) setLogs(data);
    setLoading(false);
  };

  const handleAddReading = async (e) => {
    e.preventDefault();
    const newReading = Number(formData.new_reading);

    if (newReading <= currentKm) {
      return alert(`New reading must be greater than current reading (${currentKm} km).`);
    }

    setSaving(true);
    const distanceCalculated = newReading - currentKm;

    try {
      const { error: logError } = await supabase.from('vehicle_logs').insert([{
        vehicle_id: vehicle.id,
        old_reading: currentKm,
        new_reading: newReading,
        distance: distanceCalculated,
        log_date: formData.log_date,
        note: formData.note
      }]);

      if (logError) throw logError;

      const { error: vError } = await supabase.from('vehicles').update({ total_km: newReading }).eq('id', vehicle.id);
      if (vError) throw vError;

      setCurrentKm(newReading); 
      setFormData({ new_reading: '', note: '', log_date: new Date().toISOString().split('T')[0] });
      setIsAddingMode(false);
      fetchLogs(); 
      
    } catch (error) { alert(error.message); } finally { setSaving(false); }
  };

  return (
    <motion.div className="logbook-page" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      
      {/* 🔴 PERFECT MATCH RED BACK BUTTON */}
      {/* 🔴 GUARANTEED RED BUTTON */}
      <button 
        onClick={() => navigate('/')}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, #f87171, #ef4444)', /* The Sign Out Red Gradient */
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '16px',
          cursor: 'pointer',
          fontWeight: '700',
          width: 'fit-content',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
          position: 'relative', 
          zIndex: 50,
          fontSize: '0.9rem'
        }}
      >
        <ArrowLeft size={18} /> Back to Fleet
      </button>
      
      <div className="lb-content glass-panel" style={{ marginTop: '15px' }}>
        <header className="lb-header">
          <div className="lb-title">
            <BookOpen size={28} color="#3b82f6" />
            <div>
              <h2>{vehicle.make} {vehicle.model} <span>{vehicle.registration}</span></h2>
              <p>Current Odometer: <strong>{currentKm} km</strong></p>
            </div>
          </div>
          
          <button className="lb-add-btn" onClick={() => setIsAddingMode(!isAddingMode)}>
            {isAddingMode ? <X size={20} /> : <Plus size={20} />}
            {isAddingMode ? 'Cancel' : 'Add Reading'}
          </button>
        </header>

        <AnimatePresence>
          {isAddingMode && (
            <motion.form 
              className="lb-form" onSubmit={handleAddReading}
              initial={{ height: 0, opacity: 0, overflow: 'hidden' }} animate={{ height: 'auto', opacity: 1, overflow: 'visible' }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            >
              <div className="lb-form-grid">
                <div><label>Date</label><input type="date" value={formData.log_date} onChange={(e) => setFormData({...formData, log_date: e.target.value})} required /></div>
                <div><label>New Reading (KM)</label><input type="number" placeholder={`> ${currentKm}`} value={formData.new_reading} onChange={(e) => setFormData({...formData, new_reading: e.target.value})} required /></div>
                <div style={{ gridColumn: 'span 2' }}><label>Note (e.g., City {'->'} City)</label><input type="text" placeholder="Lahore -> Islamabad" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} required /></div>
              </div>
              
              <div className="lb-calc-preview">
                {formData.new_reading > currentKm ? <span>Distance to be added: <strong>{formData.new_reading - currentKm} km</strong></span> : <span>Enter valid reading to calculate distance.</span>}
                <button type="submit" className="lb-submit" disabled={saving || formData.new_reading <= currentKm}>{saving ? <Loader2 className="spinner" size={18} /> : 'Save Log'}</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="lb-table-container">
          {loading ? (
            <div className="lb-loading"><Loader2 className="spinner" size={30} /></div>
          ) : logs.length === 0 ? (
            <div className="lb-empty"><Map size={40} /> <p>No trips logged yet.</p></div>
          ) : (
            <table className="lb-table">
              <thead><tr><th>Date</th><th>Old Reading</th><th>New Reading</th><th>Distance</th><th>Note</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.log_date).toLocaleDateString()}</td>
                    <td>{log.old_reading} km</td>
                    <td>{log.new_reading} km</td>
                    <td className="lb-distance">+{log.distance} km</td>
                    <td>{log.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
};


export default LogBook;
