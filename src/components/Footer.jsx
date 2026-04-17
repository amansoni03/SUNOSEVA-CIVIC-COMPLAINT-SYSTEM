import { Mail, Phone, MapPin, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full glass backdrop-blur-xl border-t border-white/40 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-blue-800 to-green-600 tracking-tight">
                SunoSeva
              </span>
            </Link>
            <p className="text-gray-600 font-medium leading-relaxed max-w-sm mb-6">
              A modern, voice-first approach to reporting civic issues. Empowering citizens to make their voices heard, resolving local challenges with unprecedented speed.
            </p>
            <p className="font-bold text-gray-800 tracking-widest text-sm uppercase">HAR AWAAZ ZAROORI HAI</p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 underline decoration-orange-500 underline-offset-4">Quick Links</h3>
            <ul className="flex flex-col gap-3">
              <li><Link to="/campaigns" className="text-gray-600 hover:text-orange-600 font-bold transition">NGO Campaigns</Link></li>
              <li><Link to="/community" className="text-gray-600 hover:text-green-600 font-bold transition">Community Hub</Link></li>
              <li><Link to="/login" className="text-gray-600 hover:text-blue-800 font-bold transition">Citizen Login</Link></li>
              <li><Link to="/admin" className="text-gray-600 hover:text-blue-800 font-bold transition">Admin Panel</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 underline decoration-green-600 underline-offset-4">Contact Us</h3>
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-3">
                <MapPin size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                <span className="text-gray-600 font-bold text-sm">123 Civic Plaza, Sector 4<br />Lucknow, UP 226001</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={20} className="text-blue-800 flex-shrink-0" />
                <span className="text-gray-600 font-bold text-sm">+91 800-SUNO-SEVA</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={20} className="text-green-600 flex-shrink-0" />
                <span className="text-gray-600 font-bold text-sm">support@sunoseva.in</span>
              </li>
            </ul>
          </div>
          
        </div>
        
        <div className="border-t border-gray-200/80 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 font-bold text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} SunoSeva Civic AI. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm font-black text-gray-500">
            Made with <Heart size={16} className="text-red-500 fill-red-500" /> for India
          </div>
        </div>
      </div>
    </footer>
  );
}
