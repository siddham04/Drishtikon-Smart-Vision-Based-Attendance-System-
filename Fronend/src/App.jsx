import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/header';
import Register from './components/register';
import TakeAtt from './components/take';
import ViewAtt from './components/view';
import Dashboard from './components/dashboard';
import RegStatus from './components/regstatus';
import Footer from './components/footer';
import './App.css'

function App() {
  const [selectedGroup, setSelectedGroup] = useState('');

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header selectedGroup={selectedGroup} onGroupChange={setSelectedGroup} />

        <Routes>
          <Route path="/" element={
            !selectedGroup ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/40 text-lg">Select a class group from the header to get started</p>
              </div>
            ) : (
              <main className="flex-1 px-6 py-12">
                <div className="flex flex-wrap justify-center gap-12 md:gap-20 max-w-5xl w-full mx-auto pb-8">
                  <Register group={selectedGroup} />
                  <TakeAtt group={selectedGroup} />
                  <ViewAtt group={selectedGroup} />
                </div>
                <RegStatus group={selectedGroup} />
              </main>
            )
          } />
          <Route path="/dashboard" element={<Dashboard selectedGroup={selectedGroup} />} />
        </Routes>

        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
