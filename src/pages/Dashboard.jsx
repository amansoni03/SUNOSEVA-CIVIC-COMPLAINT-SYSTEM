import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Mic, MicOff, Image as ImageIcon, MapPin, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [location, setLocation] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  // Redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchMyHistory();
    }
  }, [user, authLoading, navigate]);

  const fetchMyHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setMyComplaints(data);
    }
    setLoadingHistory(false);
  };

  // Setup SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false; // Set to false to prevent repeated overlapping inputs

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript.trim()) {
          setText((prev) => prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim());
        }
      };
      
      recognitionRef.current.onerror = (e) => {
        console.error("Speech recognition error", e.error);
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop Web Speech
      recognitionRef.current?.stop();
      // Stop MediaRecorder
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Start Web Speech
        recognitionRef.current?.start();
        
        // Start MediaRecorder
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        setAudioPreviewUrl(null);
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setAudioPreviewUrl(url);
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied or error:", err);
        alert("Could not access microphone.");
      }
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        alert("Could not fetch location.");
      }
    );
  };

  const handleMediaChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setMediaFiles(Array.from(e.target.files).slice(0, 3));
    }
  };

  const uploadFile = async (file, bucket) => {
    const fileExt = file.name ? file.name.split('.').pop() : 'webm';
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`public/${fileName}`, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(`public/${fileName}`);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      setSubmitError("Please provide a description (via voice or text).");
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      let imageUrls = [];
      let videoUrl = null;
      let audioUrl = null;

      // Advanced NLP Automatic Categorization algorithm based on keywords
      let category = "General";
      const lowerText = text.toLowerCase();
      
      const categoriesList = [
        { name: 'Water Supply', keywords: ['water', 'pipe', 'leak', 'dry', 'supply', 'drinking', 'tap', 'pani', 'paani'] },
        { name: 'Fire Management', keywords: ['fire', 'smoke', 'burning', 'flame', 'cylinder', 'aag'] },
        { name: 'Garbage Management', keywords: ['garbage', 'trash', 'waste', 'dustbin', 'dump', 'smell', 'kachra', 'smelly'] },
        { name: 'Sewer Management', keywords: ['sewer', 'drain', 'overflow', 'gutter', 'block', 'stagnant', 'naala', 'nala'] },
        { name: 'Roads & Potholes', keywords: ['road', 'pothole', 'street', 'crack', 'broken', 'sadak', 'gaddha', 'highway'] },
        { name: 'Electricity & Power', keywords: ['electricity', 'power', 'light', 'outage', 'wire', 'pole', 'transformer', 'bijli', 'current'] },
        { name: 'Stray Animals', keywords: ['stray', 'animal', 'dog', 'cow', 'monkey', 'cattle', 'kutta', 'janwar'] },
        { name: 'Traffic & Transport', keywords: ['traffic', 'jam', 'signal', 'bus', 'auto', 'transport', 'parking'] },
        { name: 'Parks & Public Spaces', keywords: ['park', 'playground', 'bench', 'garden', 'maidan'] },
        { name: 'Public Health', keywords: ['hospital', 'clinic', 'mosquito', 'dengue', 'machhar', 'bimari', 'disease', 'sanitation'] },
        { name: 'Noise Pollution', keywords: ['noise', 'loud', 'speaker', 'dj', 'shor', 'loudspeaker'] },
        { name: 'Illegal Encroachment', keywords: ['illegal', 'construction', 'occupy', 'kabza', 'footpath', 'encroachment'] },
        { name: 'Street Lighting', keywords: ['street light', 'dark', 'bulb', 'lamp', 'andhera'] },
        { name: 'Public Washrooms', keywords: ['toilet', 'public bath', 'washroom', 'shauchalaya', 'sulabh'] }
      ];

      for (const cat of categoriesList) {
        if (cat.keywords.some(kw => lowerText.includes(kw))) {
          category = cat.name;
          break;
        }
      }

      // 1. Upload chosen Media (Multiple Images or Video)
      if (mediaFiles && mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const type = file.type.startsWith('video') ? 'videos' : 'images';
          const url = await uploadFile(file, type);
          if (type === 'videos') {
            videoUrl = url;
          } else {
            imageUrls.push(url);
          }
        }
      }

      // 2. Upload Audio File if chunks exist
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioUrl = await uploadFile(audioBlob, 'audio');
      }

      // 3. Generate Tracking ID & Insert into Database
      const generatedTrackingId = 'TRK-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error } = await supabase
        .from('complaints')
        .insert({
          tracking_id: generatedTrackingId,
          user_id: user.id,
          text,
          category,
          status: 'Pending',
          image_url: imageUrls.length > 0 ? imageUrls[0] : null,
          image_urls: imageUrls,
          video_url: videoUrl,
          audio_url: audioUrl,
          latitude: location?.lat,
          longitude: location?.lng,
        });

      if (error) throw error;

      alert(`Complaint submitted successfully! Your Tracking ID is: ${generatedTrackingId}`);
      
      // Clear form
      setText('');
      setMediaFiles([]);
      setLocation(null);
      audioChunksRef.current = [];
      setAudioPreviewUrl(null);

      // Refresh history
      fetchMyHistory();

    } catch (err) {
      console.error(err);
      setSubmitError(err.message || "Failed to submit complaint.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Citizen Dashboard</h1>
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline font-medium">Home Feed</button>
      </div>
      
      <div className="glass rounded-3xl p-6 shadow-sm mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">New Complaint</h2>
        
        {submitError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-xl">
            {submitError}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Voice Input Section */}
          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col items-center justify-center relative overflow-hidden">
            {isRecording && <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none"></div>}
            
            <button 
              onClick={toggleRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all mb-4 z-10 ${isRecording ? 'bg-red-500 text-white scale-110 hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'}`}
            >
              {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
            </button>
            <p className={`text-sm font-medium text-center z-10 ${isRecording ? 'text-red-700' : 'text-blue-800'}`}>
              {isRecording ? 'Recording (Tap to Stop)' : 'Tap to Speak'}
            </p>
            <p className="text-xs text-center text-blue-600/70 mt-1 z-10">We'll transcribe your voice into text automatically.</p>
            
            {audioPreviewUrl && !isRecording && (
              <div className="mt-6 w-full flex flex-col items-center z-10 bg-white/60 p-4 rounded-xl shadow-sm border border-blue-100">
                <p className="text-sm font-bold text-gray-700 mb-2">Voice Recording Preview</p>
                <audio src={audioPreviewUrl} controls className="w-full max-w-sm h-10 mb-2" />
                <button 
                  onClick={() => { setAudioPreviewUrl(null); audioChunksRef.current = []; }}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
                >
                  Discard Audio
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm bg-white/70 resize-none"
              rows="4"
              placeholder="Describe your issue here or use the voice recorder..."
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition cursor-pointer">
              <ImageIcon size={20} />
              <span className="text-sm font-medium px-2 text-center">
                {mediaFiles.length > 0 ? `${mediaFiles.length} file(s) selected` : 'Upload Media (Max 3)'}
              </span>
              <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleMediaChange} />
            </label>

            <button 
              onClick={handleGetLocation}
              className={`flex items-center justify-center gap-2 py-3 border rounded-xl font-medium transition ${location ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
            >
              <MapPin size={20} />
              {location ? 'Location Added' : 'Get Location'}
            </button>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="mt-2 w-full flex items-center justify-center py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-md disabled:bg-gray-700"
          >
            {isSubmitting ? <><Loader2 className="animate-spin mr-2" /> Submitting...</> : 'Submit Complaint'}
          </button>
        </div>
      </div>

      {/* Complaint History Section */}
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Complaint History</h2>
      {loadingHistory ? (
        <div className="text-center text-gray-500 py-8">Loading history...</div>
      ) : myComplaints.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center text-gray-500 font-medium">You haven't submitted any complaints yet.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {myComplaints.map(c => (
            <div key={c.id} className="glass rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 hover:shadow-md transition">
              <div>
                <p className="font-semibold text-gray-900 line-clamp-2 mb-2">{c.text}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-700 font-bold">{c.category || 'General'}</span>
                  <span>{c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : 'N/A'}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                 <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm border ${
                   c.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                   c.status === 'In Progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                   'bg-gray-50 text-gray-600 border-gray-200'
                 }`}>
                   {c.status === 'Resolved' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                   {c.status}
                 </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
