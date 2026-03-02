import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { auth } from './firebase'; 
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, BookOpen, Loader2, Map, X, Download, Edit2 } from 'lucide-react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom'; 
import jsPDF from 'jspdf'; 
import autoTable from 'jspdf-autotable'; 
import './Logbook.css';

const LogBook = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const vehicle = location.state?.vehicle; 

  if (!vehicle) return <Navigate to="/" />;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentKm, setCurrentKm] = useState(Number(vehicle.total_km));

  const [formData, setFormData] = useState({ new_reading: '', note: '', log_date: new Date().toISOString().split('T')[0] });
  const [editingLog, setEditingLog] = useState(null);
  const [editLogData, setEditLogData] = useState({ new_reading: '', note: '' });

  useEffect(() => { fetchLogs(); }, [vehicle.id]);

  const fetchLogs = async () => {
    const { data, error } = await supabase.from('vehicle_logs').select('*').eq('vehicle_id', vehicle.id).order('log_date', { ascending: false }).order('created_at', { ascending: false });
    if (!error) setLogs(data);
    setLoading(false);
  };

  const handleAddReading = async (e) => {
    e.preventDefault();
    const newReading = Number(formData.new_reading);
    if (newReading <= currentKm) return alert(`New reading must be greater than current reading (${currentKm} km).`);
    setSaving(true);
    try {
      const distanceCalculated = newReading - currentKm;
      await supabase.from('vehicle_logs').insert([{ vehicle_id: vehicle.id, old_reading: currentKm, new_reading: newReading, distance: distanceCalculated, log_date: formData.log_date, note: formData.note }]);
      await supabase.from('vehicles').update({ total_km: newReading }).eq('id', vehicle.id);
      setCurrentKm(newReading); 
      setFormData({ new_reading: '', note: '', log_date: new Date().toISOString().split('T')[0] });
      setIsAddingMode(false);
      fetchLogs(); 
    } catch (error) { alert(error.message); } finally { setSaving(false); }
  };

  // 📝 Trigger Edit Popup
  const openEditModal = (log) => {
    setEditingLog(log);
    setEditLogData({ new_reading: log.new_reading, note: log.note });
  };

  const handleEditLogSubmit = async (e) => {
    e.preventDefault();
    const updatedNewReading = Number(editLogData.new_reading);
    if (updatedNewReading <= editingLog.old_reading) return alert(`Reading must be greater than previous log (${editingLog.old_reading} km).`);
    setSaving(true);
    try {
      const updatedDistance = updatedNewReading - editingLog.old_reading;
      await supabase.from('vehicle_logs').update({ new_reading: updatedNewReading, distance: updatedDistance, note: editLogData.note }).eq('id', editingLog.id);
      if (logs[0]?.id === editingLog.id) {
        await supabase.from('vehicles').update({ total_km: updatedNewReading }).eq('id', vehicle.id);
        setCurrentKm(updatedNewReading);
      }
      setEditingLog(null);
      fetchLogs();
    } catch (error) { alert(error.message); } finally { setSaving(false); }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const userEmail = auth.currentUser?.email || 'Driver';
    doc.setFontSize(20); doc.setTextColor(30, 41, 59); doc.text(`Vehicle Logbook Report`, 14, 22);
    doc.setFontSize(11); doc.setTextColor(100, 116, 139); 
    doc.text(`Driver / User:`, 14, 34); doc.setTextColor(15, 23, 42); doc.text(userEmail, 50, 34);
    doc.setTextColor(100, 116, 139); doc.text(`Vehicle:`, 14, 40); doc.setTextColor(15, 23, 42); doc.text(`${vehicle.make} ${vehicle.model}`, 50, 40);
    doc.setTextColor(100, 116, 139); doc.text(`Registration:`, 14, 46); doc.setTextColor(15, 23, 42); doc.text(`${vehicle.registration}`, 50, 46);
    doc.setTextColor(100, 116, 139); doc.text(`Total Driven:`, 14, 52); doc.setTextColor(15, 23, 42); doc.text(`${currentKm} km`, 50, 52);
    
    const tableColumn = ["Date", "Old Reading", "New Reading", "Distance", "Note"];
    const tableRows = logs.map(log => [new Date(log.log_date).toLocaleDateString(), `${log.old_reading} km`, `${log.new_reading} km`, `+${log.distance} km`, log.note]);

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 62, theme: 'grid', headStyles: { fillColor: [59, 130, 246] }, styles: { fontSize: 10 } });
    doc.save(`${vehicle.registration}_Logbook.pdf`);
  };

  return (
    <motion.div className="logbook-page" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      
      <button 
        onClick={() => navigate('/')}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #f87171, #ef4444)', 
          color: 'white', border: 'none', padding: '12px 24px', borderRadius: '16px', cursor: 'pointer', 
          fontWeight: 'bold', width: 'fit-content', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', zIndex: 50 
        }}
      >
        <ArrowLeft size={18} /> Back to Fleet
      </button>
      
      <div className="lb-content glass-panel" style={{ marginTop: '15px' }}>
        <header className="lb-header">
          <div className="lb-title">
            <BookOpen size={36} color="#3b82f6" className="lb-title-icon" />
            <div className="lb-title-text">
              <h2 style={{margin: 0}}>{vehicle.make} {vehicle.model}</h2>
              <div className="lb-meta-row">
                <span className="lb-badge">{vehicle.registration}</span>
                <p style={{margin: 0}}>Current Odometer: <strong>{currentKm} km</strong></p>
              </div>
            </div>
          </div>
          
          <div className="lb-header-actions">
            <button className="lb-download-btn" onClick={generatePDF}>
              <Download size={18} /> Download PDF
            </button>
            <button className="lb-add-btn" onClick={() => setIsAddingMode(!isAddingMode)}>
              {isAddingMode ? <X size={18} /> : <Plus size={18} />}
              {isAddingMode ? 'Cancel' : 'Add Reading'}
            </button>
          </div>
        </header>

        <AnimatePresence>
          {isAddingMode && (
            <motion.form className="lb-form" onSubmit={handleAddReading} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }}>
              <div className="lb-form-grid">
                <div><label>Date</label><input type="date" value={formData.log_date} onChange={(e) => setFormData({...formData, log_date: e.target.value})} required /></div>
                <div><label>New Reading (KM)</label><input type="number" placeholder={`> ${currentKm}`} value={formData.new_reading} onChange={(e) => setFormData({...formData, new_reading: e.target.value})} required /></div>
                <div style={{ gridColumn: '1 / -1' }}><label>Note (e.g., City {'->'} City)</label><input type="text" placeholder="Lahore -> Islamabad" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} required /></div>
              </div>
              
              {/* 👈 FIXED "SAVE LOG" PREVIEW BOX */}
              <div className="lb-calc-preview">
                {formData.new_reading > currentKm ? <span>Distance to add: <strong>{formData.new_reading - currentKm} km</strong></span> : <span>Enter valid reading.</span>}
                <button type="submit" className="lb-submit" disabled={saving || formData.new_reading <= currentKm}>{saving ? <Loader2 className="spinner" size={18} /> : 'Save Log'}</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="lb-table-container">
          {loading ? <div className="lb-loading"><Loader2 className="spinner" size={30} /></div> 
          : logs.length === 0 ? <div className="lb-empty"><Map size={40} /><p>No trips logged yet.</p></div> 
          : (
            <table className="lb-table">
              <thead><tr><th>Date</th><th>Old Reading</th><th>New Reading</th><th>Distance</th><th>Note</th><th style={{textAlign:'center'}}>Edit</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.log_date).toLocaleDateString()}</td>
                    <td>{log.old_reading}</td>
                    <td>{log.new_reading}</td>
                    <td className="lb-distance">+{log.distance}</td>
                    <td>{log.note}</td>
                    <td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                      {/* 👈 FIXED PENCIL ICON (Button type="button" prevents form submission issues) */}
                      <button type="button" onClick={() => openEditModal(log)} style={{ background: 'transparent', border: 'none', boxShadow: 'none', cursor: 'pointer', color: '#64748b', padding: '5px' }}>
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- BULLETPROOF EDIT MODAL (Hardcoded inline styles so it NEVER goes transparent) --- */}
      <AnimatePresence>
        {editingLog && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '450px', padding: '30px', borderRadius: '20px', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}
            >
              <button onClick={() => setEditingLog(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24}/></button>
              
              <h2 style={{marginTop: 0, color: '#1e293b'}}>Edit Log Entry</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>Updating record for {new Date(editingLog.log_date).toLocaleDateString()}</p>
              
              <form onSubmit={handleEditLogSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#64748b'}}>New Reading (KM)</label>
                  <input type="number" value={editLogData.new_reading} onChange={(e) => setEditLogData({...editLogData, new_reading: e.target.value})} required style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'}} />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#64748b'}}>Note</label>
                  <input type="text" value={editLogData.note} onChange={(e) => setEditLogData({...editLogData, note: e.target.value})} required style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'}} />
                </div>
                <button type="submit" className="lb-submit" style={{marginTop: '10px', width: '100%'}} disabled={saving}>
                   {saving ? 'Updating...' : 'Update Log'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LogBook;