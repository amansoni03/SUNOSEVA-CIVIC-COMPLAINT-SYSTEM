import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl:markerIcon2x, iconUrl:markerIcon, shadowUrl:markerShadow });

/* ── Tile URLs ───────────────────────────────────────────────── */
// Using *_all variants — they include labels in one request; most reliable on CARTO CDN
const TILE_URL = {
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
};
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>';


/* ── Inline simpleheat ────────────────────────────────────────────────────── */
function simpleheat(canvas) {
  const ctx = canvas.getContext('2d');
  let W = canvas.width, H = canvas.height, max = 1, data = [], circle, r, grad;
  const dGrad = { 0.1:'#0ea5e9', 0.3:'#f97316', 0.55:'#ef4444', 0.8:'#7c3aed', 1:'#1e1b4b' };

  function setR(radius, blur=15) {
    const c=document.createElement('canvas'); r=radius+blur;
    c.width=c.height=r*2;
    const cx=c.getContext('2d');
    cx.shadowOffsetX=cx.shadowOffsetY=r*2; cx.shadowBlur=blur; cx.shadowColor='black';
    cx.beginPath(); cx.arc(-r*2,-r*2,radius,0,Math.PI*2,true); cx.closePath(); cx.fill();
    circle=c;
  }
  function setGrad(stops) {
    const c=document.createElement('canvas'); c.width=1; c.height=256;
    const cx=c.getContext('2d'), g=cx.createLinearGradient(0,0,0,256);
    for (const k in stops) g.addColorStop(+k, stops[k]);
    cx.fillStyle=g; cx.fillRect(0,0,1,256);
    grad=cx.getImageData(0,0,1,256).data;
  }
  function draw(minOp=0.05) {
    if (!circle) setR(25); if (!grad) setGrad(dGrad);
    ctx.clearRect(0,0,W,H);
    for (const p of data) {
      ctx.globalAlpha=Math.max(p[2]/max, minOp);
      ctx.drawImage(circle, p[0]-r, p[1]-r);
    }
    const img=ctx.getImageData(0,0,W,H), d=img.data;
    for (let i=0;i<d.length;i+=4) { const j=d[i+3]*4; if(j){d[i]=grad[j];d[i+1]=grad[j+1];d[i+2]=grad[j+2];} }
    ctx.putImageData(img,0,0);
  }
  return {
    data(d){data=d;return this;}, max(m){max=m;return this;},
    radius(rad,blur){setR(rad,blur);return this;},
    gradient(g){setGrad(g);return this;},
    resize(w,h){W=w;H=h;}, draw,
  };
}

/* ── HeatLayer ────────────────────────────────────────────────────────────── */
const HeatLayer = L.Layer.extend({
  initialize(ll,opts){this._ll=ll;L.setOptions(this,opts);},
  setLatLngs(ll){this._ll=ll;return this.redraw();},
  redraw(){if(this._heat&&this._map)this._redraw();return this;},
  onAdd(map){
    this._map=map;
    if(!this._canvas)this._initCanvas();
    map.getPanes().overlayPane.appendChild(this._canvas);
    map.on('moveend',this._reset,this);
    if(map.options.zoomAnimation&&L.Browser.any3d) map.on('zoomanim',this._animZoom,this);
    this._reset();
  },
  onRemove(map){
    try{map.getPanes().overlayPane.removeChild(this._canvas);}catch{}
    map.off('moveend',this._reset,this); map.off('zoomanim',this._animZoom,this);
  },
  _initCanvas(){
    const c=this._canvas=L.DomUtil.create('canvas','leaflet-layer');
    c.style.pointerEvents='none';
    const s=this._map.getSize(); c.width=s.x; c.height=s.y;
    const anim=this._map.options.zoomAnimation&&L.Browser.any3d;
    L.DomUtil.addClass(c,'leaflet-zoom-'+(anim?'animated':'hide'));
    this._heat=simpleheat(c);
    this._heat.radius(this.options.radius||25, this.options.blur);
    if(this.options.gradient) this._heat.gradient(this.options.gradient);
  },
  _reset(){
    const tl=this._map.containerPointToLayerPoint([0,0]);
    L.DomUtil.setPosition(this._canvas,tl);
    const s=this._map.getSize();
    this._canvas.width=s.x; this._canvas.height=s.y;
    this._heat.resize(s.x,s.y); this._redraw();
  },
  _redraw(){
    const o=this.options, r=(o.radius||25)+(o.blur||15);
    const s=this._map.getSize(), bounds=new L.Bounds(L.point([-r,-r]),s.add([r,r]));
    const max=o.max||1, mz=o.maxZoom||this._map.getMaxZoom();
    const v=1/Math.pow(2,Math.max(0,Math.min(mz-this._map.getZoom(),12)));
    const cs=r/2, grid=[], pp=this._map._getMapPanePos();
    const ox=pp.x%cs, oy=pp.y%cs, d=[];
    for(const ll of this._ll){
      const p=this._map.latLngToContainerPoint(ll);
      if(!bounds.contains(p)) continue;
      const x=Math.floor((p.x-ox)/cs)+2, y=Math.floor((p.y-oy)/cs)+2;
      const alt=(ll[2]!==undefined?ll[2]:1)*v;
      grid[y]=grid[y]||[];
      const c=grid[y][x];
      if(!c) grid[y][x]=[p.x,p.y,alt];
      else{c[0]=(c[0]*c[2]+p.x*alt)/(c[2]+alt);c[1]=(c[1]*c[2]+p.y*alt)/(c[2]+alt);c[2]+=alt;}
    }
    for(const row of grid) if(row) for(const cell of row) if(cell) d.push(cell);
    this._heat.data(d).draw(o.minOpacity??0.05);
  },
  _animZoom(e){
    const scale=this._map.getZoomScale(e.zoom);
    const off=this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());
    if(L.DomUtil.setTransform) L.DomUtil.setTransform(this._canvas,off,scale);
  },
});
const heatLayer=(ll,opts)=>new HeatLayer(ll,opts);

/* ── Constants ────────────────────────────────────────────────────────────── */
const CAT_COLORS = {
  Roads:'#f97316', Water:'#3b82f6', Sanitation:'#16a34a',
  Electricity:'#eab308', Drainage:'#8b5cf6',
  'Street Lights':'#f59e0b', Garbage:'#ef4444', Parks:'#22c55e',
};

const DEMO = [
  {lat:19.076,lng:72.877,count:120,category:'Roads',status:'Pending'},
  {lat:19.021,lng:72.833,count:80,category:'Water',status:'Resolved'},
  {lat:19.113,lng:72.856,count:60,category:'Drainage',status:'In Progress'},
  {lat:28.704,lng:77.102,count:200,category:'Roads',status:'Pending'},
  {lat:28.632,lng:77.218,count:140,category:'Garbage',status:'Pending'},
  {lat:28.549,lng:77.257,count:90,category:'Electricity',status:'In Progress'},
  {lat:28.672,lng:77.446,count:70,category:'Water',status:'Resolved'},
  {lat:26.846,lng:80.946,count:160,category:'Roads',status:'Pending'},
  {lat:26.912,lng:81.001,count:110,category:'Sanitation',status:'In Progress'},
  {lat:26.768,lng:80.890,count:95,category:'Drainage',status:'Pending'},
  {lat:26.850,lng:80.970,count:55,category:'Electricity',status:'Resolved'},
  {lat:12.971,lng:77.594,count:180,category:'Roads',status:'Pending'},
  {lat:12.937,lng:77.627,count:120,category:'Water',status:'In Progress'},
  {lat:13.030,lng:77.568,count:75,category:'Electricity',status:'Resolved'},
  {lat:13.083,lng:80.270,count:130,category:'Drainage',status:'Pending'},
  {lat:13.053,lng:80.250,count:90,category:'Garbage',status:'In Progress'},
  {lat:22.572,lng:88.364,count:150,category:'Roads',status:'Pending'},
  {lat:22.542,lng:88.386,count:100,category:'Sanitation',status:'In Progress'},
  {lat:17.385,lng:78.487,count:165,category:'Roads',status:'Pending'},
  {lat:17.441,lng:78.527,count:85,category:'Water',status:'Resolved'},
  {lat:26.912,lng:75.787,count:105,category:'Garbage',status:'Pending'},
  {lat:23.022,lng:72.571,count:125,category:'Roads',status:'In Progress'},
  {lat:18.519,lng:73.856,count:145,category:'Drainage',status:'Pending'},
  {lat:25.594,lng:85.137,count:115,category:'Sanitation',status:'Pending'},
  {lat:23.259,lng:77.412,count:90,category:'Electricity',status:'In Progress'},
  {lat:30.733,lng:76.779,count:70,category:'Roads',status:'Resolved'},
  {lat:21.170,lng:72.831,count:110,category:'Garbage',status:'Pending'},
  {lat:21.145,lng:79.088,count:95,category:'Water',status:'In Progress'},
  {lat:17.686,lng:83.218,count:130,category:'Roads',status:'Pending'},
  {lat:22.719,lng:75.857,count:100,category:'Sanitation',status:'Resolved'},
];

function calcStats(pts) {
  const s = f => pts.filter(f).reduce((a,p)=>a+(p.count||1),0);
  return { total:s(()=>true), pending:s(p=>p.status==='Pending'), progress:s(p=>p.status==='In Progress'), resolved:s(p=>p.status==='Resolved') };
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function IndiaHeatmap() {
  const mapDiv     = useRef(null);
  const mapRef     = useRef(null);
  const layerRef   = useRef(null);
  const tileRef    = useRef(null);   // single tile layer

  const [points,     setPoints]    = useState(DEMO);
  const [source,     setSource]    = useState('demo');
  const [fetching,   setFetching]  = useState(true);
  const [mode,       setMode]      = useState('heat');
  const [catFilter,  setCatFilter] = useState('All');
  const [statusFilt, setStatusFilt]= useState('All');
  const [st,         setSt]        = useState(calcStats(DEMO));
  const [mapTheme,   setMapTheme]  = useState('dark');
  // Complaints that exist in DB but have NO GPS — shown in a sidebar panel
  const [noGps,      setNoGps]     = useState([]);  // [{category, count}]
  const [totalAll,   setTotalAll]  = useState(0);   // all complaints in DB

  /* ── Init map ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return;
    if (mapDiv.current._leaflet_id) mapDiv.current._leaflet_id = null;

    const map = L.map(mapDiv.current, {
      center: [22.5, 78.9], zoom: 5,
      minZoom: 4, maxZoom: 14,
      maxBounds: [[5,60],[40,100]],
      maxBoundsViscosity: 0.8,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    // Kick off initial tile load by adding the first tile layer here
    tileRef.current = L.tileLayer(TILE_URL.dark, {
      attribution: TILE_ATTR, subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  /* ── Swap tile when mapTheme changes ──────────────────────── */
  const themeInitDone = useRef(false);
  useEffect(() => {
    // Skip the very first run — init effect already added dark tiles
    if (!themeInitDone.current) { themeInitDone.current = true; return; }
    if (!mapRef.current) return;

    // Remove old layer, create a brand-new one (full tile cache flush)
    if (tileRef.current) {
      try { mapRef.current.removeLayer(tileRef.current); } catch {}
    }
    tileRef.current = L.tileLayer(TILE_URL[mapTheme], {
      attribution: TILE_ATTR,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapRef.current);
  }, [mapTheme]);


  /* ── Fetch ALL complaints, split GPS vs no-GPS ──────────────────────── */
  useEffect(() => {
    let dead = false;
    const t = setTimeout(() => { if (!dead) setFetching(false); }, 8000);

    supabase
      .from('complaints')
      .select('latitude,longitude,category,status')
      .then(({ data, error }) => {
        clearTimeout(t);
        if (dead) return;
        if (!error && data && data.length > 0) {
          setSource('supabase');
          setTotalAll(data.length);

          // Split: GPS-tagged (can be plotted) vs missing coords
          const withGps    = data.filter(d => d.latitude  != null && d.longitude != null);
          const withoutGps = data.filter(d => d.latitude  == null || d.longitude == null);

          // Build GPS points for map
          if (withGps.length > 0) {
            const mapped = withGps.map(d => ({
              lat: d.latitude, lng: d.longitude, count: 1,
              category: d.category || 'General',
              status:   d.status   || 'Pending',
            }));
            setPoints(mapped);
            setSt(calcStats(mapped));
          }

          // Build no-GPS summary grouped by category
          if (withoutGps.length > 0) {
            const grouped = {};
            withoutGps.forEach(d => {
              const cat = d.category || 'General';
              grouped[cat] = (grouped[cat] || 0) + 1;
            });
            setNoGps(Object.entries(grouped)
              .map(([cat, cnt]) => ({ cat, cnt }))
              .sort((a, b) => b.cnt - a.cnt));
          }
        }
        setFetching(false);
      })
      .catch(() => { clearTimeout(t); if (!dead) setFetching(false); });

    return () => { dead = true; clearTimeout(t); };
  }, []);

  /* ── Redraw data layer ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current) return;
    const filtered = points.filter(p=>(catFilter==='All'||p.category===catFilter)&&(statusFilt==='All'||p.status===statusFilt));
    setSt(calcStats(filtered));
    if(layerRef.current){try{mapRef.current.removeLayer(layerRef.current);}catch{}layerRef.current=null;}

    if(mode==='heat'){
      const hData=filtered.map(p=>[p.lat,p.lng,Math.min((p.count||1)/50,1)]);
      layerRef.current=heatLayer(hData,{
        radius:40,blur:25,maxZoom:10,max:1,
        gradient:{0.1:'#22c55e',0.35:'#f97316',0.65:'#ef4444',0.85:'#1d4ed8',1:'#1e1b4b'},
        minOpacity:0.45,
      }).addTo(mapRef.current);
    } else {
      const grp=L.layerGroup();
      filtered.forEach(p=>{
        const col=CAT_COLORS[p.category]||'#f97316';
        L.circleMarker([p.lat,p.lng],{
          radius:Math.max(6,Math.min(22,(p.count||1)/8)),
          color:col,fillColor:col,fillOpacity:0.8,weight:2,
        }).bindPopup(`
          <div style="font-family:system-ui;padding:4px 2px;min-width:140px">
            <div style="font-weight:800;font-size:13px;color:#1e293b;margin-bottom:4px">📍 ${p.category}</div>
            <div style="font-size:12px;color:#64748b">Status: <b style="color:#1e293b">${p.status}</b></div>
            <div style="font-size:12px;color:#64748b">Reports: <b style="color:#1e293b">${p.count||1}</b></div>
          </div>
        `).addTo(grp);
      });
      layerRef.current=grp.addTo(mapRef.current);
    }
  }, [points, mode, catFilter, statusFilt]);

  const cats     = ['All',...Object.keys(CAT_COLORS)];
  const statuses = ['All','Pending','In Progress','Resolved'];
  const isDark   = mapTheme==='dark';

  return (
    <div style={{
      position:'relative', width:'100%',
      height:'calc(100vh - 64px)',
      display:'flex', flexDirection:'column',
      fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
      overflow:'hidden',
      /* Match home page: saffron–white–green tricolor fade */
      background:'linear-gradient(135deg, rgba(255,153,51,0.18) 0%, rgba(255,255,255,0.95) 35%, rgba(255,255,255,0.95) 65%, rgba(19,136,8,0.15) 100%)',
    }}>
      <style>{`
        @keyframes hm-spin{to{transform:rotate(360deg)}}
        /* ── Light map (default) ── */
        .leaflet-container.light-map{background:#e8eff5!important;}
        /* ── Dark map ── */
        .leaflet-container.dark-map{background:#0c1120!important;}
        .leaflet-control-zoom a{
          background:rgba(255,255,255,0.95)!important;
          color:#1e293b!important;
          border-color:#e2e8f0!important;
          font-weight:700!important;
          box-shadow:0 2px 8px rgba(0,0,0,0.12)!important;
        }
        .leaflet-control-zoom a:hover{background:#f1f5f9!important;}
        .leaflet-control-attribution{font-size:9px!important;background:rgba(255,255,255,0.75)!important;}
        .leaflet-popup-content-wrapper{border-radius:12px!important;box-shadow:0 8px 30px rgba(0,0,0,0.15)!important;}
        .leaflet-popup-tip{background:#fff!important;}
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
          HEADER PANEL — glass card matching home page
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        flexShrink:0,
        background:'linear-gradient(135deg,rgba(255,255,255,0.88),rgba(255,255,255,0.72))',
        backdropFilter:'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.9)',
        boxShadow:'0 4px 24px rgba(0,0,0,0.06)',
        padding:'0 20px',
      }}>
        {/* ── Row 1: Title + badges ── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0 10px',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            {/* India-flag gradient icon */}
            <div style={{
              width:38,height:38,borderRadius:'12px',flexShrink:0,
              background:'linear-gradient(135deg,#f97316 0%,#fff 50%,#16a34a 100%)',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 4px 14px rgba(249,115,22,0.35)',
              border:'1.5px solid rgba(255,255,255,0.8)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <div style={{fontSize:'17px',fontWeight:900,color:'#1e293b',letterSpacing:'-0.4px',lineHeight:1.2}}>
                India Civic Complaint Heatmap
              </div>
              <div style={{fontSize:'11px',color:'#64748b',marginTop:'2px',fontWeight:600}}>
                SunoSeva · Real-time grievance density across India
              </div>
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            {/* Live data badge */}
            <div style={{
              display:'flex',alignItems:'center',gap:'5px',
              padding:'5px 12px',borderRadius:'999px',fontSize:'11px',fontWeight:700,
              background: source==='supabase'
                ? 'linear-gradient(135deg,rgba(22,163,74,0.12),rgba(22,163,74,0.06))'
                : 'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(249,115,22,0.06))',
              border: source==='supabase' ? '1px solid rgba(22,163,74,0.35)' : '1px solid rgba(249,115,22,0.35)',
              color: source==='supabase' ? '#16a34a' : '#ea580c',
              boxShadow:'0 2px 8px rgba(0,0,0,0.05)',
            }}>
              {fetching
                ? <><div style={{width:8,height:8,border:'2px solid rgba(249,115,22,0.3)',borderTopColor:'#f97316',borderRadius:'50%',animation:'hm-spin 0.7s linear infinite'}}/> Syncing…</>
                : <>{source==='supabase'?'📡 Live Supabase':'⚡ Demo · 30 cities'}</>
              }
            </div>

            {/* ✅ DARK / LIGHT MAP TOGGLE */}
            <button
              onClick={()=>setMapTheme(t=>t==='dark'?'light':'dark')}
              title={isDark ? 'Switch to Light Map' : 'Switch to Dark Map'}
              style={{
                display:'flex',alignItems:'center',gap:'7px',
                padding:'6px 14px',borderRadius:'999px',
                border:'1.5px solid rgba(0,0,0,0.1)',
                background:'rgba(255,255,255,0.9)',
                boxShadow:'0 2px 10px rgba(0,0,0,0.08)',
                cursor:'pointer',fontWeight:700,fontSize:'12px',
                color:'#1e293b',transition:'all 0.2s',
              }}
            >
              {/* Animated toggle pill */}
              <div style={{
                width:34,height:18,borderRadius:'999px',position:'relative',
                background:isDark?'#1e293b':'#f59e0b',
                transition:'background 0.3s',flexShrink:0,
              }}>
                <div style={{
                  position:'absolute',top:2,
                  left:isDark?2:16,
                  width:14,height:14,borderRadius:'50%',
                  background:'#fff',transition:'left 0.3s',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.3)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'8px',
                }}>
                  {isDark?'🌙':'☀️'}
                </div>
              </div>
              {isDark ? 'Dark Map' : 'Light Map'}
            </button>
          </div>
        </div>

        {/* ── Row 2: Stats + Controls ── */}
        <div style={{display:'flex',alignItems:'stretch',overflowX:'auto',gap:0}}>

          {/* Stats */}
          {[
            {label:'Total',     val:st.total,    color:'#1d4ed8', dot:'#3b82f6'},
            {label:'Pending',   val:st.pending,  color:'#c2410c', dot:'#f97316'},
            {label:'In Progress',val:st.progress,color:'#b45309', dot:'#f59e0b'},
            {label:'Resolved',  val:st.resolved, color:'#15803d', dot:'#22c55e'},
          ].map((s,i)=>(
            <div key={i} style={{
              display:'flex',alignItems:'center',gap:'8px',
              padding:'10px 16px',borderRight:'1px solid rgba(0,0,0,0.06)',flexShrink:0,
            }}>
              <div style={{
                width:8,height:8,borderRadius:'50%',background:s.dot,flexShrink:0,
                boxShadow:`0 0 8px ${s.dot}cc`,
              }}/>
              <span style={{fontSize:'20px',fontWeight:900,color:s.color}}>{s.val.toLocaleString()}</span>
              <span style={{fontSize:'10px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{s.label}</span>
            </div>
          ))}

          <div style={{width:'1px',background:'rgba(0,0,0,0.06)',flexShrink:0}}/>

          {/* Controls */}
          <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 14px',flexShrink:0,flexWrap:'wrap'}}>
            {/* View mode */}
            <div style={{display:'flex',background:'rgba(0,0,0,0.05)',borderRadius:'10px',border:'1px solid rgba(0,0,0,0.08)',overflow:'hidden'}}>
              {[{id:'heat',label:'🔥 Heatmap'},{id:'markers',label:'📍 Markers'}].map(m=>(
                <button key={m.id} onClick={()=>setMode(m.id)} style={{
                  padding:'5px 13px',border:'none',cursor:'pointer',
                  fontSize:'12px',fontWeight:700,transition:'all 0.15s',
                  background: mode===m.id
                    ? 'linear-gradient(135deg,#f97316,#ea580c)'
                    : 'transparent',
                  color: mode===m.id ? '#fff' : '#64748b',
                  boxShadow: mode===m.id ? '0 2px 8px rgba(249,115,22,0.4)' : 'none',
                }}>{m.label}</button>
              ))}
            </div>

            {/* Category */}
            <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
              <span style={{fontSize:'11px',color:'#94a3b8',fontWeight:700,whiteSpace:'nowrap'}}>Category</span>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={SEL}>
                {cats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Status */}
            <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
              <span style={{fontSize:'11px',color:'#94a3b8',fontWeight:700,whiteSpace:'nowrap'}}>Status</span>
              <select value={statusFilt} onChange={e=>setStatusFilt(e.target.value)} style={SEL}>
                {statuses.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Reset view */}
            <button
              onClick={()=>mapRef.current?.flyTo([22.5,78.9],5,{duration:1.0})}
              style={{
                display:'flex',alignItems:'center',gap:'5px',
                padding:'5px 12px',borderRadius:'8px',
                border:'1.5px solid rgba(0,0,0,0.1)',
                background:'rgba(255,255,255,0.9)',
                boxShadow:'0 2px 6px rgba(0,0,0,0.07)',
                cursor:'pointer',color:'#1e293b',fontSize:'11px',fontWeight:700,
              }}
            >🇮🇳 Reset View</button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MAP — fills remaining height
      ══════════════════════════════════════════════════════════════ */}
      <div style={{flex:1,position:'relative',minHeight:0}}>
        <div
          ref={mapDiv}
          style={{width:'100%',height:'100%'}}
          className={isDark ? 'dark-map' : 'light-map'}
        />

        {/* ── Legend ── (glass card matching home page) */}
        <div style={{
          position:'absolute',top:12,left:12,zIndex:900,
          background:'linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,255,255,0.78))',
          backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
          border:'1px solid rgba(255,255,255,0.9)',
          boxShadow:'0 8px 24px rgba(0,0,0,0.1)',
          borderRadius:'16px',padding:'14px 16px',minWidth:'155px',
        }}>
          <div style={{fontSize:'10px',fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>
            {mode==='heat' ? '🌡 Heat Intensity' : '📌 By Category'}
          </div>
          {mode==='heat' ? [
            {col:'#22c55e',lbl:'Low (sparse)'},
            {col:'#f97316',lbl:'Moderate'},
            {col:'#ef4444',lbl:'High density'},
            {col:'#1d4ed8',lbl:'Very High'},
            {col:'#1e1b4b',lbl:'Critical'},
          ].map(x=>(
            <div key={x.lbl} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'7px'}}>
              <div style={{width:12,height:12,borderRadius:'3px',background:x.col,flexShrink:0,boxShadow:`0 0 6px ${x.col}99`}}/>
              <span style={{fontSize:'12px',color:'#475569',fontWeight:600}}>{x.lbl}</span>
            </div>
          )) : Object.entries(CAT_COLORS).map(([cat,col])=>(
            <div key={cat} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'7px'}}>
              <div style={{width:11,height:11,borderRadius:'50%',background:col,flexShrink:0,boxShadow:`0 0 6px ${col}99`}}/>
              <span style={{fontSize:'12px',color:'#475569',fontWeight:600}}>{cat}</span>
            </div>
          ))}
        </div>

        {/* ── No-GPS warning panel ── shows hidden complaints by category */}
        {source === 'supabase' && noGps.length > 0 && (
          <div style={{
            position:'absolute', bottom:36, right:90, zIndex:900,
            background:'rgba(255,255,255,0.96)',
            backdropFilter:'blur(14px)',
            border:'1.5px solid rgba(249,115,22,0.35)',
            borderRadius:'14px', padding:'12px 14px',
            boxShadow:'0 8px 24px rgba(0,0,0,0.1)',
            maxWidth:'220px',
          }}>
            <div style={{
              fontSize:'10px',fontWeight:800,color:'#ea580c',
              textTransform:'uppercase',letterSpacing:'0.07em',
              marginBottom:'8px',display:'flex',alignItems:'center',gap:'5px',
            }}>
              ⚠️ No GPS — Hidden from map
            </div>
            <div style={{fontSize:'11px',color:'#64748b',marginBottom:'8px',lineHeight:1.5}}>
              These <b style={{color:'#1e293b'}}>{noGps.reduce((a,x)=>a+x.cnt,0)}</b> complaints
              exist in database but have <b style={{color:'#ea580c'}}>no coordinates</b>.
              Ask submitters to allow location access.
            </div>
            {noGps.map(({cat,cnt})=>(
              <div key={cat} style={{
                display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'3px 0', borderBottom:'1px solid rgba(0,0,0,0.05)',
              }}>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <div style={{
                    width:8,height:8,borderRadius:'50%',flexShrink:0,
                    background:CAT_COLORS[cat]||'#94a3b8',
                  }}/>
                  <span style={{fontSize:'12px',color:'#475569',fontWeight:600}}>{cat}</span>
                </div>
                <span style={{
                  fontSize:'11px',fontWeight:800,color:'#ea580c',
                  background:'rgba(249,115,22,0.1)',
                  borderRadius:'999px',padding:'1px 8px',
                }}>{cnt}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── GPS count note bottom-right ── */}
        <div style={{
          position:'absolute',bottom:12,right:90,zIndex:900,
          background:'rgba(255,255,255,0.88)',backdropFilter:'blur(10px)',
          border:'1px solid rgba(0,0,0,0.08)',
          borderRadius:'8px',padding:'4px 12px',
          fontSize:'11px',color:'#64748b',fontWeight:600,
          boxShadow:'0 2px 8px rgba(0,0,0,0.08)',
        }}>
          {source==='supabase'
            ? `📡 ${points.length} of ${totalAll} complaints have GPS`
            : `🗺 Demo · ${DEMO.length} cities across India`}
        </div>
      </div>
    </div>
  );
}

/* ── Shared select style — matches home page inputs ───────────────────────── */
const SEL = {
  background:'rgba(255,255,255,0.9)',
  border:'1.5px solid rgba(0,0,0,0.1)',
  color:'#1e293b',borderRadius:'8px',
  padding:'4px 9px',fontSize:'12px',fontWeight:600,
  outline:'none',cursor:'pointer',
  boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
};
