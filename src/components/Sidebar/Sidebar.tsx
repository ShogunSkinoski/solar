'use client';

import { useRooftopStore } from '@/store/rooftopStore';

const ROOF_TYPES = [
    { type: 'flat' as const, label: 'Flat', icon: '▬' },
    { type: 'gable' as const, label: 'Gable', icon: '⌂' },
];

const SECTION_LABELS = ['Roofs', 'Extensions', 'Dormers', 'Ground', 'Misc.'];

export default function Sidebar() {
    const { activeRoofType, setActiveRoofType } = useRooftopStore();

    return (
        <aside className="sidebar">
            {SECTION_LABELS.map((section, si) => (
                <div key={section} className="sidebar-section">
                    <div className="sidebar-section-label">{section}</div>
                    {section === 'Roofs' ? (
                        <div className="sidebar-items">
                            {ROOF_TYPES.map(({ type, label, icon }) => (
                                <button
                                    key={type}
                                    className={`sidebar-item${activeRoofType === type ? ' active' : ''}`}
                                    onClick={() => setActiveRoofType(type)}
                                    title={label}
                                >
                                    <span className="sidebar-item-icon">{icon}</span>
                                    <span className="sidebar-item-label">{label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="sidebar-items">
                            {[0, 1].map((i) => (
                                <button key={i} className="sidebar-item" title={`${section} ${i + 1}`}>
                                    <span className="sidebar-item-icon">□</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </aside>
    );
}
