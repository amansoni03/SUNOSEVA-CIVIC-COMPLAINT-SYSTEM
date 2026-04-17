import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Calendar, Target, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('start_date', { ascending: true });
    
    if (!error && data) {
      setCampaigns(data);
    }
    setLoading(false);
  };

  const seedCampaigns = async () => {
    const samples = [
      {
        title: "City Center River Cleanup",
        description: "Join hundreds of volunteers to help clean the waste around our beautiful central riverwalk. We will be providing gloves, bags, and safety equipment. Let's make our water sources pristine again!",
        objective: "Remove 500kg of plastic waste",
        category: "Cleaning",
        location: "Downtown Riverwalk Area",
        image_url: "https://images.unsplash.com/photo-1618477461853-cf6ed80fbfc9?q=80&w=2070&auto=format&fit=crop",
        start_date: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
      },
      {
        title: "Winter Relief Clothes Donation",
        description: "As the winter approaches fast, thousands of homeless citizens are left without warm clothing. We are organizing a massive drive to collect and distribute jackets, blankets, and socks.",
        objective: "Distribute clothes to 1000+ people",
        category: "Social Welfare",
        location: "Main Central Square",
        image_url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2070&auto=format&fit=crop",
        start_date: new Date(Date.now() + 86400000 * 12).toISOString(), // 12 days from now
      },
      {
        title: "Tree Planting Initiative 2026",
        description: "Help us combat the urban heat island effect by planting over 200 native trees along the highway edges. Bring your family and teach the kids about the environment!",
        objective: "Plant 200 Native Saplings",
        category: "Environment",
        location: "Highway 9 Greenspace",
        image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2026&auto=format&fit=crop",
        start_date: new Date(Date.now() + 86400000 * 20).toISOString(),
      }
    ];

    await supabase.from('campaigns').insert(samples);
    fetchCampaigns();
  };

  const handleJoin = () => {
    alert("Thank you for your interest! Registration for this campaign will open shortly.");
  };

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="pt-20 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-300/30 blur-[100px] rounded-full point-events-none"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <Link to="/" className="text-blue-600 font-bold hover:underline mb-6 inline-block">← Back to Dashboard</Link>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
            Make a Real Impact
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
            Join ongoing civic campaigns, welfare distributions, and cleanups led by local NGOs and community heroes.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {loading ? (
          <div className="text-center text-gray-500 font-medium py-20 animate-pulse">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Campaigns Yet</h2>
            <p className="text-gray-500 mb-8">It looks like the campaign list is empty.</p>
            <button 
              onClick={seedCampaigns}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md"
            >
              Load Sample Campaigns (Admin)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.map((camp) => (
              <div key={camp.id} className="glass rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full bg-white/60">
                {/* Image Section */}
                <div className="relative h-60 w-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                  {camp.image_url ? (
                    <img 
                      src={camp.image_url} 
                      alt={camp.title} 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Target className="text-gray-400" size={48} />
                    </div>
                  )}
                  <span className="absolute top-4 left-4 z-20 px-3 py-1 bg-white/90 backdrop-blur-md text-blue-800 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
                    {camp.category || 'General'}
                  </span>
                </div>

                {/* Content Section */}
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{camp.title}</h3>
                  <p className="text-gray-600 text-sm mb-6 flex-grow line-clamp-3 leading-relaxed">
                    {camp.description}
                  </p>

                  <div className="space-y-3 mb-8 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                      <Calendar size={18} className="text-blue-500" />
                      {camp.start_date ? format(new Date(camp.start_date), 'MMMM do, yyyy • h:mm a') : 'TBA'}
                    </div>
                    <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                      <MapPin size={18} className="text-red-500" />
                      {camp.location || 'Location Pending'}
                    </div>
                    <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                      <Target size={18} className="text-green-500" />
                      {camp.objective || 'Community Support'}
                    </div>
                  </div>

                  <button 
                    onClick={handleJoin}
                    className="w-full py-4 bg-gray-900 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors shadow-md flex items-center justify-center gap-2 mt-auto"
                  >
                    <Users size={18} />
                    Register to Join
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
