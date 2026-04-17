import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      let result;
      const cleanEmail = email.trim().replace(/^["']|["']$/g, '');
      if (isLogin) {
        result = await signIn({ email: cleanEmail, password });
      } else {
        result = await signUp({ 
          email: cleanEmail, 
          password,
          options: {
            data: {
              full_name: name,
              age: age ? parseInt(age, 10) : null,
              gender
            }
          }
        });
      }
      
      if (result?.error) {
        setErrorMsg(result.error.message);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 z-0 overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 z-[-1] bg-gradient-to-br from-[#f6f8fb] to-[#e2e8f0]">
        <motion.div 
          animate={{ x: [-30, 30, -30], y: [-20, 20, -20], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[20%] w-72 h-72 lg:w-96 lg:h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"
        />
        <motion.div 
          animate={{ x: [30, -30, 30], y: [30, -10, 30], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] right-[20%] w-80 h-80 lg:w-[28rem] lg:h-[28rem] bg-green-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30"
        />
        <motion.div 
          animate={{ x: [-20, 20, -20], y: [40, -40, 40], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[10%] left-[40%] w-96 h-96 lg:w-[32rem] lg:h-[32rem] bg-blue-800 rounded-full mix-blend-multiply filter blur-[100px] opacity-20"
        />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass rounded-[2rem] p-8 md:p-10 max-w-md w-full shadow-2xl relative z-10"
      >
        <div className="text-center mb-8 relative">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="inline-block px-5 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-green-50 border border-t-white border-l-white border-b-orange-100 border-r-orange-100 shadow-[4px_4px_10px_rgba(0,0,0,0.05),-4px_-4px_10px_rgba(255,255,255,0.8)] mb-6 transform hover:scale-105 transition"
          >
            <motion.p 
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="text-xs md:text-sm font-extrabold text-transparent bg-clip-text bg-[length:200%_auto] bg-gradient-to-r from-orange-600 via-green-600 to-orange-600 tracking-[0.2em] uppercase origin-center"
            >
              HAR AWAAZ ZAROORI HAI
            </motion.p>
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.h1 
              key={isLogin ? 'login' : 'signup'}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.05)" }}
            >
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </motion.h1>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p 
              key={`desc-${isLogin}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-gray-500 font-medium"
            >
              {isLogin ? 'Sign in to report and track issues' : 'Join us to make your city better'}
            </motion.p>
          </AnimatePresence>
        </div>
        
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm bg-white/70" 
                  placeholder="John Doe"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input 
                    type="number" 
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                    min="1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm bg-white/70" 
                    placeholder="25"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm bg-white/70 bg-white"
                  >
                    <option value="" disabled>Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm bg-white/70" 
              placeholder="citizen@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm bg-white/70" 
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="mt-4 w-full py-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl font-bold transition transform shadow-[0_8px_15px_rgba(249,115,22,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_12px_20px_rgba(249,115,22,0.5),inset_0_1px_1px_rgba(255,255,255,0.5)] hover:-translate-y-1 active:translate-y-1 active:shadow-md disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-orange-600 font-medium hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
