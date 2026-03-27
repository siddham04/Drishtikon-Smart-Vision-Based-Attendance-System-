import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { API_URL } from '../config';

const Dashboard = ({ selectedGroup }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchAnalytics = useCallback(async () => {
        if (!selectedGroup) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/analytics?group=${selectedGroup}`);
            const json = await res.json();
            if (res.ok) {
                setData(json);
            } else {
                setError(json.error || 'Failed to load analytics');
            }
        } catch {
            setError('Server error. Is the backend running?');
        } finally {
            setLoading(false);
        }
    }, [selectedGroup]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    if (!selectedGroup) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-white/40 text-lg">Select a class group from the header to view analytics</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const todayStats = data.daily_stats.length > 0 ? data.daily_stats[data.daily_stats.length - 1] : null;
    const todayPct = todayStats ? todayStats.percentage : 0;

    const barColors = data.student_stats.map(s => s.at_risk ? '#ef4444' : '#3b82f6');

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
                <p className="text-white/70 mb-1">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}%</p>
                ))}
            </div>
        );
    };

    return (
        <div className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-white">Dashboard — {selectedGroup}</h1>
                <button
                    onClick={fetchAnalytics}
                    className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition"
                >
                    Refresh
                </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Students" value={data.total_students} color="blue" />
                <StatCard label="Today's Attendance" value={`${todayPct}%`} color="green" />
                <StatCard label="At Risk (<75%)" value={data.at_risk_count} color="red" />
                <StatCard label="Classes Held" value={data.total_classes} color="purple" />
            </div>

            {data.total_classes === 0 && (
                <div className="text-center py-16 text-white/40">
                    <p className="text-lg mb-2">No attendance data yet</p>
                    <p className="text-sm">Take attendance for {selectedGroup} to see analytics here.</p>
                </div>
            )}

            {data.total_classes > 0 && (
                <>
                    {/* Daily attendance trend */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Daily Attendance Trend</h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={data.daily_stats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone" dataKey="percentage" name="Attendance"
                                    stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Per-student bar chart */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Student Attendance</h2>
                        <ResponsiveContainer width="100%" height={Math.max(280, data.student_stats.length * 32)}>
                            <BarChart data={data.student_stats} layout="vertical" margin={{ left: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} width={75} />
                                <Tooltip
                                    formatter={(val) => [`${val}%`, 'Attendance']}
                                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                                />
                                <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                                    {data.student_stats.map((_, i) => (
                                        <Cell key={i} fill={barColors[i]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* At-risk table */}
                    {data.at_risk_count > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-red-400 mb-4">
                                At-Risk Students ({data.at_risk_count})
                            </h2>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-white/5">
                                        <th className="text-left px-4 py-3 text-white/50 font-medium">Name</th>
                                        <th className="text-left px-4 py-3 text-white/50 font-medium">UID</th>
                                        <th className="text-left px-4 py-3 text-white/50 font-medium">Present</th>
                                        <th className="text-left px-4 py-3 text-white/50 font-medium">Attendance %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.student_stats.filter(s => s.at_risk).map((s, i) => (
                                        <tr key={i} className="border-t border-white/5">
                                            <td className="px-4 py-3 text-white">{s.name}</td>
                                            <td className="px-4 py-3 text-white/70">{s.uid}</td>
                                            <td className="px-4 py-3 text-white/70">{s.total_present}/{s.total_classes}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 font-medium">
                                                    {s.percentage}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const StatCard = ({ label, value, color }) => {
    const colors = {
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        green: 'bg-green-500/10 border-green-500/20 text-green-400',
        red: 'bg-red-500/10 border-red-500/20 text-red-400',
        purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    };
    return (
        <div className={`border rounded-2xl p-5 ${colors[color]}`}>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-white/50 mt-1">{label}</p>
        </div>
    );
};

export default Dashboard;
