import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config';
import Logo from '../assets/logo_avinya.svg';

const Header = ({ selectedGroup, onGroupChange }) => {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === '/dashboard';

  useEffect(() => {
    fetch(`${API_URL}/groups`)
      .then(r => r.json())
      .then(data => setGroups(data.groups || []))
      .catch(() => {});
  }, []);

  const handleItemClick = (group) => {
    onGroupChange(group);
    setOpen(false);
  };

  return (
    <header className="py-4 px-6 flex justify-center relative">
      <div className="header_inside w-full flex items-center p-4 px-8 rounded-2xl">
        <div className="logo absolute left-10 w-16">
          <img src={Logo} alt="Logo" className="w-full" />
        </div>
        <div className="mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wide cursor-pointer" onClick={() => navigate('/')}>
            Drishtikon
          </h1>
        </div>
        <div className="relative z-40 flex items-center gap-3">
          <button
            onClick={() => navigate(isDashboard ? '/' : '/dashboard')}
            className={`text-sm px-4 py-2 rounded-full border transition ${
              isDashboard
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/30'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            {isDashboard ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" /></svg>
                Home
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Dashboard
              </span>
            )}
          </button>

          {selectedGroup && (
            <span className="text-sm text-white/50">
              Class: <span className="text-white font-medium">{selectedGroup}</span>
            </span>
          )}
          <button
            className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full border border-white/20 transition"
            onClick={() => setOpen(!open)}
          >
            {selectedGroup || 'Select Group'}
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 p-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl shadow-2xl overflow-y-auto max-h-72 w-32 z-50">
              {groups.map(g => (
                <div
                  key={g}
                  className={`p-2 rounded-lg text-center cursor-pointer text-sm transition ${
                    selectedGroup === g
                      ? 'bg-blue-600 text-white'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                  onClick={() => handleItemClick(g)}
                >
                  {g}
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-white/30 text-xs text-center py-2">Loading...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
