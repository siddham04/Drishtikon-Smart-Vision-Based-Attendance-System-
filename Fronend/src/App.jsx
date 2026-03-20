import React, { useState } from 'react'
import Header from './components/header';
import Register from './components/register';
import TakeAtt from './components/take';
import ViewAtt from './components/view';
import Footer from './components/footer';
import './App.css'

function App() {
  const [selectedGroup, setSelectedGroup] = useState('');

  return (
    <div className="min-h-screen flex flex-col">
      <Header selectedGroup={selectedGroup} onGroupChange={setSelectedGroup} />
      {!selectedGroup && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40 text-lg">Select a class group from the header to get started</p>
        </div>
      )}
      {selectedGroup && (
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="flex flex-wrap justify-center gap-16 max-w-6xl w-full">
            <Register group={selectedGroup} />
            <TakeAtt group={selectedGroup} />
            <ViewAtt group={selectedGroup} />
          </div>
        </main>
      )}
      <Footer />
    </div>
  )
}

export default App
