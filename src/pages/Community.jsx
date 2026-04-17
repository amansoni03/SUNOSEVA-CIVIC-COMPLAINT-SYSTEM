import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Heart, MessageCircle, Share2, Send, Loader2, User, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Post Creation
  const [newPostText, setNewPostText] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const uploadFile = async (file) => {
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const { error } = await supabase.storage
      .from('images')
      .upload(`public/${fileName}`, file);

    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(`public/${fileName}`);
    return publicUrl;
  };

  // Comments state
  const [commentsMap, setCommentsMap] = useState({});
  const [activeCommentPost, setActiveCommentPost] = useState(null); 
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) setPosts(data);
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!user) return alert("Please sign in to post.");
    if (!newPostText.trim()) return;

    setIsPublishing(true);
    try {
      let imageUrl = null;
      if (mediaFile) {
        imageUrl = await uploadFile(mediaFile);
      }

      const { data, error } = await supabase.from('community_posts').insert([{
        user_id: user.id,
        author_email: user.email,
        content: newPostText,
        image_url: imageUrl
      }]).select();

      if (error) throw error;
      
      setNewPostText('');
      setMediaFile(null);
      setPosts([data[0], ...posts]);
    } catch (err) {
      alert("Error publishing post: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLike = async (post) => {
    if (!user) return alert("Please sign in to like posts.");

    try {
      const { error: likeError } = await supabase.from('post_likes').insert({
        post_id: post.id,
        user_id: user.id
      });

      if (likeError) {
        if (likeError.code === '23505') return alert("You've already liked this post!");
        throw likeError;
      }

      const newPosts = [...posts];
      const postIdx = newPosts.findIndex(p => p.id === post.id);
      newPosts[postIdx].likes_count = (newPosts[postIdx].likes_count || 0) + 1;
      
      setPosts(newPosts);

      await supabase.from('community_posts')
        .update({ likes_count: newPosts[postIdx].likes_count })
        .eq('id', post.id);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComments = async (postId) => {
    if (activeCommentPost === postId) {
      setActiveCommentPost(null);
      return;
    }
    setActiveCommentPost(postId);
    setLoadingComments(true);
    
    const { data } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setCommentsMap(prev => ({...prev, [postId]: data}));
    }
    setLoadingComments(false);
  };

  const handlePostComment = async (postId) => {
    if (!user) return alert("Please sign in to comment.");
    if (!newCommentText.trim()) return;

    try {
      const { data, error } = await supabase.from('post_comments').insert([{
        post_id: postId,
        user_id: user.id,
        author_email: user.email,
        content: newCommentText
      }]).select();

      if (error) throw error;

      setNewCommentText('');
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data[0]]
      }));
    } catch (err) {
      alert("Error posting comment.");
    }
  };

  const handleShare = async (id) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/community#${id}`);
      alert("Post link copied to clipboard!");
    } catch {
      alert("Failed to copy link.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto pt-8 px-4">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 tracking-tight">SunoSeva Community</h1>
        
        {/* Create Post Bar */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-10">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="text-indigo-600" size={20} />
            </div>
            <div className="flex-grow flex flex-col gap-3">
              <textarea 
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Share your thoughts or discuss civic matters..."
                className="w-full text-base resize-none focus:outline-none bg-transparent placeholder-gray-400 text-gray-800"
                rows="3"
                disabled={!user}
              />
              <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer transition text-sm font-semibold">
                  <ImageIcon size={18} className="text-indigo-500" /> 
                  <span className="hidden sm:inline">{mediaFile ? 'Image Attached' : 'Attach Photo'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    if(e.target.files && e.target.files[0]) setMediaFile(e.target.files[0]);
                  }} />
                </label>
                
                <button 
                  onClick={handlePublish}
                  disabled={isPublishing || !user || (!newPostText.trim() && !mediaFile)}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold text-sm rounded-full hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition shadow-sm flex items-center gap-2"
                >
                  {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="text-center py-10 text-gray-500 animate-pulse font-medium">Loading Community Feed...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 text-gray-500 font-medium shadow-sm">
            No posts yet. Be the first to spark a discussion!
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map(post => (
              <div key={post.id} id={post.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                
                {/* Header */}
                <div className="flex gap-3 items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                     {post.author_email ? post.author_email.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{post.author_email ? post.author_email : 'Anonymous Citizen'}</p>
                    <p className="text-xs text-gray-500 font-medium">{post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : 'Just now'}</p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>
                {post.image_url && (
                  <div className="mb-5 rounded-2xl overflow-hidden border border-gray-100 max-h-[400px]">
                    <img src={post.image_url} alt="Post attachment" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-1 border-t border-b border-gray-50 py-1 mb-2">
                  <button onClick={() => handleLike(post)} className="flex-1 flex justify-center gap-2 py-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-red-500 transition font-bold text-sm items-center">
                    <Heart size={18} /> {post.likes_count || 0}
                  </button>
                  <button onClick={() => toggleComments(post.id)} className="flex-1 flex justify-center gap-2 py-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition font-bold text-sm items-center">
                    <MessageCircle size={18} /> Discuss
                  </button>
                  <button onClick={() => handleShare(post.id)} className="flex-1 flex justify-center gap-2 py-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-blue-500 transition font-bold text-sm items-center">
                    <Share2 size={18} /> Share
                  </button>
                </div>

                {/* Comments Section */}
                {activeCommentPost === post.id && (
                  <div className="pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {/* List */}
                    <div className="flex flex-col gap-3 mb-4 max-h-60 overflow-y-auto pr-2">
                      {loadingComments ? (
                        <div className="text-xs text-center text-gray-400 py-2">Loading discussion...</div>
                      ) : commentsMap[post.id]?.length === 0 ? (
                        <div className="text-xs text-center text-gray-400 py-2">No comments yet.</div>
                      ) : (
                        commentsMap[post.id]?.map((comment, i) => (
                          <div key={i} className="flex gap-3 text-sm">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-gray-500 text-xs text-center pt-0.5">
                              {comment.author_email ? comment.author_email.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-3 flex-grow border border-gray-100">
                              <p className="font-bold text-gray-900 text-xs mb-0.5">{comment.author_email || 'User'}</p>
                              <p className="text-gray-700">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Comment Input */}
                    <div className="flex gap-2 items-center">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex-shrink-0 hidden sm:flex items-center justify-center">
                        <User className="text-indigo-600" size={14} />
                      </div>
                      <input 
                        type="text" 
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(post.id); }}
                        placeholder="Write a comment..." 
                        disabled={!user}
                        className="flex-grow bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      />
                      <button 
                        onClick={() => handlePostComment(post.id)}
                        disabled={!user || !newCommentText.trim()}
                        className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-300 transition shrink-0"
                      >
                        <Send size={16} className="-ml-0.5 mt-0.5" />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
