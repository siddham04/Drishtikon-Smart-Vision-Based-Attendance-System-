import React, { useState, useRef, useCallback, useEffect } from 'react';
import { API_URL } from '../config';
import AddUser from '../assets/add_user.svg';

const REQUIRED_CAPTURES = 10;
const CAPTURE_INTERVAL_MS = 600;
const LIVENESS_DURATION_MS = 5000;
const LIVENESS_FPS_MS = 150;

const Register = ({ group }) => {
    const [showPopup, setShowPopup] = useState(false);
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [uid, setUid] = useState('');
    const [error, setError] = useState('');
    const [capturing, setCapturing] = useState(false);
    const [capturedCount, setCapturedCount] = useState(0);
    const [frames, setFrames] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState('');

    const [livenessPhase, setLivenessPhase] = useState('idle');
    const [blinksDetected, setBlinksDetected] = useState(0);
    const [livenessProgress, setLivenessProgress] = useState(0);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalRef = useRef(null);
    const livenessIntervalRef = useRef(null);
    const livenessTimerRef = useRef(null);

    const stopCamera = useCallback(() => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (livenessIntervalRef.current) { clearInterval(livenessIntervalRef.current); livenessIntervalRef.current = null; }
        if (livenessTimerRef.current) { clearInterval(livenessTimerRef.current); livenessTimerRef.current = null; }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

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

    const captureFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return null;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8);
    }, []);

    // ── Liveness detection ────────────────────────────────────────────

    const submitLiveness = useCallback(async (livenessFrames) => {
        setLivenessPhase('processing');
        try {
            const res = await fetch(`${API_URL}/liveness-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frames: livenessFrames }),
            });
            const data = await res.json();
            setBlinksDetected(data.blinks_detected || 0);

            if (data.alive) {
                setLivenessPhase('passed');
                setTimeout(() => setStep(4), 800);
            } else {
                setLivenessPhase('failed');
                setError(`Liveness failed (${data.blinks_detected || 0} blinks detected, need 2+). Please try again.`);
            }
        } catch {
            setLivenessPhase('failed');
            setError('Server error during liveness check.');
        }
    }, []);

    const startLivenessCheck = useCallback(() => {
        setLivenessPhase('checking');
        setBlinksDetected(0);
        setLivenessProgress(0);
        setError('');

        const livenessFrames = [];
        const startTime = Date.now();

        livenessIntervalRef.current = setInterval(() => {
            const frame = captureFrame();
            if (frame) livenessFrames.push(frame);
        }, LIVENESS_FPS_MS);

        livenessTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setLivenessProgress(Math.min((elapsed / LIVENESS_DURATION_MS) * 100, 100));

            if (elapsed >= LIVENESS_DURATION_MS) {
                clearInterval(livenessIntervalRef.current);
                clearInterval(livenessTimerRef.current);
                livenessIntervalRef.current = null;
                livenessTimerRef.current = null;
                submitLiveness(livenessFrames);
            }
        }, 100);
    }, [captureFrame, submitLiveness]);

    // ── Face capture ──────────────────────────────────────────────────

    const startCapturing = useCallback(() => {
        setCapturing(true);
        setCapturedCount(0);
        setFrames([]);

        const collectedFrames = [];
        intervalRef.current = setInterval(() => {
            const dataUrl = captureFrame();
            if (!dataUrl) return;
            collectedFrames.push(dataUrl);
            setCapturedCount(collectedFrames.length);

            if (collectedFrames.length >= REQUIRED_CAPTURES) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                setCapturing(false);
                setFrames(collectedFrames);
            }
        }, CAPTURE_INTERVAL_MS);
    }, [captureFrame]);

    const handleSubmitFaces = useCallback(async (capturedFrames) => {
        setSubmitting(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/register-face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, uid, group, frames: capturedFrames }),
            });
            const data = await response.json();
            if (response.ok) {
                setResult(`Registered successfully! ${data.faces_captured} faces captured.`);
                const existingUIDs = JSON.parse(localStorage.getItem('uids')) || [];
                if (!existingUIDs.includes(uid)) {
                    existingUIDs.push(uid);
                    localStorage.setItem('uids', JSON.stringify(existingUIDs));
                }
                setTimeout(() => handleClose(), 3000);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch {
            setError('Server error. Is the backend running?');
        } finally {
            setSubmitting(false);
        }
    }, [name, uid, group]);

    useEffect(() => {
        if (frames.length >= REQUIRED_CAPTURES && !submitting) {
            stopCamera();
            handleSubmitFaces(frames);
        }
    }, [frames, submitting, stopCamera, handleSubmitFaces]);

    const handleClose = useCallback(() => {
        stopCamera();
        setShowPopup(false);
        setStep(1);
        setName('');
        setUid('');
        setError('');
        setCapturing(false);
        setCapturedCount(0);
        setFrames([]);
        setResult('');
        setSubmitting(false);
        setLivenessPhase('idle');
        setBlinksDetected(0);
        setLivenessProgress(0);
    }, [stopCamera]);

    const handleNextToUid = () => {
        if (!name.trim()) { setError('Please enter your name'); return; }
        setError('');
        setStep(2);
    };

    const handleNextToLiveness = () => {
        if (uid.length !== 10) { setError('UID must be exactly 10 digits'); return; }
        const existingUIDs = JSON.parse(localStorage.getItem('uids')) || [];
        if (existingUIDs.includes(uid)) { setError('This UID is already registered'); return; }
        setError('');
        setStep(3);
        startCamera();
    };

    const progress = (capturedCount / REQUIRED_CAPTURES) * 100;
    const totalSteps = 4;

    return (
        <div className="action-card flex flex-col items-center">
            <div className="card-circle theme-blue" onClick={() => setShowPopup(true)}>
                <div className="circle-main">
                    <img src={AddUser} alt="Register" />
                </div>
                <div className="circle-hover bg-[#2980b9]">
                    <h1 className="text-xl font-bold text-white">Register Now</h1>
                </div>
                <div className="circle-ring-1"></div>
                <div className="circle-ring-2"></div>
            </div>
            <div className="card-label text-center">
                <h2 className="text-xl text-white/90">Register</h2>
            </div>

            {showPopup && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleClose()}>
                    <div className="modal-content w-11/12 max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">
                                {step === 1 && 'Enter Your Name'}
                                {step === 2 && 'Enter Your UID'}
                                {step === 3 && 'Liveness Verification'}
                                {step === 4 && 'Face Capture'}
                            </h2>
                            <button onClick={handleClose} className="text-white/40 hover:text-white text-2xl transition">&times;</button>
                        </div>

                        <div className="p-5">
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-lg text-sm mb-4">
                                    {error}
                                </div>
                            )}
                            {result && (
                                <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-2.5 rounded-lg text-sm mb-4">
                                    {result}
                                </div>
                            )}

                            {/* Step 1: Name */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-white/50 mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleNextToUid()}
                                            placeholder="e.g. Siddham Jain"
                                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition"
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={handleNextToUid}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}

                            {/* Step 2: UID */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <p className="text-sm text-white/40">Registering: <span className="text-white">{name}</span></p>
                                    <div>
                                        <label className="block text-sm text-white/50 mb-2">UID (10 digits)</label>
                                        <input
                                            type="text"
                                            value={uid}
                                            onChange={(e) => setUid(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleNextToLiveness()}
                                            placeholder="e.g. 2012345678"
                                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition tracking-widest"
                                            autoFocus
                                        />
                                        <p className="text-xs text-white/30 mt-1">{uid.length}/10 digits</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setStep(1); setError(''); }}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg font-medium transition"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleNextToLiveness}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Liveness verification */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <p className="text-sm text-white/40">
                                        Registering: <span className="text-white">{name}</span> &middot; UID: <span className="text-white">{uid}</span>
                                    </p>

                                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                                        <video
                                            ref={videoRef}
                                            autoPlay playsInline muted
                                            className="w-full h-full object-cover"
                                            style={{ transform: 'scaleX(-1)' }}
                                        />
                                        <canvas ref={canvasRef} className="hidden" />

                                        {livenessPhase === 'processing' && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                                    <p className="text-white/70 text-sm">Verifying liveness...</p>
                                                </div>
                                            </div>
                                        )}

                                        {livenessPhase === 'passed' && (
                                            <div className="absolute inset-0 bg-green-900/70 flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="text-5xl mb-2">&#10003;</div>
                                                    <p className="text-green-300 font-medium">Liveness Verified!</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {livenessPhase === 'checking' && (
                                        <div>
                                            <div className="flex justify-between text-xs text-white/50 mb-1.5">
                                                <span>Detecting blinks...</span>
                                                <span>{Math.round(livenessProgress)}%</span>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <div className="bg-purple-500 h-2 rounded-full transition-all duration-100" style={{ width: `${livenessProgress}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                                        <p className="text-purple-300 text-sm font-medium mb-1">Anti-Spoofing Check</p>
                                        <p className="text-white/50 text-xs">
                                            Please blink naturally 2-3 times while looking at the camera. This verifies you are a real person.
                                        </p>
                                        {blinksDetected > 0 && (
                                            <p className="text-purple-400 text-sm mt-2 font-medium">
                                                Blinks detected: {blinksDetected}
                                            </p>
                                        )}
                                    </div>

                                    {(livenessPhase === 'idle' || livenessPhase === 'failed') && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => { setStep(2); setError(''); stopCamera(); setLivenessPhase('idle'); }}
                                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg font-medium transition"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={startLivenessCheck}
                                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition"
                                            >
                                                {livenessPhase === 'failed' ? 'Retry' : 'Start Verification'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 4: Face capture */}
                            {step === 4 && (
                                <div className="space-y-4">
                                    <p className="text-sm text-white/40">
                                        Registering: <span className="text-white">{name}</span> &middot; UID: <span className="text-white">{uid}</span>
                                    </p>

                                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                                        <video
                                            ref={videoRef}
                                            autoPlay playsInline muted
                                            className="w-full h-full object-cover"
                                            style={{ transform: 'scaleX(-1)' }}
                                        />
                                        <canvas ref={canvasRef} className="hidden" />

                                        {submitting && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                                    <p className="text-white/70 text-sm">Processing faces...</p>
                                                </div>
                                            </div>
                                        )}

                                        {capturing && (
                                            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full animate-pulse">
                                                REC
                                            </div>
                                        )}
                                    </div>

                                    {(capturing || capturedCount > 0) && !result && (
                                        <div>
                                            <div className="flex justify-between text-xs text-white/50 mb-1.5">
                                                <span>Capturing faces</span>
                                                <span>{capturedCount}/{REQUIRED_CAPTURES}</span>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {!capturing && capturedCount === 0 && !submitting && !result && (
                                        <button
                                            onClick={startCapturing}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition"
                                        >
                                            Start Face Capture
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-white/10 flex justify-center gap-2">
                            {[1, 2, 3, 4].map(s => (
                                <div
                                    key={s}
                                    className={`w-2 h-2 rounded-full transition ${
                                        s === step ? 'bg-blue-500' : s < step ? 'bg-blue-500/40' : 'bg-white/10'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Register;
