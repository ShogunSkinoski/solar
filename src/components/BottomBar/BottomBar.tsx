'use client';

import { useState } from 'react';

type ImageryType = 'orthorectified' | 'standard';

export default function BottomBar() {
    const [imageryType, setImageryType] = useState<ImageryType>('orthorectified');
    const [zoom, setZoom] = useState(50);

    return (
        <div className="bottom-bar">
            <div className="imagery-type-group">
                <span className="imagery-label">Map imagery type</span>
                <span className="imagery-info">ⓘ</span>
                <div className="imagery-toggle">
                    <button
                        className={`toggle-btn${imageryType === 'orthorectified' ? ' active' : ''}`}
                        onClick={() => setImageryType('orthorectified')}
                    >
                        Orthorectified
                    </button>
                    <button
                        className={`toggle-btn${imageryType === 'standard' ? ' active' : ''}`}
                        onClick={() => setImageryType('standard')}
                    >
                        Standard
                    </button>
                </div>
            </div>

            <div className="zoom-group">
                <span className="zoom-icon">🔍</span>
                <input
                    type="range"
                    min={10}
                    max={100}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="zoom-slider"
                />
            </div>

            <button className="next-btn">Next</button>
        </div>
    );
}
