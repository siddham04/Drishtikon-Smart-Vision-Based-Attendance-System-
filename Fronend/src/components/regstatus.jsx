import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config';

const REQUIRED_CAPTURES = 10;
const CAPTURE_INTERVAL_MS = 600;
const LIVENESS_DURATION_MS = 5000;
const LIVENESS_FPS_MS = 150;

const RegStatus = ({ group }) => {
    const [students, setStudents] = useState([]);
    const [registeredCount, setRegisteredCount] = useState(0);
    const [unregisteredCount, setUnregisteredCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(false);

    // Registration modal state
    const [regStudent, setRegStudent] = useState(null);
    const [regStep, setRegStep] = useState('idle'); // idle | liveness | liveness-checking | liveness-processing | liveness-passed | liveness-failed | capture | capturing | processing | done | error
    const [regError, setRegError] = useState('');
    const [regResult, setRegResult] = useState('');
    const [livenessProgress, setLivenessProgress] = useState(0);
    const [blinksDetected, setBlinksDetected] = useState(0);
    const [capturedCount, setCapturedCount] = useState(0);
    const [captureProgress, setCaptureProgress] = useState(0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const livenessIntervalRef = useRef(null);
    const livenessTimerRef = useRef(null);

    const fetchStudents = useCallback(() => {
        if (!group) return;
        setLoading(true);
        fetch(`${API_URL}/group-students?group=${group}`)
            .then(r => r.json())
            .then(data => {
                setStudents(data.students || []);
                setRegisteredCount(data.registered_count || 0);
                setUnregisteredCount(data.unregistered_count || 0);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [group]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const filtered = students.filter(s => {
        if (filter === 'registered' && !s.face_registered) return false;
        if (filter === 'unregistered' && s.face_registered) return false;
        if (search) {
            const q = search.toLowerCase();
            return s.name.toLowerCase().includes(q) || s.uid.includes(q);
        }
        return true;
    });

    // ── Camera helpers ──────────────────────────────────────────────────

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
            setRegError('Camera access denied.');
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

    // ── Open registration for a student ─────────────────────────────────

    const handleRegisterClick = (student) => {
        setRegStudent(student);
        setRegStep('liveness');
        setRegError('');
        setRegResult('');
        setLivenessProgress(0);
        setBlinksDetected(0);
        setCapturedCount(0);
        setCaptureProgress(0);
        setTimeout(() => startCamera(), 200);
    };

    const handleCloseReg = useCallback(() => {
        stopCamera();
        setRegStudent(null);
        setRegStep('idle');
        setRegError('');
        setRegResult('');
        setLivenessProgress(0);
        setBlinksDetected(0);
        setCapturedCount(0);
        setCaptureProgress(0);
    }, [stopCamera]);

    // ── Liveness ────────────────────────────────────────────────────────

    const submitLiveness = useCallback(async (frames) => {
        setRegStep('liveness-processing');
        try {
            const res = await fetch(`${API_URL}/liveness-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frames }),
            });
            const data = await res.json();
            setBlinksDetected(data.blinks_detected || 0);
            if (data.alive) {
                setRegStep('liveness-passed');
                setTimeout(() => setRegStep('capture'), 800);
            } else {
                setRegStep('liveness-failed');
                setRegError(`Liveness failed (${data.blinks_detected || 0} blinks). Please try again.`);
            }
        } catch {
            setRegStep('liveness-failed');
            setRegError('Server error during liveness check.');
        }
    }, []);

    const startLivenessCheck = useCallback(() => {
        setRegStep('liveness-checking');
        setBlinksDetected(0);
        setLivenessProgress(0);
        setRegError('');

        const frames = [];
        const startTime = Date.now();

        livenessIntervalRef.current = setInterval(() => {
            const frame = captureFrame();
            if (frame) frames.push(frame);
        }, LIVENESS_FPS_MS);

        livenessTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setLivenessProgress(Math.min((elapsed / LIVENESS_DURATION_MS) * 100, 100));

            if (elapsed >= LIVENESS_DURATION_MS) {
                clearInterval(livenessIntervalRef.current);
                clearInterval(livenessTimerRef.current);
                livenessIntervalRef.current = null;
                livenessTimerRef.current = null;
                submitLiveness(frames);
            }
        }, 100);
    }, [captureFrame, submitLiveness]);

    // ── Face capture ────────────────────────────────────────────────────

    const submitFaces = useCallback(async (frames) => {
        if (!regStudent) return;
        setRegStep('processing');
        try {
            const response = await fetch(`${API_URL}/register-face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: regStudent.name,
                    uid: regStudent.uid,
                    group,
                    frames,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setRegResult(`Registered! ${data.faces_captured} faces captured.`);
                setRegStep('done');
                fetchStudents();
            } else {
                setRegError(data.error || 'Registration failed');
                setRegStep('error');
            }
        } catch {
            setRegError('Server error. Is the backend running?');
            setRegStep('error');
        }
    }, [regStudent, group, fetchStudents]);

    const startCapturing = useCallback(() => {
        setRegStep('capturing');
        setCapturedCount(0);
        setCaptureProgress(0);
        setRegError('');

        const collected = [];
        intervalRef.current = setInterval(() => {
            const dataUrl = captureFrame();
            if (!dataUrl) return;
            collected.push(dataUrl);
            setCapturedCount(collected.length);
            setCaptureProgress((collected.length / REQUIRED_CAPTURES) * 100);

            if (collected.length >= REQUIRED_CAPTURES) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                stopCamera();
                submitFaces(collected);
            }
        }, CAPTURE_INTERVAL_MS);
    }, [captureFrame, stopCamera, submitFaces]);

    // ── Derived ─────────────────────────────────────────────────────────

    const showLivenessUI = ['liveness', 'liveness-checking', 'liveness-processing', 'liveness-passed', 'liveness-failed'].includes(regStep);
    const showCaptureUI = ['capture', 'capturing', 'processing'].includes(regStep);

    if (!group) return null;

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 px-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {/* Summary bar */}
                <div
                    className="flex items-center justify-between p-5 hover:bg-white/5 transition cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-center gap-3">
                        <h3 className="text-white font-semibold">Face Registration Status — {group}</h3>
                        <span className="text-xs text-white/40">({students.length} students)</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-1 rounded-full">
                                {registeredCount} registered
                            </span>
                            <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1 rounded-full">
                                {unregisteredCount} pending
                            </span>
                        </div>
                        <svg
                            className={`w-5 h-5 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {/* Expanded panel */}
                {expanded && (
                    <div className="border-t border-white/10">
                        {/* Progress bar */}
                        <div className="px-5 pt-4">
                            <div className="flex justify-between text-xs text-white/50 mb-1.5">
                                <span>Registration progress</span>
                                <span>{students.length > 0 ? Math.round(registeredCount / students.length * 100) : 0}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2.5">
                                <div
                                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${students.length > 0 ? (registeredCount / students.length * 100) : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="px-5 pt-4 flex items-center gap-3 flex-wrap">
                            <div className="flex gap-1.5">
                                {['all', 'unregistered', 'registered'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`text-xs px-3 py-1.5 rounded-lg transition capitalize ${
                                            filter === f
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                    >
                                        {f === 'all' ? `All (${students.length})` : f === 'unregistered' ? `Pending (${unregisteredCount})` : `Done (${registeredCount})`}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name or UID..."
                                className="flex-1 min-w-[180px] bg-white/5 border border-white/10 text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        {/* Student list */}
                        <div className="p-5 max-h-[400px] overflow-y-auto">
                            {loading && <p className="text-center text-white/40 py-4 text-sm">Loading...</p>}
                            {!loading && filtered.length === 0 && (
                                <p className="text-center text-white/40 py-4 text-sm">No students match</p>
                            )}
                            {!loading && filtered.length > 0 && (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-white/5">
                                            <th className="text-left px-4 py-2.5 text-white/50 font-medium text-xs">#</th>
                                            <th className="text-left px-4 py-2.5 text-white/50 font-medium text-xs">Name</th>
                                            <th className="text-left px-4 py-2.5 text-white/50 font-medium text-xs">UID</th>
                                            <th className="text-left px-4 py-2.5 text-white/50 font-medium text-xs">Face Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((s, i) => (
                                            <tr key={s.uid} className="border-t border-white/5 hover:bg-white/5 transition">
                                                <td className="px-4 py-2.5 text-white/50 text-xs">{i + 1}</td>
                                                <td className="px-4 py-2.5 text-white text-xs">{s.name}</td>
                                                <td className="px-4 py-2.5 text-white/70 text-xs font-mono">{s.uid}</td>
                                                <td className="px-4 py-2.5">
                                                    {s.face_registered ? (
                                                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 inline-flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                            Registered
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRegisterClick(s)}
                                                            className="text-[11px] px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-300 transition cursor-pointer inline-flex items-center gap-1"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                            Register Now
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Registration Modal ──────────────────────────────────────── */}
            {regStudent && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleCloseReg()}>
                    <div className="modal-content w-11/12 max-w-lg">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <div>
                                <h2 className="text-lg font-bold text-white">Register Face</h2>
                                <p className="text-sm text-white/40 mt-0.5">
                                    {regStudent.name} <span className="text-white/20 mx-1">|</span> <span className="font-mono">{regStudent.uid}</span>
                                </p>
                            </div>
                            <button onClick={handleCloseReg} className="text-white/40 hover:text-white text-2xl transition">&times;</button>
                        </div>

                        <div className="p-5">
                            {regError && (
                                <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-lg text-sm mb-4">
                                    {regError}
                                </div>
                            )}
                            {regResult && (
                                <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-2.5 rounded-lg text-sm mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {regResult}
                                </div>
                            )}

                            {/* Camera feed (shown during liveness & capture) */}
                            {(showLivenessUI || showCaptureUI) && (
                                <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-4">
                                    <video
                                        ref={videoRef}
                                        autoPlay playsInline muted
                                        className="w-full h-full object-cover"
                                        style={{ transform: 'scaleX(-1)' }}
                                    />
                                    <canvas ref={canvasRef} className="hidden" />

                                    {regStep === 'liveness-processing' && (
                                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                                <p className="text-white/70 text-sm">Verifying liveness...</p>
                                            </div>
                                        </div>
                                    )}
                                    {regStep === 'liveness-passed' && (
                                        <div className="absolute inset-0 bg-green-900/70 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-5xl mb-2">&#10003;</div>
                                                <p className="text-green-300 font-medium">Liveness Verified!</p>
                                            </div>
                                        </div>
                                    )}
                                    {regStep === 'processing' && (
                                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                                <p className="text-white/70 text-sm">Processing faces...</p>
                                            </div>
                                        </div>
                                    )}
                                    {regStep === 'capturing' && (
                                        <div className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full animate-pulse">
                                            REC
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Liveness UI */}
                            {showLivenessUI && (
                                <div className="space-y-3">
                                    {regStep === 'liveness-checking' && (
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
                                        <p className="text-purple-300 text-sm font-medium mb-1">Step 1 — Anti-Spoofing Check</p>
                                        <p className="text-white/50 text-xs">
                                            Blink naturally 2-3 times while looking at the camera.
                                        </p>
                                        {blinksDetected > 0 && (
                                            <p className="text-purple-400 text-sm mt-2 font-medium">
                                                Blinks: {blinksDetected}
                                            </p>
                                        )}
                                    </div>

                                    {(regStep === 'liveness' || regStep === 'liveness-failed') && (
                                        <button
                                            onClick={startLivenessCheck}
                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition"
                                        >
                                            {regStep === 'liveness-failed' ? 'Retry Verification' : 'Start Verification'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Face capture UI */}
                            {showCaptureUI && (
                                <div className="space-y-3">
                                    {(regStep === 'capturing' || capturedCount > 0) && regStep !== 'processing' && (
                                        <div>
                                            <div className="flex justify-between text-xs text-white/50 mb-1.5">
                                                <span>Capturing faces</span>
                                                <span>{capturedCount}/{REQUIRED_CAPTURES}</span>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${captureProgress}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                                        <p className="text-blue-300 text-sm font-medium mb-1">Step 2 — Face Capture</p>
                                        <p className="text-white/50 text-xs">
                                            Look at the camera. {REQUIRED_CAPTURES} photos will be captured automatically.
                                        </p>
                                    </div>

                                    {regStep === 'capture' && (
                                        <button
                                            onClick={startCapturing}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition"
                                        >
                                            Start Face Capture
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Done */}
                            {regStep === 'done' && (
                                <button
                                    onClick={handleCloseReg}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition"
                                >
                                    Done
                                </button>
                            )}

                            {/* Error retry */}
                            {regStep === 'error' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCloseReg}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg font-medium transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleRegisterClick(regStudent)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Step indicator */}
                        <div className="px-5 py-3 border-t border-white/10 flex justify-center gap-2">
                            <div className={`w-2 h-2 rounded-full transition ${showLivenessUI ? 'bg-purple-500' : regStep === 'done' ? 'bg-green-500/40' : 'bg-white/10'}`} />
                            <div className={`w-2 h-2 rounded-full transition ${showCaptureUI || regStep === 'processing' ? 'bg-blue-500' : regStep === 'done' ? 'bg-green-500/40' : 'bg-white/10'}`} />
                            <div className={`w-2 h-2 rounded-full transition ${regStep === 'done' ? 'bg-green-500' : 'bg-white/10'}`} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegStatus;
