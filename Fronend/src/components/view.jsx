import React, { useState } from 'react';
import ViewIcon from '../assets/view.svg';

const ViewAtt = ({ group }) => {
    const [showPopup, setShowPopup] = useState(false);
    const [records, setRecords] = useState([]);
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchAttendance = async (date) => {
        setLoading(true);
        setError('');
        try {
            let url = `http://localhost:5000/view-attendance?group=${group}`;
            if (date) url += `&date=${date}`;
            const response = await fetch(url);
            const data = await response.json();
            setRecords(data.records || []);
            setSelectedDate(data.date || '');
            if (data.dates) setDates(data.dates);
            if (data.records.length === 0) setError(data.message || 'No records found');
        } catch {
            setError('Failed to fetch. Is the backend running?');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewClick = () => {
        setShowPopup(true);
        fetchAttendance();
    };

    const handleDownload = () => {
        if (!selectedDate) return;
        window.open(`http://localhost:5000/download-attendance?group=${group}&date=${selectedDate}`, '_blank');
    };

    const presentCount = records.filter(r => r.Status === 'Present').length;
    const absentCount = records.filter(r => r.Status === 'Absent').length;

    return (
        <div className="action-card flex flex-col items-center">
            <div className="card-circle theme-red" onClick={handleViewClick}>
                <div className="circle-main">
                    <img src={ViewIcon} alt="View Attendance" />
                </div>
                <div className="circle-hover bg-[#a93226]">
                    <h1 className="text-xl font-bold text-white">View Attendance</h1>
                </div>
                <div className="circle-ring-1"></div>
                <div className="circle-ring-2"></div>
            </div>
            <div className="card-label text-center">
                <h2 className="text-xl text-white/90">View Attendance</h2>
            </div>

            {showPopup && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowPopup(false)}>
                    <div className="modal-content w-11/12 max-w-3xl max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">
                                Attendance — {group}
                            </h2>
                            <button
                                onClick={() => setShowPopup(false)}
                                className="text-white/40 hover:text-white text-2xl leading-none transition"
                            >&times;</button>
                        </div>

                        <div className="px-5 pt-4 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                {dates.length > 0 && (
                                    <>
                                        <label className="text-sm text-white/50">Date:</label>
                                        <select
                                            value={selectedDate}
                                            onChange={(e) => { setSelectedDate(e.target.value); fetchAttendance(e.target.value); }}
                                            className="bg-white/5 border border-white/10 text-white text-sm px-3 py-1.5 rounded-lg"
                                        >
                                            {dates.map((d) => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </>
                                )}
                            </div>
                            {selectedDate && records.length > 0 && (
                                <button
                                    onClick={handleDownload}
                                    className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg transition flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download Excel
                                </button>
                            )}
                        </div>

                        {records.length > 0 && !loading && (
                            <div className="px-5 pt-3 flex gap-3">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 text-sm">
                                    <span className="text-green-400 font-medium">{presentCount}</span>
                                    <span className="text-white/40 ml-1">Present</span>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 text-sm">
                                    <span className="text-red-400 font-medium">{absentCount}</span>
                                    <span className="text-white/40 ml-1">Absent</span>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 text-sm">
                                    <span className="text-blue-400 font-medium">{records.length}</span>
                                    <span className="text-white/40 ml-1">Total</span>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-5">
                            {loading && <p className="text-center text-white/40 py-8">Loading...</p>}
                            {error && !loading && <p className="text-center text-yellow-400/80 py-8">{error}</p>}
                            {!loading && !error && records.length > 0 && (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-white/5">
                                            <th className="text-left px-4 py-3 text-white/50 font-medium">#</th>
                                            <th className="text-left px-4 py-3 text-white/50 font-medium">Name</th>
                                            <th className="text-left px-4 py-3 text-white/50 font-medium">UID</th>
                                            <th className="text-left px-4 py-3 text-white/50 font-medium">Status</th>
                                            <th className="text-left px-4 py-3 text-white/50 font-medium">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((record, i) => (
                                            <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition">
                                                <td className="px-4 py-3 text-white/70">{record['S.No']}</td>
                                                <td className="px-4 py-3 text-white">{record['Name']}</td>
                                                <td className="px-4 py-3 text-white/70">{record['UID']}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        record['Status'] === 'Present'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {record['Status']}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-white/70">{record['Time']}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-white/10 text-xs text-white/30 text-center">
                            {group} {selectedDate && `— ${selectedDate}`}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewAtt;
