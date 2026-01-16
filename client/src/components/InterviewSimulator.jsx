import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, User, Cpu, Award } from 'lucide-react';
import api from '../services/api';
import AudioRecorder from './AudioRecorder';

const InterviewSimulator = ({ session }) => {
    // Session State
    const [started, setStarted] = useState(false);
    const [mode, setMode] = useState('hardcore');
    const [messages, setMessages] = useState([]);

    // Inputs
    const [cvText, setCvText] = useState('');
    const [jobDesc, setJobDesc] = useState('');

    // Pre-fill from profile if available
    useEffect(() => {
        if (session?.user?.id) {
            // Fetch profile to see if we have context
            api.get(`/profile/${session.user.id}`)
                .then(res => {
                    const p = res.data;
                    if (p && p.role_title) {
                        // Construct a "Virtual" Job Description based on their goal
                        const constructedJD = `Postulación para: ${p.role_title} en industria ${p.role_industry}.\nContexto Experiencia: ${p.work_context || 'No especificado'}`;
                        setJobDesc(constructedJD);
                    }
                })
                .catch(err => console.log("No profile context found", err));
        }
    }, [session]);

    // Audio State
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleStart = async () => {
        if (!session) {
            alert("Debes iniciar sesión para entrenar.");
            return;
        }

        // MVP Authorization Mock
        const userType = session?.user?.user_metadata?.is_premium ? 'Premium' : 'Free';
        // Allow Free users for MVP demo, but logically we would check usage limit here

        if (!cvText || !jobDesc) {
            alert("Necesitamos tu CV y la Vacante para entrenar a Alex.");
            return;
        }

        setStarted(true);
        // Add loading message
        setMessages([{ role: 'assistant', content: "Leyendo tu perfil... (Iniciando simulación)" }]);

        try {
            const res = await api.post('/interview/start', { cvText, jobDescription: jobDesc, mode });

            // Update with real greeting
            setMessages([{ role: 'assistant', content: res.data.message }]);
        } catch (e) {
            console.error(e);
            setMessages([{ role: 'assistant', content: "Error iniciando a Alex. Revisa la consola." }]);
        }
    };

    const handleSendMessage = async (text) => {
        const newHistory = [...messages, { role: 'user', content: text }];
        setMessages(newHistory);

        try {
            const res = await api.post('/interview/chat', {
                messages: newHistory,
                cvText,
                jobDescription: jobDesc
            });

            setMessages([...newHistory, { role: 'assistant', content: res.data.message }]);
        } catch (e) {
            console.error(e);
        }
    };

    // Mock PTT (Web Speech API or just Text for MVP)
    // Implementing text input for stability first, enabling Speech later
    const [inputText, setInputText] = useState('');

    const handleAudioUpload = async (audioBlob) => {
        setIsListening(true);

        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');
        formData.append('cvText', cvText);
        formData.append('jobDescription', jobDesc);
        formData.append('messages', JSON.stringify(messages));

        try {
            const res = await api.post('/interview/speak', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { userText, assistantText, audioBase64 } = res.data;

            const newHistory = [...messages,
            { role: 'user', content: userText },
            { role: 'assistant', content: assistantText }
            ];
            setMessages(newHistory);

            if (audioBase64) {
                const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
                setIsSpeaking(true);
                audio.onended = () => setIsSpeaking(false);
                audio.play().catch(e => console.error("Audio playback error:", e));
            }

        } catch (e) {
            console.error(e);
            alert("Error procesando audio. ¿Servidor online?");
        } finally {
            setIsListening(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 flex flex-col md:flex-row gap-4">
            {/* LEFT: AVATAR / CONFIG */}
            <div className="w-full md:w-1/3 flex flex-col gap-4">
                <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 flex-1 relative overflow-hidden">
                    {!started ? (
                        <div className="space-y-6 z-10 relative">
                            <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Configurar Entrevista</h2>

                            <div>
                                <label className="text-xs text-slate-500 uppercase">Pegar Texto CV</label>
                                <textarea value={cvText} onChange={e => setCvText(e.target.value)} className="w-full bg-slate-800 p-2 rounded text-xs h-24 text-slate-300" placeholder="Pega el texto de tu CV aquí..." />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase">Pegar Vacante</label>
                                <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} className="w-full bg-slate-800 p-2 rounded text-xs h-24 text-slate-300" placeholder="Descripción del puesto..." />
                            </div>

                            <button onClick={handleStart} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg shadow-blue-900/50 transition-all">
                                INICIAR "ALEX" ({mode})
                            </button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-4">
                            {/* AVATAR CIRCLE */}
                            <motion.div
                                animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-48 h-48 rounded-full border-4 border-cyan-500/50 flex items-center justify-center bg-gradient-to-br from-slate-800 to-black shadow-[0_0_50px_rgba(6,182,212,0.3)]"
                            >
                                <User size={80} className="text-slate-400" />
                            </motion.div>
                            <h3 className="mt-6 text-2xl font-bold text-white">Alex (Reclutador)</h3>
                            <div className="mt-2 flex gap-2">
                                <span className="px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded border border-red-900">Modo: Estricto</span>
                                <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded border border-blue-900">Live Audio</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: CHAT / METRICS */}
            <div className="w-full md:w-2/3 flex flex-col gap-4">
                <div className="flex-1 bg-slate-900 rounded-3xl p-6 border border-slate-800 overflow-y-auto max-h-[70vh]">
                    {messages.length === 0 && <p className="text-center text-slate-500 mt-20">El historial de chat aparecerá aquí...</p>}

                    {messages.map((m, i) => (
                        <div key={i} className={`flex gap-4 mb-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'assistant' ? 'bg-cyan-900 text-cyan-400' : 'bg-purple-900 text-purple-400'}`}>
                                {m.role === 'assistant' ? <Cpu size={16} /> : <User size={16} />}
                            </div>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${m.role === 'assistant' ? 'bg-slate-800 text-slate-200 rounded-tl-none' : 'bg-purple-600 text-white rounded-tr-none'}`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* CONTROLS */}
                {started && (
                    <div className="h-24 bg-slate-900 rounded-3xl p-4 border border-slate-800 flex items-center gap-4">
                        <AudioRecorder onRecordingComplete={handleAudioUpload} isProcessing={isListening} />

                        <input
                            type="text"
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputText)}
                            placeholder="Escribe tu respuesta..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                        />
                        <button
                            onClick={() => { handleSendMessage(inputText); setInputText(''); }}
                            className="w-16 h-16 rounded-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center shadow-lg transition-transform active:scale-95"
                        >
                            <ArrowRight />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Icon helper
const ArrowRight = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
)

export default InterviewSimulator;
