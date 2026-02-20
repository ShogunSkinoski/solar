'use client';

import { useState, useEffect } from 'react';

export default function TutorialModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem('hasSeenTutorial');
        if (!hasSeen) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('hasSeenTutorial', 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="tutorial-overlay">
            <div className="tutorial-modal">
                <h2 className="tutorial-title">Welcome to Rooftop Modeler</h2>
                <ol className="tutorial-list">
                    <li>Select a roof type from the left sidebar ("Flat" or "Gable").</li>
                    <li>Click anywhere on the Plan View to place the building.</li>
                    <li>Drag the white handles to resize the building footprint.</li>
                    <li>Drag the orange circular handle to rotate the building.</li>
                    <li>Check the 3D View to see your generated building.</li>
                    <li>Use the Elevations panel to adjust wall and ridge heights.</li>
                    <li>Press Delete or Backspace to remove a selected building.</li>
                </ol>
                <button className="tutorial-btn" onClick={handleClose}>
                    Got it
                </button>
            </div>
        </div>
    );
}
