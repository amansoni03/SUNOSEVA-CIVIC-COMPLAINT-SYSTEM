import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { User, LogOut, LayoutDashboard, Settings, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (user) {
      const getProfile = async () => {
        const { data } = await supabase.from('profiles').select('avatar_url,full_name').eq('id', user.id).maybeSingle();
        if (data) setProfile(data);
      }
      getProfile();
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass backdrop-blur-xl shadow-sm border-b border-white/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-blue-800 to-green-600 tracking-tight group-hover:opacity-80 transition">
              SunoSeva
            </span>
          </Link>

          <div className="flex items-center gap-6 flex-grow ml-8 hidden md:flex">
            <Link to="/campaigns" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition">Campaigns</Link>
            <Link to="/community" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition">Community</Link>
            {user && (
              <Link to="/profile" className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition shadow-sm flex items-center gap-1.5 ml-2">
                <Search size={14} /> Track Status
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/60 transition border border-transparent hover:border-gray-200"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.email ? user.email.charAt(0).toUpperCase() : <User size={16} />
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-700 hidden sm:block max-w-[150px] truncate">
                    {user.email}
                  </span>
                </button>

                {dropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
                      <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                        <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1">Signed in as</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                      </div>
                      <div className="p-2 flex flex-col gap-1">
                        <Link 
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 text-sm font-bold text-gray-700 transition"
                        >
                          <Settings size={16} className="text-gray-500" /> My Profile
                        </Link>
                        <Link 
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 text-sm font-bold text-gray-700 transition"
                        >
                          <LayoutDashboard size={16} className="text-blue-500" /> Dashboard
                        </Link>
                        <button 
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm font-bold text-red-600 transition"
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link 
                to="/login"
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition shadow-md"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
