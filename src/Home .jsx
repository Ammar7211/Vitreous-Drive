import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { auth } from './firebase'; 
import { signOut } from 'firebase/auth'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Upload, Car, Bus, Truck, Bike, Droplet, MapPin, Loader2, AlertTriangle, Edit2, LogOut, Trash2 } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom'; // 👈 IMPORT NAVIGATION HOOK
import './Home.css';

const Home = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const navigate = useNavigate(); // 👈 INITIALIZE NAVIGATE

  const [formData, setFormData] = useState({
    make: '', model: '', variant: '', registration: '', fuel_capacity: '', total_km: '', last_oil_change_km: ''
  });
  
  const [editData, setEditData] = useState({ total_km: '', last_oil_change_km: '' });
  const [vehicleType, setVehicleType] = useState('car');
  const [imageFile, setImageFile] = useState(null);

  const vehicleTypeOptions = [
    { id: 'car', label: 'Car', icon: Car },
    { id: 'bus', label: 'Bus', icon: Bus },
    { id: 'truck', label: 'Truck', icon: Truck },
    { id: 'bike', label: 'Bike', icon: Bike }
  ];

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('firebase_uid', user.uid)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setVehicles(data);
    setLoading(false);
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleEditChange = (e) => setEditData({ ...editData, [e.target.name]: e.target.value });

  const processAndUploadImage = async (file) => {
    const removeBgFormData = new FormData();
    removeBgFormData.append('image_file', file);
    removeBgFormData.append('size', 'auto');
    removeBgFormData.append('bg_color', 'white'); 

    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': 'QAcfuEWYbjCVXTKAznUAtWQr' }, 
      body: removeBgFormData,
    });

    if (!removeBgResponse.ok) throw new Error('Failed to process image with Remove.bg');

    const processedBlob = await removeBgResponse.blob();
    const fileName = `vehicle_${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('vehicle_images')
      .upload(fileName, processedBlob, { contentType: 'image/png' });

    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('vehicle_images').getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) return alert('Please select an image!');
    setUploading(true);

    try {
      const user = auth.currentUser;
      const imageUrl = await processAndUploadImage(imageFile);

      const { error } = await supabase.from('vehicles').insert([{
        firebase_uid: user.uid,
        vehicle_type: vehicleType,
        ...formData,
        image_url: imageUrl
      }]);

      if (error) throw error;
      
      alert('Vehicle Added Successfully!');
      setIsModalOpen(false);
      fetchVehicles(); 
      setFormData({ make: '', model: '', variant: '', registration: '', fuel_capacity: '', total_km: '', last_oil_change_km: ''});
      setVehicleType('car');
      setImageFile(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          total_km: editData.total_km,
          last_oil_change_km: editData.last_oil_change_km
        })
        .eq('id', editingVehicle.id);

      if (error) throw error;
      
      setEditingVehicle(null);
      fetchVehicles();
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, make, model) => {
    const isConfirmed = window.confirm(`Are you sure you want to delete this ${make} ${model}? This action cannot be undone.`);
    
    if (isConfirmed) {
      try {
        const { error } = await supabase
          .from('vehicles')
          .delete()
          .eq('id', id);

        if (error) throw error;
        fetchVehicles(); 
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const getVehicleIcon = (type) => {
    const option = vehicleTypeOptions.find(opt => opt.id === type);
    if (!option) return <Car size={16} />;
    const IconComponent = option.icon;
    return <IconComponent size={16} />;
  };

  const handleLogout = () => signOut(auth);

  return (
    <div className="home-container">
      
      {/* FIXED LOGOUT BUTTON */}
      <button className="logout-btn-fixed" onClick={handleLogout}>
        <LogOut size={18} /> Sign Out
      </button>

      <header className="dashboard-header glass-panel">
        <div>
          <h2>Fleet Overview</h2>
          <p>Total Registered Vehicles</p>
        </div>
        <div className="total-badge">
          {loading ? '...' : vehicles.length}
        </div>
      </header>

      <div className="vehicle-list">
        {vehicles.map((v) => {
          const needsOilChange = (Number(v.total_km) - Number(v.last_oil_change_km || 0)) >= 5000;

          return (
            <motion.div 
              key={v.id} 
              className="vehicle-card glass-panel" 
              initial={{opacity:0, y:20}} 
              animate={{opacity:1, y:0}}
              whileHover={{ scale: 1.02 }} /* 👈 Adds a slight scale effect on hover */
              onClick={() => navigate(`/logbook/${v.id}`, { state: { vehicle: v } })} /* 👈 NAVIGATES TO LOGBOOK PAGE */
              style={{ cursor: 'pointer' }} /* 👈 Makes it clear it's clickable */
            >
              
              <div className="action-buttons" onClick={(e) => e.stopPropagation() /* 👈 Stops the card click from firing when editing/deleting */}>
                <button 
                  className="edit-btn" 
                  onClick={() => {
                    setEditingVehicle(v);
                    setEditData({ total_km: v.total_km, last_oil_change_km: v.last_oil_change_km || v.total_km });
                  }}
                  title="Update Mileage"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  className="delete-btn" 
                  onClick={() => handleDelete(v.id, v.make, v.model)}
                  title="Delete Vehicle"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {needsOilChange && (
                <div className="danger-badge">
                  <AlertTriangle size={20} />
                  <span className="tooltip">Please change oil! (Over 5000km)</span>
                </div>
              )}

              <div className="v-image-container">
                {v.image_url ? <img src={v.image_url} alt={v.model} /> : getVehicleIcon(v.vehicle_type)}
              </div>
              <div className="v-details">
                <div className="type-badge">
                  {getVehicleIcon(v.vehicle_type)} {v.vehicle_type}
                </div>
                
                <h3>{v.make} {v.model} <span>{v.variant}</span></h3>
                <p className="v-reg">{v.registration}</p>
                
                <div className="v-stats-row">
                  <span><MapPin size={14}/> {v.total_km} km</span>
                  <span><Droplet size={14}/> {v.fuel_capacity} L</span>
                </div>
              </div>
            </motion.div>
          );
        })}

        <motion.button 
          className="add-vehicle-btn glass-panel"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={32} />
          <span>Add New Vehicle</span>
        </motion.button>
      </div>

      {/* --- ADD VEHICLE MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content glass-panel" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24}/></button>
              <h2>Add Vehicle to Fleet</h2>

              <form onSubmit={handleSubmit} className="add-vehicle-form">
                <div>
                  <label className="section-label">Vehicle Category</label>
                  <div className="vehicle-type-grid">
                    {vehicleTypeOptions.map((v) => {
                      const Icon = v.icon;
                      return (
                        <button key={v.id} type="button" className={`vt-option ${vehicleType === v.id ? 'active' : ''}`} onClick={() => setVehicleType(v.id)}>
                          <Icon size={20} strokeWidth={2}/>
                          <span className="vt-label">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="image-upload-box" style={{ padding: '15px' }}>
                  <input type="file" id="v-image" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} hidden />
                  <label htmlFor="v-image" className="upload-label">
                    {imageFile ? <span className="file-name">{imageFile.name}</span> : <><Upload size={20}/> Upload Vehicle Photo</>}
                  </label>
                </div>

                <div className="form-grid">
                  <input name="make" placeholder="Make (e.g., Honda)" onChange={handleInputChange} required />
                  <input name="model" placeholder="Model (e.g., Civic)" onChange={handleInputChange} required />
                  <input name="variant" placeholder="Variant (e.g., EX)" onChange={handleInputChange} required />
                  <input name="registration" placeholder="Reg. Number" onChange={handleInputChange} required />
                  <input name="fuel_capacity" type="number" placeholder="Fuel Cap (Liters)" onChange={handleInputChange} required />
                  <input name="total_km" type="number" placeholder="Current KM" onChange={handleInputChange} required />
                  <input name="last_oil_change_km" type="number" placeholder="Last Oil Change (KM)" onChange={handleInputChange} required style={{gridColumn: 'span 2'}}/>
                </div>

                <button type="submit" className="submit-btn" disabled={uploading}>
                  {uploading ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Loader2 className="spinner" size={18} /> Processing...</span> : 'Save Vehicle'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- EDIT VEHICLE MODAL --- */}
      <AnimatePresence>
        {editingVehicle && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content glass-panel" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <button className="close-btn" onClick={() => setEditingVehicle(null)}><X size={24}/></button>
              <h2>Update Mileage Log</h2>
              <form onSubmit={handleUpdate} className="add-vehicle-form">
                <div className="form-grid" style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="section-label">Current Total KM</label>
                  <input name="total_km" type="number" value={editData.total_km} onChange={handleEditChange} required />
                  
                  <label className="section-label" style={{marginTop: '10px'}}>Last Oil Change (KM)</label>
                  <input name="last_oil_change_km" type="number" value={editData.last_oil_change_km} onChange={handleEditChange} required />
                </div>
                <button type="submit" className="submit-btn" disabled={uploading}>
                   Update Logs
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Home;