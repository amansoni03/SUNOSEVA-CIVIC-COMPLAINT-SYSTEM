import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, ExternalLink, Image as ImageIcon, Video, Mic, Calendar, Target, Trash2, Plus, User, Phone, Mail } from 'lucide-react';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('complaints'); // 'complaints' | 'campaigns'

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) return <div className="p-8 text-center text-gray-500 font-medium">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline font-medium">Back to Home</button>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('complaints')}
          className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${activeTab === 'complaints' ? 'bg-blue-600 text-white shadow-blue-600/30' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          Citizen Complaints
        </button>
        <button 
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${activeTab === 'campaigns' ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          NGO Campaigns
        </button>
      </div>

      {activeTab === 'complaints' && <ComplaintsManager />}
      {activeTab === 'campaigns' && <CampaignsManager />}
      
    </div>
  );
}

function ComplaintsManager() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_admin_complaints');
    
    if (!error && data) {
      setComplaints(data);
    }
    setLoading(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setComplaints(complaints.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const filteredComplaints = filter === 'All' ? complaints : complaints.filter(c => c.status === filter);

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Complaints...</div>;

  return (
    <div className="glass rounded-3xl p-6 shadow-sm overflow-hidden bg-white/60">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">All Complaints</h2>
        <div className="flex gap-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm text-sm font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b-2 border-gray-100 text-sm text-gray-400">
              <th className="pb-3 font-semibold uppercase tracking-wider pl-2">Date</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Citizen Info</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Complaint</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Category</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Media & Map</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredComplaints.length === 0 ? (
              <tr><td colSpan="6" className="py-8 text-center text-gray-500">No complaints found.</td></tr>
            ) : filteredComplaints.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-white/80 transition group align-top">
                <td className="py-4 pl-2 text-gray-500 font-bold whitespace-nowrap text-xs">
                  {c.created_at ? format(new Date(c.created_at), 'MMM dd, yyyy') : 'N/A'}
                  <div className="text-[10px] text-gray-400 font-medium mt-1 mb-2 uppercase">
                    {c.created_at ? format(new Date(c.created_at), 'hh:mm a') : ''}
                  </div>
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-black border border-blue-100 uppercase tracking-widest shadow-sm block w-fit">
                    {c.tracking_id || 'ID PEND'}
                  </span>
                </td>
                <td className="py-4 pr-6 min-w-[220px]">
                  <div className="bg-gradient-to-r from-indigo-50/50 to-blue-50/30 p-3 rounded-xl border border-indigo-100/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-2 mb-2">
                       <User size={14} className="text-indigo-500" />
                       <span className="font-bold text-gray-900 text-sm truncate">{c.citizen_name || 'Anonymous User'}</span>
                    </div>
                    {c.citizen_email && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium mb-1.5 truncate" title={c.citizen_email}>
                        <Mail size={12} className="text-gray-400 flex-shrink-0" /> {c.citizen_email}
                      </div>
                    )}
                    {c.citizen_phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium mb-1.5 truncate">
                        <Phone size={12} className="text-gray-400 flex-shrink-0" /> {c.citizen_phone}
                      </div>
                    )}
                    {(c.citizen_age || c.citizen_gender) && (
                      <div className="flex items-center gap-2 text-[10px] bg-white border border-gray-100 px-2 py-1 rounded w-fit font-bold text-gray-500 uppercase tracking-wider mt-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        {c.citizen_gender || 'Unknown'} {c.citizen_age ? `• ${c.citizen_age} YRS` : ''}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 font-semibold text-gray-800 max-w-sm pr-4">
                  <div className="line-clamp-3 leading-relaxed text-sm" title={c.text}>{c.text}</div>
                </td>
                <td className="py-4">
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-lg text-xs font-bold shadow-[0_1px_2px_rgba(0,0,0,0.05)] uppercase tracking-wider whitespace-nowrap">
                    {c.category || 'General'}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex flex-wrap gap-2 text-sm items-center">
                    {c.image_urls?.length > 0 ? c.image_urls.map((url, i) => (
                       <a key={i} href={url} target="_blank" rel="noreferrer" className="block relative group/img overflow-hidden rounded-lg w-10 h-10 border border-gray-200 flex-shrink-0 shadow-sm">
                          <img src={url} className="object-cover w-full h-full group-hover/img:scale-110 transition-transform" alt="Complaint media" />
                       </a>
                    )) : c.image_url && (
                       <a href={c.image_url} target="_blank" rel="noreferrer" className="block relative group/img overflow-hidden rounded-lg w-14 h-14 border border-gray-200 flex-shrink-0 shadow-sm">
                          <img src={c.image_url} className="object-cover w-full h-full group-hover/img:scale-110 transition-transform" alt="Complaint media" />
                       </a>
                    )}
                    <div className="flex flex-col gap-1.5 justify-center">
                      {c.video_url && <a href={c.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 text-[10px] font-bold text-blue-700 transition uppercase"> <Video size={12} /> Video</a>}
                      {c.audio_url && <a href={c.audio_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 text-[10px] font-bold text-blue-700 transition uppercase"> <Mic size={12} /> Audio</a>}
                      {c.latitude && c.longitude && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md hover:bg-green-100 text-[10px] font-bold text-green-700 transition border border-green-100 uppercase">
                          <MapPin size={12} className="text-red-500" /> Map
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4">
                  <select
                    value={c.status}
                    onChange={(e) => handleStatusChange(c.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none shadow-sm cursor-pointer ${
                      c.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                      c.status === 'In Progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CampaignsManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '', description: '', objective: '', category: '', location: '', image_url: '', start_date: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (data) setCampaigns(data);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null
      };
      const { error } = await supabase.from('campaigns').insert([payload]);
      if (error) throw error;
      
      alert('Campaign created successfully!');
      setShowForm(false);
      setFormData({title: '', description: '', objective: '', category: '', location: '', image_url: '', start_date: ''});
      fetchCampaigns();
    } catch (err) {
      alert("Error saving campaign: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure you want to delete this campaign?")) return;
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (err) {
      alert("Error deleting campaign: " + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Campaigns...</div>;

  return (
    <div className="flex flex-col gap-8">
      {/* Creation form toggle */}
      {!showForm ? (
        <button 
          onClick={() => setShowForm(true)}
          className="self-start flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-md hover:bg-black transition"
        >
          <Plus size={20} /> Create New Campaign
        </button>
      ) : (
        <div className="glass rounded-3xl p-8 shadow-md border border-gray-200 relative bg-white/70">
          <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 font-bold">Close X</button>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Publish NGO Campaign</h2>
          
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Campaign Title *</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" placeholder="e.g. River Cleanup Drive" />
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
              <textarea required rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" placeholder="Full details about the campaign..." />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Target Objective</label>
              <input type="text" value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Gather 500 blankets" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <div className="relative">
                <Target size={18} className="absolute left-3 top-3.5 text-gray-400" />
                <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Social Welfare" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Location / Venue</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-3.5 text-gray-400" />
                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" placeholder="Where is it?" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date & Time (Optional)</label>
              <input type="datetime-local" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-600" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Image URL (Public web link)</label>
              <div className="relative">
                <ImageIcon size={18} className="absolute left-3 top-3.5 text-gray-400" />
                <input type="url" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" placeholder="https://images.unsplash.com/photo-..." />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end">
              <button disabled={submitting} type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 disabled:bg-gray-400 transition">
                {submitting ? 'Publishing...' : 'Publish Campaign'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid view of active campaigns */}
      <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3">Active NGO Campaigns</h2>
      
      {campaigns.length === 0 ? (
        <div className="text-gray-500 p-8 glass rounded-2xl text-center">No campaigns found. Start by creating one above!</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campaigns.map(camp => (
            <div key={camp.id} className="glass rounded-3xl p-5 flex gap-5 items-start bg-white/50 relative group">
              <button onClick={() => handleDelete(camp.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition opacity-0 group-hover:opacity-100" title="Delete Campaign">
                <Trash2 size={18} />
              </button>

              {camp.image_url ? (
                <img src={camp.image_url} alt="Campaign" className="w-32 h-32 object-cover rounded-2xl flex-shrink-0 shadow-sm border border-gray-100" />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-200 flex-shrink-0"><Target className="text-gray-300" size={32}/></div>
              )}
              
              <div className="flex flex-col gap-1.5 flex-grow pr-8">
                <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">{camp.title}</h3>
                <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded w-fit uppercase tracking-wider">{camp.category || 'General'}</span>
                
                <div className="grid grid-cols-1 gap-1 text-xs font-semibold text-gray-500 mt-1">
                  <div className="flex items-center gap-1.5"><Calendar size={12}/>{camp.start_date ? format(new Date(camp.start_date), 'MMM dd, yyyy h:mm a') : 'TBA'}</div>
                  <div className="flex items-center gap-1.5"><MapPin size={12}/>{camp.location || 'N/A'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
