import React, { useState, useRef, useCallback, useEffect } from 'react';
import { API_URL } from '../config';
import TakeIcon from '../assets/take.svg';

const CAPTURE_DURATION_MS = 10000;
const RECOGNIZE_INTERVAL_MS = 900;

const TakeAtt = ({ group }) => {
    const [showModal, setShowModal] = useState(false);
    const [phase, setPhase] = useState('ready');
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [liveFaces, setLiveFaces] = useState([]);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const streamRef = useRef(null);
    const recognizeRef = useRef(null);
    const timerRef = useRef(null);
    const framesRef = useRef([]);
    const recognizedRef = useRef(new Set());

    const stopCamera = useCallback(() => {
        if (recognizeRef.current) { clearInterval(recognizeRef.current); recognizeRef.current = null; }
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    const handleClose = useCallback(() => {
        stopCamera();
        setShowModal(false);
        setPhase('ready');
        setProgress(0);
        setResults(null);
        setError('');
        setLiveFaces([]);
        framesRef.current = [];
        recognizedRef.current = new Set();
    }, [stopCamera]);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch {
            setError('Camera access denied. Please allow camera permissions.');
        }
    }, []);

    const drawOverlay = useCallback((faces) => {
        const video = videoRef.current;
        const overlay = overlayRef.current;
        if (!video || !overlay) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        overlay.width = overlay.clientWidth;
        overlay.height = overlay.clientHeight;
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        const scaleX = overlay.width / vw;
        const scaleY = overlay.height / vh;

        faces.forEach(face => {
            const mirroredX = vw - face.x - face.w;
            const x = mirroredX * scaleX;
            const y = face.y * scaleY;
            const w = face.w * scaleX;
            const h = face.h * scaleY;

            const known = face.name !== 'Unknown';
            ctx.strokeStyle = known ? '#22c55e' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            const label = known ? `${face.name} (${Math.round(face.confidence * 100)}%)` : 'Unknown';
            ctx.font = '13px sans-serif';
            const textW = ctx.measureText(label).width + 10;
            ctx.fillStyle = known ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)';
            ctx.fillRect(x, y - 22, textW, 22);
            ctx.fillStyle = '#fff';
            ctx.fillText(label, x + 5, y - 6);
        });
    }, []);

    const captureFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return null;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.7);
    }, []);

    const recognizeOne = useCallback(async () => {
        const frame = captureFrame();
        if (!frame) return;
        framesRef.current.push(frame);
        try {
            const res = await fetch(`${API_URL}/recognize-frame`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frame, group }),
            });
            const data = await res.json();
            if (data.faces) {
                setLiveFaces(data.faces);
                drawOverlay(data.faces);
                data.faces.forEach(f => {
                    if (f.name !== 'Unknown') recognizedRef.current.add(`${f.name},${f.uid}`);
                });
            }
        } catch {
            /* network hiccup during real-time scan — ignore */
        }
    }, [captureFrame, drawOverlay, group]);

    const submitFrames = useCallback(async (frames) => {
        setPhase('processing');
        try {
            const response = await fetch(`${API_URL}/take-attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group, frames }),
            });
            const data = await response.json();
            if (response.ok) {
                setResults(data);
                setPhase('results');
            } else {
                setError(data.error || 'Recognition failed');
                setPhase('ready');
            }
        } catch {
            setError('Server error. Is the backend running?');
            setPhase('ready');
        }
    }, [group]);

    const startCapture = useCallback(() => {
        setPhase('capturing');
        setProgress(0);
        setError('');
        setLiveFaces([]);
        framesRef.current = [];
        recognizedRef.current = new Set();

        const startTime = Date.now();

        recognizeRef.current = setInterval(() => recognizeOne(), RECOGNIZE_INTERVAL_MS);

        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min((elapsed / CAPTURE_DURATION_MS) * 100, 100);
            setProgress(pct);
            if (elapsed >= CAPTURE_DURATION_MS) {
                clearInterval(recognizeRef.current);
                clearInterval(timerRef.current);
                recognizeRef.current = null;
                timerRef.current = null;
                stopCamera();
                submitFrames(framesRef.current);
            }
        }, 100);
    }, [stopCamera, submitFrames, recognizeOne]);

    const handleOpen = () => {
        setShowModal(true);
        setPhase('ready');
        setResults(null);
        setError('');
        setLiveFaces([]);
        setTimeout(() => startCamera(), 100);
    };

    return (
        <div className="action-card flex flex-col items-center">
            <div className="card-circle theme-green" onClick={handleOpen}>
                <div className="circle-main">
                    <img src={TakeIcon} alt="Take Attendance" />
                </div>
                <div className="circle-hover bg-[#059142]">
                    <h1 className="text-xl font-bold text-white">Take Attendance</h1>
                </div>
                <div className="circle-ring-1"></div>
                <div className="circle-ring-2"></div>
            </div>
            <div className="card-label text-center">
                <h2 className="text-xl text-white/90">Take Attendance</h2>
            </div>

            {showModal && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleClose()}>
                    <div className="modal-content w-11/12 max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">
                                Take Attendance — {group}
                            </h2>
                            <button onClick={handleClose} className="text-white/40 hover:text-white text-2xl transition">&times;</button>
                        </div>

                        <div className="p-5">
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-lg text-sm mb-4">
                                    {error}
                                </div>
                            )}

                            {phase !== 'results' && (
                                <>
                                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-4">
                                        <video
                                            ref={videoRef}
                                            autoPlay playsInline muted
                                            className="w-full h-full object-cover"
                                            style={{ transform: 'scaleX(-1)' }}
                                        />
                                        <canvas ref={canvasRef} className="hidden" />
                                        <canvas
                                            ref={overlayRef}
                                            className="absolute inset-0 w-full h-full pointer-events-none"
                                            style={{ transform: 'scaleX(1)' }}
                                        />

                                        {phase === 'capturing' && (
                                            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full animate-pulse">
                                                REC
                                            </div>
                                        )}
                                        {phase === 'capturing' && liveFaces.length > 0 && (
                                            <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
                                                {liveFaces.filter(f => f.name !== 'Unknown').map((f, i) => (
                                                    <span key={i} className="bg-green-600/90 text-white text-[11px] px-2 py-0.5 rounded-full">
                                                        {f.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {phase === 'processing' && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                                    <p className="text-white/70 text-sm">Recognizing faces...</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {phase === 'capturing' && (
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs text-white/50 mb-1.5">
                                                <span>Scanning faces...</span>
                                                <span>{Math.round(progress)}%</span>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <div className="bg-green-500 h-2 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    {phase === 'ready' && (
                                        <button
                                            onClick={startCapture}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition"
                                        >
                                            Start Scanning
                                        </button>
                                    )}
                                </>
                            )}

                            {phase === 'results' && results && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-4 gap-3 text-center">
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                                            <p className="text-2xl font-bold text-green-400">{results.new_entries}</p>
                                            <p className="text-xs text-white/50 mt-1">New</p>
                                        </div>
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                                            <p className="text-2xl font-bold text-yellow-400">{results.already_marked}</p>
                                            <p className="text-xs text-white/50 mt-1">Already Marked</p>
                                        </div>
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                                            <p className="text-2xl font-bold text-blue-400">{results.present}</p>
                                            <p className="text-xs text-white/50 mt-1">Present</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                            <p className="text-2xl font-bold text-white/70">{results.total_students}</p>
                                            <p className="text-xs text-white/50 mt-1">Total</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-white/5">
                                                    <th className="text-left px-4 py-3 text-white/50 font-medium">Name</th>
                                                    <th className="text-left px-4 py-3 text-white/50 font-medium">Detections</th>
                                                    <th className="text-left px-4 py-3 text-white/50 font-medium">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.recognized.map((person, i) => (
                                                    <tr key={i} className="border-t border-white/5">
                                                        <td className="px-4 py-3 text-white">{person.name}</td>
                                                        <td className="px-4 py-3 text-white/70">{person.count}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                                                                Marked
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <p className="text-xs text-white/30 text-center">
                                        {results.group} &middot; {results.date} &middot; {results.time}
                                    </p>

                                    <button
                                        onClick={handleClose}
                                        className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg font-medium transition"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TakeAtt;
