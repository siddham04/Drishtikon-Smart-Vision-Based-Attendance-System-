// MyComponent.jsx
import React from 'react';
import AttedenceGif from './attendence_take.gif'

const AttendenceShown = () => {
    const data = [
        { name: 'Shwetank', timestamp: '2024-05-16 10:00:00' },
        { name: 'Sidhant', timestamp: '2024-05-16 11:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        // { name: 'Shruti', timestamp: '2024-05-16 12:00:00' },
        // Add more data if needed
    ];
    const presentCount = data.length;
    const TotalDays = 20;
    const Absents = TotalDays - presentCount;
    if(presentCount === TotalDays){
        alert("You were never absenmt");
    }

    return (
        <div className="relative flex flex-col justify-between text-center text-black h-full">
            <h2 className="show_heading text-4xl font-bold mb-4 m-5 ">TODAYS ATTENDENCE</h2>
            <div className="flex justify-center">
                <img src={AttedenceGif} alt="Attendance GIF" />
            </div>
            <div className="max-h-96 overflow-y-auto flex justify-center m-5">
                <div className="w-full">
                    <table className="table table-auto w-full">
                        <thead className="table_heading sticky top-0 bg-green-700 z-10">
                            <tr>
                                <th className="border text-2xl px-4 py-2">NAME</th>
                                <th className="border text-2xl px-4 py-2">TIMESTAMP</th>
                            </tr>
                        </thead>
                        <tbody className="table_data">
                            {data.map((item, index) => (
                                <tr key={index}>
                                    <td className="border text-xl px-2 py-2">{item.name}</td>
                                    <td className="border text-xl px-2 py-2">{item.timestamp}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="mt-5">
                <p className="text-xl font-semibold">Total: {TotalDays}</p>
                <p className="text-xl font-semibold">Presents: {presentCount}</p>
                <p className="text-xl font-semibold">Absents: {Absents}</p>
            </div>
        </div>
    );
};

export default AttendenceShown;
