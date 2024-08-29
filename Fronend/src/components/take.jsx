import React from 'react';
import Take from '../assets/take.png';

const TakeAtt = () => {

    const handleTakeAttendance = async () => {
        try {
            const response = await fetch('http://localhost:5000/attend'); // Correct URL
            const data = await response.json();
            console.log(data.message);
        } catch (error) {
            console.error("Error taking attendance:", error);
        }
    };

    return (
        <div className="flex flex-col relative justify-center items-center w-4/12 ml-10 h-full ">
            <div className="main_take  h-96 w-96 m-10 flex flex-col items-center justify-center">
            <div className="main_card1 h-96 w-96 m-10 flex justify-center" onClick={handleTakeAttendance}>
                <div className="part1 flex w-96 h-96 bg-white justify-center rounded-full">
                    <img src={Take} alt="Take Attendance" />
                </div>
                <div className="part1_5 bg-[#06a84f] absolute w-96 h-96 flex justify-center items-center rounded-full cursor-pointer opacity-0">
                    <div className="flex justify-center items-center"> 
                        <h1 className="text-3xl text-nowrap">
                            Take Attendance
                        </h1>
                    </div>
                </div>
                <div className="part2 absolute w-96 h-96 rounded-full"></div>
                <div className="part3 absolute w-96 h-96 rounded-full "></div>
            </div>
            <div className="take_heading text-3xl">
                    <h1>Take Attendence</h1>
                </div>
            </div>
        </div>
    );
};

export default TakeAtt;
