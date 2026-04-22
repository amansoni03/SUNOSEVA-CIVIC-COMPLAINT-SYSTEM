import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Campaigns from './pages/Campaigns';
import Community from './pages/Community';
import IndiaHeatmap from './pages/IndiaHeatmap';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/community" element={<Community />} />
            <Route path="/heatmap" element={<IndiaHeatmap />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
