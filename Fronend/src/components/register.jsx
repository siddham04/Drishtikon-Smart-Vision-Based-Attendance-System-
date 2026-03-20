import React, { useState, useRef, useCallback, useEffect } from 'react';
import AddUser from '../assets/add_user.svg';

const REQUIRED_CAPTURES = 10;
const CAPTURE_INTERVAL_MS = 600;

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

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalRef = useRef(null);

    const stopCamera = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setError('Camera access denied. Please allow camera permissions.');
        }
    }, []);

    const startCapturing = useCallback(() => {
        setCapturing(true);
        setCapturedCount(0);
        setFrames([]);

        const collectedFrames = [];

        intervalRef.current = setInterval(() => {
            if (!videoRef.current || !canvasRef.current) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            collectedFrames.push(dataUrl);
            setCapturedCount(collectedFrames.length);

            if (collectedFrames.length >= REQUIRED_CAPTURES) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                setCapturing(false);
                setFrames(collectedFrames);
            }
        }, CAPTURE_INTERVAL_MS);
    }, []);

    const handleSubmitFaces = useCallback(async (capturedFrames) => {
        setSubmitting(true);
        setError('');
        try {
            const response = await fetch('http://localhost:5000/register-face', {
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
        } catch (err) {
            setError('Server error. Is the backend running?');
        } finally {
            setSubmitting(false);
        }
    }, [name, uid]);

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
    }, [stopCamera]);

    const handleNextToUid = () => {
        if (!name.trim()) { setError('Please enter your name'); return; }
        setError('');
        setStep(2);
    };

    const handleNextToCamera = () => {
        if (uid.length !== 10) { setError('UID must be exactly 10 digits'); return; }
        const existingUIDs = JSON.parse(localStorage.getItem('uids')) || [];
        if (existingUIDs.includes(uid)) { setError('This UID is already registered'); return; }
        setError('');
        setStep(3);
        startCamera();
    };

    const progress = (capturedCount / REQUIRED_CAPTURES) * 100;

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
                                {step === 3 && 'Face Capture'}
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

                            {step === 2 && (
                                <div className="space-y-4">
                                    <p className="text-sm text-white/40">Registering: <span className="text-white">{name}</span></p>
                                    <div>
                                        <label className="block text-sm text-white/50 mb-2">UID (10 digits)</label>
                                        <input
                                            type="text"
                                            value={uid}
                                            onChange={(e) => setUid(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleNextToCamera()}
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
                                            onClick={handleNextToCamera}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-4">
                                    <p className="text-sm text-white/40">
                                        Registering: <span className="text-white">{name}</span> &middot; UID: <span className="text-white">{uid}</span>
                                    </p>

                                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover mirror"
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
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => { setStep(2); setError(''); stopCamera(); }}
                                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg font-medium transition"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={startCapturing}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition"
                                            >
                                                Start Capture
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-white/10 flex justify-center gap-2">
                            {[1, 2, 3].map(s => (
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
