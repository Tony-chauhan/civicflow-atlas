import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { Send, MapPin, Map, Route, CheckSquare, Gamepad2, BrainCircuit, Globe2 } from 'lucide-react';
import { generateV2Response, type ChatMessage, type AppState } from './engine/CivicFlowEngine';
import { cn } from './lib/utils';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [stateInput, setStateInput] = useState('');
  
  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || '';
  const [apiKey, setApiKey] = useState(envApiKey);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [appState, setAppState] = useState<AppState>({
    jurisdiction: { country: 'India', state: '' },
    userType: 'Unknown',
    goalMode: 'Steps',
    progress: 'Not started'
  });

  // Initial load
  useEffect(() => {
    setTimeout(() => setShowModal(true), 1500);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Intercept button clicks from raw HTML
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('button');
      if (!target) return;
      
      if (target.dataset.action === 'prompt') {
        const text = target.innerText;
        handleSendMessage(text);
      } else if (target.dataset.action === 'alert') {
        const message = target.dataset.message;
        if (message) {
          alert(message);
        }
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [appState]);

  const handleSaveLocation = (e: FormEvent) => {
    e.preventDefault();
    if (stateInput.trim()) {
      setAppState(prev => ({
        ...prev,
        jurisdiction: { ...prev.jurisdiction, state: stateInput.trim() }
      }));
      setShowModal(false);
      addAssistantMessage(`Great! Jurisdiction set to ${stateInput.trim()}, India. I am CivicFlow Atlas (v2). Do you want Steps, a Timeline, a Checklist, a Simulation, or a Quiz?`);
    }
  };

  const handleSkipLocation = () => {
    setAppState(prev => ({
      ...prev,
      jurisdiction: { ...prev.jurisdiction, state: '' }
    }));
    setShowModal(false);
    addAssistantMessage(`No problem. I will provide general election guidance for India. I am CivicFlow Atlas (v2). Do you want Steps, a Timeline, a Checklist, a Simulation, or a Quiz?`);
  };

  const addAssistantMessage = (html: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: html }]);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    const newMessages: ChatMessage[] = [...messages, { id: Date.now().toString(), role: 'user' as const, content: text }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    // Fetch from LLM or Simulator
    const responseHtml = await generateV2Response(newMessages, appState, apiKey);
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant' as const, content: responseHtml }]);
    setIsTyping(false);
  };

  const modes = [
    { id: 'Steps', icon: <Route size={18} />, label: 'Journey' },
    { id: 'Timeline', icon: <Map size={18} />, label: 'Timeline' },
    { id: 'Checklist', icon: <CheckSquare size={18} />, label: 'Checklist' },
    { id: 'Simulation', icon: <Gamepad2 size={18} />, label: 'Simulation' },
    { id: 'Quiz', icon: <BrainCircuit size={18} />, label: 'Quiz Mode' },
  ];

  return (
    <div className="flex h-screen bg-[#0b0f19] text-slate-200 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className="w-64 bg-[#111827] border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <Globe2 size={28} />
            <h1 className="text-xl font-bold font-display text-white tracking-tight">CivicFlow<span className="text-blue-500">Atlas</span></h1>
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-6 mb-3">Modes</p>
          <div className="space-y-1">
            {modes.map(mode => (
              <button
                key={mode.id}
                onClick={() => {
                  setAppState(prev => ({ ...prev, goalMode: mode.id }));
                  const modePrompts: Record<string, string> = {
                    'Steps': 'Explain the full journey process.',
                    'Timeline': 'Make me a timeline plan.',
                    'Checklist': 'What documents do I need for the checklist?',
                    'Simulation': 'Give me an EVM simulation practice.',
                    'Quiz': 'Quiz me on election basics.'
                  };
                  handleSendMessage(modePrompts[mode.id]);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  appState.goalMode === mode.id 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {mode.icon}
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-800 space-y-3">
          {!envApiKey && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">API Key (Optional)</p>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Gemini or OpenAI key"
                className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
          <button 
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-400" />
              <div className="text-left">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Jurisdiction</p>
                <p className="text-sm text-slate-300 font-medium truncate max-w-[120px]">
                  {appState.jurisdiction.state ? `${appState.jurisdiction.state}, IN` : 'India (General)'}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6 pb-24">
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center space-y-6 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Globe2 size={40} className="text-blue-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2 font-display">CivicFlow Atlas</h2>
                  <p className="text-slate-400 max-w-md mx-auto">Your neutral, step-by-step guide to Indian elections. Ask anything.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mt-8">
                  {[
                    "I'm a first-time voter in India.",
                    "Make me a polling-day plan and reminders.",
                    "What documents do I need to carry?",
                    "Who should I vote for?"
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="p-4 text-left bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all group"
                    >
                      <p className="text-sm text-slate-300 group-hover:text-blue-400 transition-colors">{prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-4 w-full", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm",
                    msg.role === 'user' ? "bg-slate-700 text-slate-300" : "bg-blue-600 text-white"
                  )}>
                    {msg.role === 'user' ? '👤' : '🏛️'}
                  </div>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl p-4",
                    msg.role === 'user' 
                      ? "bg-slate-800 text-slate-200 rounded-tr-sm" 
                      : "bg-transparent text-slate-200 border border-slate-800 rounded-tl-sm prose prose-invert max-w-none"
                  )}>
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                    )}
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex gap-4 w-full">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">🏛️</div>
                <div className="bg-transparent border border-slate-800 rounded-2xl rounded-tl-sm p-4 flex gap-1 items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19] to-transparent">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
            className="max-w-3xl mx-auto relative flex items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about the election process..."
              className="w-full bg-[#1e293b] border border-slate-700 rounded-full py-4 pl-6 pr-14 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-lg"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="max-w-3xl mx-auto mt-2 text-center">
            <p className="text-[10px] text-slate-500">CivicFlow Atlas is a neutral guide. It does not endorse candidates or provide political advice.</p>
          </div>
        </div>
      </div>

      {/* Location Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0f19]/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
            <div className="p-6 border-b border-slate-700/50">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                <MapPin className="text-blue-500" size={24} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Set Your Jurisdiction</h2>
              <p className="text-sm text-slate-400">Rules and deadlines vary by state. Let's personalize your guide.</p>
            </div>
            
            <form onSubmit={handleSaveLocation} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">State / Union Territory</label>
                  <input 
                    type="text" 
                    value={stateInput}
                    onChange={(e) => setStateInput(e.target.value)}
                    placeholder="e.g., Maharashtra, Delhi, Karnataka" 
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button 
                  type="submit" 
                  className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Save Location
                </button>
                <button 
                  type="button" 
                  onClick={handleSkipLocation}
                  className="w-full sm:flex-1 bg-transparent hover:bg-slate-800 text-slate-300 font-medium py-2.5 px-4 rounded-lg border border-slate-700 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
