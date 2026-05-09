import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Play, Pause, RotateCcw, Upload, Zap, ChevronRight, Music2 } from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Slider } from "./components/ui/slider";
import { Switch } from "./components/ui/switch";
import { Separator } from "./components/ui/separator";
import { ScrollArea } from "./components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";

const STYLES = ["abstract","waveform","bars","particles"];
const STYLE_LABELS = { abstract:"Abstract", waveform:"Waveform", bars:"Freq Bars", particles:"Particles" };
const STYLE_ICONS = { abstract:"◎", waveform:"∿", bars:"▋", particles:"·:·" };

const DEFAULT_PARAMS = {
  colorA:"#7f77dd", colorB:"#1d9e75", speed:1, intensity:1,
  complexity:0.5, smoothing:0.8, particleCount:120, barCount:64,
  rotation:false, mirror:false, glow:false,
};

function AudioProgress({ audioElRef, isPlaying }) {
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    const onTime = () => setCur(el.currentTime);
    const onMeta = () => setDur(el.duration);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    setDur(el.duration || 0);
    return () => { el.removeEventListener("timeupdate", onTime); el.removeEventListener("loadedmetadata", onMeta); };
  }, [isPlaying]);
  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  return (
    <div className="space-y-1 mt-2">
      <Slider min={0} max={dur||1} step={0.1} value={[cur]}
        onValueChange={([v])=>{ if(audioElRef.current) audioElRef.current.currentTime=v; setCur(v); }}
        className="w-full" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{fmt(cur)}</span><span>{dur?fmt(dur):"--:--"}</span>
      </div>
    </div>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const audioElRef = useRef(null);
  const phaseRef = useRef(0);
  const particlesRef = useRef([]);

  const [activeStyle, setActiveStyle] = useState("bars");
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [inputMode, setInputMode] = useState("file");
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState("");
  const [messages, setMessages] = useState([
    { role:"assistant", text:'Hi! I\'m your AI VJ. Try: "make it aggressive", "warm sunset palette", "switch to particles", or "mirror mode on".' }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);

  const paramsRef = useRef(params);
  const activeStyleRef = useRef(activeStyle);
  useEffect(()=>{ paramsRef.current=params; },[params]);
  useEffect(()=>{ activeStyleRef.current=activeStyle; },[activeStyle]);

  const initAudioCtx = useCallback(()=>{
    if(!audioCtxRef.current){
      audioCtxRef.current=new(window.AudioContext||window.webkitAudioContext)();
      const a=audioCtxRef.current.createAnalyser();
      a.fftSize=2048; a.smoothingTimeConstant=paramsRef.current.smoothing;
      a.connect(audioCtxRef.current.destination);
      analyserRef.current=a;
    }
  },[]);

  const stopAll = useCallback(()=>{
    if(sourceRef.current){try{sourceRef.current.disconnect();}catch(e){} sourceRef.current=null;}
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null;}
    if(audioElRef.current){audioElRef.current.pause(); audioElRef.current=null;}
    setIsPlaying(false);
  },[]);

  const startMic = useCallback(async()=>{
    stopAll(); initAudioCtx();
    if(audioCtxRef.current.state==="suspended") await audioCtxRef.current.resume();
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    streamRef.current=stream;
    const src=audioCtxRef.current.createMediaStreamSource(stream);
    src.connect(analyserRef.current); sourceRef.current=src; setIsPlaying(true);
  },[stopAll,initAudioCtx]);

  const handleFile = useCallback(async(file)=>{
    if(!file) return;
    stopAll(); initAudioCtx();
    if(audioCtxRef.current.state==="suspended") await audioCtxRef.current.resume();
    setFileName(file.name);
    const url=URL.createObjectURL(file);
    const audio=new Audio(url); audio.crossOrigin="anonymous";
    audioElRef.current=audio;
    const src=audioCtxRef.current.createMediaElementSource(audio);
    src.connect(analyserRef.current); sourceRef.current=src;
    audio.play(); setIsPlaying(true);
    audio.onended=()=>setIsPlaying(false);
  },[stopAll,initAudioCtx]);

  useEffect(()=>{
    if(analyserRef.current) analyserRef.current.smoothingTimeConstant=params.smoothing;
  },[params.smoothing]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    let w,h;
    const resize=()=>{ w=canvas.width=canvas.offsetWidth; h=canvas.height=canvas.offsetHeight; };
    resize(); window.addEventListener("resize",resize);
    const hexAlpha=(hex,a)=>{ const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${Math.max(0,Math.min(1,a))})`; };
    const lerpColor=(a,b,t)=>{ const r1=parseInt(a.slice(1,3),16),g1=parseInt(a.slice(3,5),16),b1=parseInt(a.slice(5,7),16),r2=parseInt(b.slice(1,3),16),g2=parseInt(b.slice(3,5),16),b2=parseInt(b.slice(5,7),16); return `#${Math.round(r1+(r2-r1)*t).toString(16).padStart(2,"0")}${Math.round(g1+(g2-g1)*t).toString(16).padStart(2,"0")}${Math.round(b1+(b2-b1)*t).toString(16).padStart(2,"0")}`; };
    const initParticles=count=>{ particlesRef.current=Array.from({length:count},()=>({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.002,vy:(Math.random()-.5)*.002,size:Math.random()*3+1,life:Math.random()})); };
    initParticles(DEFAULT_PARAMS.particleCount);
    const draw=()=>{
      animRef.current=requestAnimationFrame(draw);
      const p=paramsRef.current; const style=activeStyleRef.current;
      const analyser=analyserRef.current;
      phaseRef.current+=.01*p.speed; const phase=phaseRef.current;
      const dataArr=new Uint8Array(analyser?analyser.frequencyBinCount:1024);
      const timeArr=new Uint8Array(analyser?analyser.fftSize:2048);
      if(analyser){analyser.getByteFrequencyData(dataArr);analyser.getByteTimeDomainData(timeArr);}
      const energy=analyser?dataArr.reduce((a,b)=>a+b,0)/dataArr.length/255:.2;
      const bass=analyser?dataArr.slice(0,8).reduce((a,b)=>a+b,0)/8/255:.1;
      ctx.fillStyle="rgba(10,10,14,0.18)"; ctx.fillRect(0,0,w,h);
      const cA=p.colorA,cB=p.colorB,cx=w/2,cy=h/2;
      if(style==="abstract"){
        const count=Math.floor(3+p.complexity*5);
        for(let i=0;i<count;i++){
          const t=i/count,r=(0.15+bass*.2+p.intensity*.1)*Math.min(w,h);
          const ang=phase*(1+i*.3)+t*Math.PI*2;
          const bx=cx+Math.cos(ang)*r*(1+Math.sin(phase*.7+i)*.4),by=cy+Math.sin(ang)*r*(1+Math.cos(phase*.5+i)*.4);
          const grad=ctx.createRadialGradient(bx,by,0,bx,by,r*.5);
          grad.addColorStop(0,hexAlpha(cA,.25+energy*.4)); grad.addColorStop(1,hexAlpha(cB,0));
          ctx.beginPath(); ctx.arc(bx,by,r*(.3+energy*.3),0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(cx,cy,(.05+bass*.12)*Math.min(w,h),0,Math.PI*2);
        ctx.fillStyle=hexAlpha(cA,.5+energy*.3); ctx.fill();
      } else if(style==="waveform"){
        ctx.beginPath();
        const sl=timeArr.length;
        for(let i=0;i<sl;i++){const x=(i/sl)*w,v=(timeArr[i]/128-1)*h*.35*p.intensity; if(i===0)ctx.moveTo(x,cy+v);else ctx.lineTo(x,cy+v);}
        ctx.strokeStyle=hexAlpha(cA,.9); ctx.lineWidth=2; ctx.stroke();
        if(p.mirror){ctx.beginPath(); for(let i=0;i<sl;i++){const x=(i/sl)*w,v=(timeArr[i]/128-1)*h*.35*p.intensity;if(i===0)ctx.moveTo(x,cy-v);else ctx.lineTo(x,cy-v);} ctx.strokeStyle=hexAlpha(cB,.7); ctx.stroke();}
      } else if(style==="bars"){
        const count=Math.min(p.barCount,dataArr.length);
        const bw=w/count*.8,gap=w/count*.2;
        for(let i=0;i<count;i++){
          const t=i/count,val=(dataArr[Math.floor(i*dataArr.length/count)]/255)*p.intensity,bh=val*h*.85;
          const col=lerpColor(cA,cB,t);
          ctx.fillStyle=hexAlpha(col,.85); ctx.fillRect(i*(bw+gap),h-bh,bw,bh);
          if(p.mirror){ctx.fillStyle=hexAlpha(col,.3); ctx.fillRect(i*(bw+gap),0,bw,bh);}
        }
      } else if(style==="particles"){
        const pArr=particlesRef.current;
        if(pArr.length!==p.particleCount) initParticles(p.particleCount);
        pArr.forEach(pt=>{
          pt.vx+=(Math.random()-.5)*.0003*p.speed; pt.vy+=(Math.random()-.5)*.0003*p.speed-bass*.001*p.intensity;
          pt.x+=pt.vx; pt.y+=pt.vy; pt.life-=.004*p.speed;
          if(pt.x<0||pt.x>1||pt.y<0||pt.y>1||pt.life<=0){pt.x=.3+Math.random()*.4;pt.y=.5+Math.random()*.2;pt.vx=(Math.random()-.5)*.003;pt.vy=-Math.random()*.005*(1+bass*3);pt.life=.8+Math.random()*.2;pt.size=Math.random()*3+1;}
          ctx.beginPath(); ctx.arc(pt.x*w,pt.y*h,pt.size*(.5+energy*1.5),0,Math.PI*2);
          ctx.fillStyle=hexAlpha(lerpColor(cA,cB,1-pt.life),pt.life*.8); ctx.fill();
        });
      }
    };
    draw();
    return()=>{ cancelAnimationFrame(animRef.current); window.removeEventListener("resize",resize); };
  },[]);

  const res = await fetch("https://snagged-sprinkler-harmonics.ngrok-free.dev/generate_visuals", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_prompt: text,
    current_state: paramsRef.current
  })
});
const newParams = await res.json();

  return (
    <TooltipProvider>
    <div className="flex flex-col h-screen bg-[#09090b] text-foreground overflow-hidden" style={{fontFamily:"var(--font-sans)"}}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Music2 size={16} className="text-violet-400" />
          <span className="text-sm font-semibold tracking-tight text-white">Frequence</span>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-violet-400 border-violet-400/30">AI VJ</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isPlaying?"bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]":"bg-zinc-600"}`} />
          <span className="text-xs text-muted-foreground">{isPlaying?(inputMode==="mic"?"Live mic":"Now playing"):"No audio"}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-52 border-r border-border/40 flex flex-col bg-[#0c0c10] overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {/* Input Mode */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Source</p>
                <Tabs value={inputMode} onValueChange={v=>{setInputMode(v);stopAll();}}>
                  <TabsList className="w-full h-7 bg-zinc-900">
                    <TabsTrigger value="file" className="flex-1 text-xs h-6">File</TabsTrigger>
                    <TabsTrigger value="mic" className="flex-1 text-xs h-6">Mic</TabsTrigger>
                  </TabsList>
                </Tabs>
                {inputMode==="file" && (
                  <div className="mt-2 space-y-2">
                    <label className="flex flex-col items-center gap-1 p-3 border border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors">
                      <Upload size={14} className="text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">{fileName?fileName.slice(0,16)+"…":"Drop audio file"}</span>
                      <input type="file" accept="audio/*" className="hidden" onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])} />
                    </label>
                    {fileName && (
                      <>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
                            onClick={()=>{ if(audioElRef.current){if(isPlaying){audioElRef.current.pause();setIsPlaying(false);}else{audioElRef.current.play();setIsPlaying(true);}}}}>
                            {isPlaying?<><Pause size={11}/>Pause</>:<><Play size={11}/>Play</>}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                            onClick={()=>{if(audioElRef.current){audioElRef.current.currentTime=0;audioElRef.current.play();setIsPlaying(true);}}}>
                            <RotateCcw size={11}/>
                          </Button>
                        </div>
                        <AudioProgress audioElRef={audioElRef} isPlaying={isPlaying} />
                      </>
                    )}
                  </div>
                )}
                {inputMode==="mic" && (
                  <Button size="sm" variant={isPlaying?"destructive":"outline"} className="w-full mt-2 h-8 text-xs gap-1.5"
                    onClick={isPlaying?stopAll:startMic}>
                    {isPlaying?<><MicOff size={12}/>Stop mic</>:<><Mic size={12}/>Start mic</>}
                  </Button>
                )}
              </div>

              <Separator className="bg-border/40"/>

              {/* Style */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Visual Style</p>
                <div className="space-y-1">
                  {STYLES.map(s=>(
                    <button key={s} onClick={()=>setActiveStyle(s)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all ${activeStyle===s?"bg-violet-500/15 text-violet-300 border border-violet-500/30":"text-muted-foreground hover:text-foreground hover:bg-zinc-800 border border-transparent"}`}>
                      <span className="font-mono text-[11px] w-5 text-center opacity-70">{STYLE_ICONS[s]}</span>
                      {STYLE_LABELS[s]}
                      {activeStyle===s && <ChevronRight size={10} className="ml-auto"/>}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/40"/>

              {/* Colors */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Color Palette</p>
                <div className="flex gap-3">
                  {[["colorA","A"],["colorB","B"]].map(([key,label])=>(
                    <div key={key} className="flex flex-col items-center gap-1">
                      <label className="relative cursor-pointer">
                        <div className="w-10 h-10 rounded-lg border-2 border-zinc-700 hover:border-zinc-500 transition-colors overflow-hidden" style={{background:params[key]}}>
                          <input type="color" value={params[key]} onChange={e=>setParams(p=>({...p,[key]:e.target.value}))} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"/>
                        </div>
                      </label>
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                  <div className="flex-1 rounded-lg h-10" style={{background:`linear-gradient(135deg,${params.colorA},${params.colorB})`}}/>
                </div>
              </div>

              <Separator className="bg-border/40"/>

              {/* Sliders */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Parameters</p>
                <div className="space-y-3">
                  {[["Speed","speed",.2,3,.1],["Intensity","intensity",.2,3,.1],["Smoothing","smoothing",.5,.98,.01]].map(([label,key,min,max,step])=>(
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-zinc-400 font-mono">{params[key].toFixed(1)}</span>
                      </div>
                      <Slider min={min} max={max} step={step} value={[params[key]]}
                        onValueChange={([v])=>setParams(p=>({...p,[key]:v}))} className="w-full"/>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/40"/>

              {/* Toggles */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Modifiers</p>
                <div className="space-y-2">
                  {[["Mirror","mirror"],["Rotation","rotation"]].map(([label,key])=>(
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <Switch checked={params[key]} onCheckedChange={v=>setParams(p=>({...p,[key]:v}))} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Canvas */}
        <canvas ref={canvasRef} className="flex-1 block w-full h-full" />

        {/* Right Chat Panel */}
        <div className="w-56 border-l border-border/40 flex flex-col bg-[#0c0c10]">
          <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
            <Zap size={12} className="text-violet-400"/>
            <span className="text-xs font-medium text-zinc-300">AI VJ</span>
            {loading && <Badge variant="secondary" className="ml-auto text-[9px] py-0 px-1">thinking…</Badge>}
          </div>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2">
              {messages.map((m,i)=>(
                <div key={i} className={`text-xs rounded-lg px-2.5 py-2 leading-relaxed ${m.role==="user"?"bg-violet-500/15 text-violet-200 border border-violet-500/20 ml-3":"bg-zinc-900 text-zinc-400 border border-zinc-800 mr-3"}`}>
                  {m.text}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-2 border-t border-border/40 flex gap-1.5">
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&sendChat()}
              placeholder="describe the vibe…"
              className="flex-1 text-xs bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors" />
            <Button size="sm" onClick={sendChat} disabled={loading} className="h-7 w-7 p-0 bg-violet-600 hover:bg-violet-500">
              <ChevronRight size={13}/>
            </Button>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
