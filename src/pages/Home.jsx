import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { MapPin, ThumbsUp, Image as ImageIcon, CheckCircle2, Clock, Volume2, Video, Search, Calendar, Filter, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { translateText } from '../lib/translator';
import { Globe as GlobeIcon } from 'lucide-react';

function CountUp({ to }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, to, { duration: 2, ease: "easeOut" });
    return animation.stop;
  }, [count, to]);

  return <motion.span>{rounded}</motion.span>;
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [searchQuery, setSearchQuery] = useState('');
  const [translations, setTranslations] = useState({}); // { complaintId: translatedText }
  const [translatingIds, setTranslatingIds] = useState(new Set());

  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === 'Resolved').length;
  const activeComplaints = totalComplaints - resolvedComplaints;

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const date = parseISO(c.created_at);
    let matchesDate = true;
    if (dateFilter === 'today') matchesDate = isToday(date);
    if (dateFilter === 'week') matchesDate = isThisWeek(date);
    if (dateFilter === 'month') matchesDate = isThisMonth(date);
    
    return matchesSearch && matchesDate;
  });

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComplaints(data);
    }
    setLoading(false);
  };

  const seedComplaints = async () => {
    const samples = [
      {
        text: "Huge pothole near Hazratganj crossing causing severe traffic jams. Needs immediate repair!",
        category: "Roads",
        status: "Pending",
        image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=2000&auto=format&fit=crop",
        latitude: 26.8505,
        longitude: 80.9399,
        upvotes: 24
      },
      {
        text: "Garbage piled up heavily outside Charbagh Railway Station. It's causing a major health hazard.",
        category: "Sanitation",
        status: "In Progress",
        image_url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=2000&auto=format&fit=crop",
        latitude: 26.8329,
        longitude: 80.9200,
        upvotes: 18
      },
      {
        text: "Street lights completely entirely dead along Marine Drive, Gomti Nagar. Extremely dark and unsafe at night!",
        category: "Electricity",
        status: "Pending",
        image_url: "https://images.unsplash.com/photo-1517722014278-c256a91a6fba?q=80&w=2000&auto=format&fit=crop",
        latitude: 26.8524,
        longitude: 80.9996,
        upvotes: 42
      }
    ];

    try {
      await supabase.from('complaints').insert(samples);
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert("Failed to insert sample complaints");
    }
  };

  const handleTranslate = async (complaint) => {
    if (translations[complaint.id]) {
      // Toggle back to original if already translated
      setTranslations(prev => {
        const next = { ...prev };
        delete next[complaint.id];
        return next;
      });
      return;
    }

    setTranslatingIds(prev => new Set(prev).add(complaint.id));
    
    // Translate to the current UI language
    const targetLang = i18n.language; 
    const result = await translateText(complaint.text, targetLang);
    
    if (!result.error) {
      setTranslations(prev => ({ 
        ...prev, 
        [complaint.id]: { 
          text: result.translatedText, 
          engine: result.engine || 'Google' 
        } 
      }));
    } else {
      alert("Translation failed. Please check your internet or try again.");
    }
    
    setTranslatingIds(prev => {
      const next = new Set(prev);
      next.delete(complaint.id);
      return next;
    });
  };

  const handleUpvote = async (complaint) => {
    if (!user) {
      alert("Please login to upvote");
      return;
    }

    try {
      // Record upvote
      const { error: upvoteError } = await supabase
        .from('upvotes')
        .insert({ user_id: user.id, complaint_id: complaint.id });

      if (upvoteError) {
        if (upvoteError.code === '23505') {
          // Unique violation (already upvoted)
          alert("You've already upvoted this.");
        } else {
          throw upvoteError;
        }
        return;
      }

      // Increment count
      const newUpvotes = (complaint.upvotes || 0) + 1;
      const { error: updateError } = await supabase
        .from('complaints')
        .update({ upvotes: newUpvotes })
        .eq('id', complaint.id);

      if (updateError) throw updateError;

      // Update UI optimistically
      setComplaints(complaints.map(c =>
        c.id === complaint.id ? { ...c, upvotes: newUpvotes } : c
      ));
    } catch (err) {
      console.error(err);
      alert("Error upvoting");
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 text-center pb-20">
      
      {/* BANNER SECTION */}
      <Link 
        to={user ? "/dashboard" : "/login"}
        className="w-full max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.25)] transition transform hover:-translate-y-1 mb-8 mt-4 cursor-pointer ring-4 ring-white/50 block relative group"
      >
        <img 
          src="/banner.png" 
          alt="Unity Citizen Support Banner" 
          className="w-full h-auto object-cover"
          onError={(e) => { 
            e.target.style.display = 'none'; 
            if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex'; 
          }}
        />
        {/* Fallback UI if banner missing */}
        <div className="hidden w-full py-16 bg-gradient-to-r from-blue-700 via-orange-500 to-green-600 flex-col items-center justify-center text-white text-center px-4">
          <h2 className="text-3xl md:text-5xl font-black mb-2 tracking-wide" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>{t('home.hero_tagline')}</h2>
          <p className="text-lg md:text-xl font-bold bg-white/20 px-6 py-2 rounded-full backdrop-blur-sm shadow-sm">{t('home.click_to_submit')}</p>
        </div>
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none"></div>
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-blue-800 to-green-600 mb-4 tracking-tight">
          SunoSeva
        </h1>
        <p className="text-2xl md:text-3xl font-black text-gray-800 max-w-2xl mx-auto tracking-widest" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.1), -1px -1px 2px rgba(255,255,255,0.8)" }}>
          {t('home.hero_tagline')}
        </p>
        <p className="text-md text-gray-800 max-w-xl mx-auto font-medium mt-4 bg-white/50 px-4 py-1 rounded-full inline-block backdrop-blur-sm">
          {t('home.hero_desc')}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 mb-16 px-4 w-full">
        {/* Main Prominent Button */}
        <Link
          to={user ? "/dashboard" : "/login"}
          className="px-10 py-4 text-lg md:text-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-[2rem] font-black transition transform shadow-[0_12px_24px_rgba(249,115,22,0.4),inset_0_3px_0_rgba(255,255,255,0.4)] hover:shadow-[0_15px_30px_rgba(249,115,22,0.5),inset_0_3px_0_rgba(255,255,255,0.6)] hover:-translate-y-2 active:translate-y-1 active:shadow-lg w-full max-w-xs md:max-w-sm text-center tracking-wide"
        >
          {user ? t('common.make_complaint') : t('common.login_register')}
        </Link>
        
        {/* Secondary Buttons Row */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/campaigns"
            className="px-8 py-3.5 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-2xl font-bold transition transform shadow-[0_10px_20px_rgba(29,78,216,0.3),inset_0_2px_0_rgba(255,255,255,0.3)] hover:shadow-[0_15px_30px_rgba(29,78,216,0.5),inset_0_2px_0_rgba(255,255,255,0.5)] hover:-translate-y-1 active:translate-y-1 active:shadow-md"
          >
            {t('common.view_ngo_campaigns')}
          </Link>

          {user && (
            <Link
              to="/admin"
              className="px-8 py-3.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl font-bold transition transform shadow-[0_10px_20px_rgba(59,130,246,0.3),inset_0_2px_0_rgba(255,255,255,0.3)] hover:shadow-[0_15px_30px_rgba(59,130,246,0.5),inset_0_2px_0_rgba(255,255,255,0.5)] hover:-translate-y-1 active:translate-y-1 active:shadow-md"
            >
              {t('common.admin_panel')}
            </Link>
          )}
        </div>
      </div>

      {/* TRACK RECORD STATS */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 px-4">
        <div className="glass rounded-3xl p-6 shadow-sm text-center transform transition hover:scale-105">
          <h3 className="text-4xl font-black text-orange-600 mb-2"><CountUp to={totalComplaints} /></h3>
          <p className="text-gray-700 font-bold uppercase tracking-wider text-sm">{t('common.total_complaints')}</p>
        </div>
        <div className="glass rounded-3xl p-6 shadow-sm text-center transform transition hover:scale-105">
          <h3 className="text-4xl font-black text-green-600 mb-2"><CountUp to={resolvedComplaints} /></h3>
          <p className="text-gray-700 font-bold uppercase tracking-wider text-sm">{t('common.resolved')}</p>
        </div>
        <div className="glass rounded-3xl p-6 shadow-sm text-center transform transition hover:scale-105">
          <h3 className="text-4xl font-black text-blue-900 mb-2"><CountUp to={activeComplaints} /></h3>
          <p className="text-gray-700 font-bold uppercase tracking-wider text-sm">{t('common.active')}</p>
        </div>
      </div>

      <div className="w-full max-w-[90%] lg:max-w-[85%] text-left">
        <div className="flex justify-between items-end mb-8 px-2 border-b border-gray-200 pb-4">
          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            {t('common.public_feed')} 
            <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 text-sm font-bold shadow-sm">
              {complaints.length}
            </span>
          </h2>
          <p className="text-gray-500 font-bold text-sm hidden md:block">{t('home.real_time_subtitle')}</p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white/50 backdrop-blur-md p-4 rounded-[2rem] border border-white/60 shadow-sm transition hover:shadow-md">
          {/* Search/Location Input */}
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" size={20} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.search_placeholder')}
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 shadow-sm transition"
            />
          </div>

          {/* Date Range Tabs */}
          <div className="flex items-center gap-1 bg-gray-100/50 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
            {[
              { id: 'all', label: t('home.all_time') },
              { id: 'today', label: t('home.today') },
              { id: 'week', label: t('home.this_week') },
              { id: 'month', label: t('home.this_month') }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  dateFilter === tab.id 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="glass rounded-3xl p-12 text-center text-gray-500 font-medium animate-pulse">Loading feed...</div>
        ) : complaints.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center text-gray-500 font-medium flex flex-col items-center">
            <p className="mb-4">No complaints submitted yet.</p>
            <button
              onClick={seedComplaints}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition"
            >
              Load Sample Data (Lucknow)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {complaints
              .filter(c => {
                // Location/Text Filtering
                const matchSearch = !searchQuery || 
                  c.text?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  c.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.tracking_id?.toLowerCase().includes(searchQuery.toLowerCase());
                
                // Date Filtering
                if (!matchSearch) return false;
                if (dateFilter === 'all') return true;
                
                const taskDate = parseISO(c.created_at);
                if (dateFilter === 'today') return isToday(taskDate);
                if (dateFilter === 'week') return isThisWeek(taskDate);
                if (dateFilter === 'month') return isThisMonth(taskDate);
                
                return true;
              })
              .map((c) => (
              <div key={c.id} className="glass rounded-[2rem] p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col h-full bg-white/70 border border-white/60 group">
                
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[11px] uppercase tracking-wider bg-black text-white px-3 py-1.5 rounded-xl shadow-sm">
                      {c.category}
                    </span>
                    {c.tracking_id && (
                      <span className="font-black text-[10px] uppercase tracking-widest bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-xl shadow-sm">
                        {c.tracking_id}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">
                      {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : 'Just now'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          const synth = window.speechSynthesis;
                          if (synth.speaking) { synth.cancel(); return; }
                          const utter = new SpeechSynthesisUtterance(c.text);
                          synth.speak(utter);
                        }}
                        className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-sm" title="Listen to Complaint"
                      >
                        <Volume2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleTranslate(c)}
                        disabled={translatingIds.has(c.id)}
                        className={`p-1.5 rounded-lg border transition shadow-sm ${translations[c.id] ? 'bg-indigo-600 text-white border-indigo-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`} 
                        title="Translate Complaint"
                      >
                        {translatingIds.has(c.id) ? <RefreshCw size={14} className="animate-spin" /> : <GlobeIcon size={14} />}
                      </button>
                      <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg border uppercase tracking-wider ${
                          c.status === 'Resolved' ? 'bg-green-100 text-green-700 border-green-200' :
                          c.status === 'In Progress' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                        {c.status === 'Resolved' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {c.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Complaint Text */}
                <div className="relative mb-6 flex-grow">
                  <p className="text-gray-800 font-semibold text-lg leading-relaxed">
                    "{translations[c.id]?.text || c.text}"
                  </p>
                  {translations[c.id] && (
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full absolute -bottom-4 right-0 flex items-center gap-1 shadow-sm border border-indigo-100 uppercase tracking-tighter">
                      <GlobeIcon size={10} /> Translated by {translations[c.id].engine}
                    </span>
                  )}
                </div>

                {/* Media Thumbnails */}
                {(c.image_urls?.length > 0 || c.image_url || c.video_url) && (
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {c.image_urls?.length > 0 ? c.image_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="flex-shrink-0 relative rounded-xl overflow-hidden shadow-sm border border-gray-200/60 block h-20 w-20 group-hover:border-blue-300 transition-colors">
                        <img src={url} alt={`Attached ${i+1}`} className="object-cover w-full h-full transform hover:scale-110 transition-transform duration-500" />
                      </a>
                    )) : c.image_url && (
                      <a href={c.image_url} target="_blank" rel="noreferrer" className="flex-shrink-0 relative rounded-xl overflow-hidden shadow-sm border border-gray-200/60 block h-20 w-20 group-hover:border-blue-300 transition-colors">
                        <img src={c.image_url} alt="Attached" className="object-cover w-full h-full transform hover:scale-110 transition-transform duration-500" />
                      </a>
                    )}
                    {c.video_url && (
                      <a href={c.video_url} target="_blank" rel="noreferrer" className="flex-shrink-0 flex items-center justify-center bg-indigo-50 rounded-xl h-20 w-20 shadow-sm border border-indigo-100 hover:bg-indigo-100 transition">
                        <span className="text-xs font-bold text-indigo-600 flex flex-col items-center gap-1"><Video size={16} /> Video</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Footer Section */}
                <div className="flex justify-between items-center mt-auto pt-5 border-t border-gray-100/80">
                  {c.latitude && c.longitude ? (
                     <a href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition px-3 py-1.5 rounded-xl shadow-sm tracking-wide">
                      <MapPin size={14} className="text-red-500" />
                      Google Maps
                    </a>
                  ) : (
                    <div className="text-xs text-gray-400 font-bold flex items-center gap-1"><MapPin size={14} /> Location N/A</div>
                  )}

                  <button
                    onClick={() => handleUpvote(c)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-full hover:bg-black transition transform hover:scale-105 active:scale-95 font-bold text-xs tracking-wider shadow-md"
                  >
                    <ThumbsUp size={14} />
                    {c.upvotes || 0} Upvote
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
