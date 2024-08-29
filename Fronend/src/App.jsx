import React from 'react'
import Header from './components/header';
import Register from './components/register';
import TakeAtt from './components/take';
import ViewAtt from './components/view';
import Footer from './components/footer';
import './App.css'

function App() {

  return (
    <div className="">
      <div className="body w-full h-full flex flex-col">
        <div className="header">
          <Header />
        </div>
        <div className="mainpart w-full p-10 mt-10  justify-evenly rounded-lg flex">
          <div className="register flex w-4/12 justify-center">
            <Register />
          </div>
          <div className="take flex justify-center w-4/12">
            <TakeAtt />
          </div>
          <div className="view flex justify-center w-4/12">
            <ViewAtt />
          </div>
        </div>
      </div>
      <div className="footer absolute bottom-0 w-screen p-5 bg-black bg-opacity-30">
          <Footer />
        </div>
    </div>
  )
}

export default App
