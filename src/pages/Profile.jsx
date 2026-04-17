import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Camera, Save, Loader2, CheckCircle2, Clock, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: '',
    age: '',
    gender: 'Male',
    phone: '',
    avatar_url: ''
  });
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchProfile();
      fetchMyHistory();
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data) {
      setProfile({
        full_name: data.full_name || '',
        age: data.age || '',
        gender: data.gender || 'Male',
        phone: data.phone || '',
        avatar_url: data.avatar_url || ''
      });
    }
    setLoading(false);
  };

  const fetchMyHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setMyComplaints(data);
    setLoadingHistory(false);
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      let uploadedUrl = profile.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`public/${fileName}`, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(`public/${fileName}`);
          
        uploadedUrl = publicUrl;
      }

      const updates = {
        id: user.id, // Required for upsert fallback
        full_name: profile.full_name,
        age: parseInt(profile.age) || null,
        gender: profile.gender,
        phone: profile.phone,
        avatar_url: uploadedUrl
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;
      
      setProfile(prev => ({ ...prev, avatar_url: uploadedUrl }));
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setAvatarFile(null);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error updating profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8 border-b pb-4 border-gray-200">
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-blue-800 to-green-600">My Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Details Edit */}
        <div className="lg:col-span-1 glass rounded-3xl p-6 shadow-sm self-start">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Details</h2>
          
          {message.text && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-32 h-32 rounded-full ring-4 ring-blue-100 bg-gray-100 overflow-hidden shadow-sm">
                {(avatarPreview || profile.avatar_url) ? (
                  <img src={avatarPreview || profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-gradient-to-br from-gray-100 to-gray-200">Upload</div>
                )}
                
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition cursor-pointer">
                  <Camera className="text-white" size={32} />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-gray-500 font-bold mt-3 uppercase tracking-widest">Click to change avatar</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
              <input type="text" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/70 focus:ring-2 focus:ring-blue-500 font-bold text-gray-800" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
              <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="+91 XXXXX XXXXX" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/70 focus:ring-2 focus:ring-blue-500 font-bold text-gray-800" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Age</label>
                <input type="number" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/70 focus:ring-2 focus:ring-blue-500 font-bold text-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Gender</label>
                <select value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/70 focus:ring-2 focus:ring-blue-500 font-bold text-gray-800">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <button disabled={saving} type="submit" className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition disabled:opacity-70">
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Complaints Tracking */}
        <div className="lg:col-span-2">
          <div className="glass rounded-3xl p-6 shadow-sm min-h-full">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">My Complaint Status</h2>
                <div className="px-3 py-1.5 bg-blue-50 text-blue-800 font-bold text-sm rounded-lg border border-blue-100 shadow-sm">
                  Total Active: {myComplaints.length}
                </div>
             </div>

             <div className="flex gap-3 mb-6 bg-gray-50/80 p-2 rounded-xl border border-gray-100 shadow-sm">
               <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Track Specific ID (e.g. TRK-XXXX...)" 
                   className="w-full pl-10 pr-4 py-3 rounded-lg border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-sm text-gray-800"
                 />
               </div>
             </div>

             {loadingHistory ? (
                <div className="text-center text-gray-500 py-12 flex items-center justify-center gap-2 font-bold">
                  <Loader2 className="animate-spin text-blue-500" /> Fetching latest status...
                </div>
             ) : myComplaints.length === 0 ? (
                <div className="text-center text-gray-500 py-12 font-medium bg-white/50 rounded-2xl border border-dashed border-gray-300">
                  You haven't submitted any complaints yet.
                </div>
             ) : (
               <div className="flex flex-col gap-4">
                 {myComplaints.filter(c => !searchQuery || c.tracking_id?.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                   <div key={c.id} className="bg-gradient-to-r from-white to-gray-50/80 rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row justify-between md:items-center gap-4 hover:shadow-md transition">
                     <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1">
                         <span className="font-black text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded tracking-widest">{c.tracking_id || 'ID PENDING'}</span>
                       </div>
                       <p className="font-bold text-gray-900 line-clamp-2 text-lg">{c.text}</p>
                       {(c.image_urls?.length > 0 || c.image_url) && (
                         <div className="flex gap-2 mb-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                           {c.image_urls?.length > 0 ? c.image_urls.map((url, i) => (
                             <img key={i} src={url} alt="Attached" className="h-10 w-10 object-cover rounded shadow-sm border border-gray-200" />
                           )) : (
                             <img src={c.image_url} alt="Attached" className="h-10 w-10 object-cover rounded shadow-sm border border-gray-200" />
                           )}
                         </div>
                       )}
                       {c.audio_url && (
                         <div className="mb-2 mt-2 bg-white/60 p-2 rounded-xl border border-gray-200 shadow-sm w-fit">
                           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Your Voice Note</p>
                           <audio src={c.audio_url} controls className="h-8 max-w-[200px]" />
                         </div>
                       )}
                       <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium mt-2">
                         <span className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-700 font-bold tracking-wider uppercase shadow-sm">
                           {c.category || 'General'}
                         </span>
                         <span className="flex items-center gap-1 font-bold">
                           <Clock size={12}/> {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : 'N/A'}
                         </span>
                       </div>
                     </div>
                     <div className="flex-shrink-0 flex items-center">
                        <span className={`inline-flex items-center justify-center min-w-[130px] gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm border ${
                          c.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                          c.status === 'In Progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {c.status === 'Resolved' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                          {c.status}
                        </span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
