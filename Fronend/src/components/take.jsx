import React, { useState, useRef, useCallback } from 'react';
import TakeIcon from '../assets/take.svg';

const CAPTURE_DURATION_MS = 8000;
const CAPTURE_INTERVAL_MS = 400;

const TakeAtt = ({ group }) => {
    const [showModal, setShowModal] = useState(false);
    const [phase, setPhase] = useState('ready');
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const timerRef = useRef(null);

    const stopCamera = useCallback(() => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
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
    }, [stopCamera]);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch {
            setError('Camera access denied. Please allow camera permissions.');
        }
    }, []);

    const startCapture = useCallback(() => {
        setPhase('capturing');
        setProgress(0);
        setError('');

        const frames = [];
        const startTime = Date.now();

        intervalRef.current = setInterval(() => {
            if (!videoRef.current || !canvasRef.current) return;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            frames.push(canvas.toDataURL('image/jpeg', 0.7));
        }, CAPTURE_INTERVAL_MS);

        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min((elapsed / CAPTURE_DURATION_MS) * 100, 100);
            setProgress(pct);
            if (elapsed >= CAPTURE_DURATION_MS) {
                clearInterval(intervalRef.current);
                clearInterval(timerRef.current);
                intervalRef.current = null;
                timerRef.current = null;
                stopCamera();
                submitFrames(frames);
            }
        }, 100);
    }, [stopCamera]);

    const submitFrames = useCallback(async (frames) => {
        setPhase('processing');
        try {
            const response = await fetch('http://localhost:5000/take-attendance', {
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

    const handleOpen = () => {
        setShowModal(true);
        setPhase('ready');
        setResults(null);
        setError('');
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

                                        {phase === 'capturing' && (
                                            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full animate-pulse">
                                                REC
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
