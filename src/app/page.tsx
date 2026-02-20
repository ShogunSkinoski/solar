'use client';

import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar/Sidebar';
import BottomBar from '@/components/BottomBar/BottomBar';
import ElevationsPanel from '@/components/ElevationsPanel/ElevationsPanel';

const PlanView = dynamic(() => import('@/components/PlanView/PlanView'), {
  ssr: false,
  loading: () => <div style={{ flex: 1, background: '#2a3a2a' }} />,
});

const View3D = dynamic(() => import('@/components/View3D/View3D'), {
  ssr: false,
  loading: () => <div style={{ flex: 1, background: '#111' }} />,
});

const InteractiveTutorial = dynamic(() => import('@/components/InteractiveTutorial/InteractiveTutorial'), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="app-shell">
      <div className="main-content">
        <Sidebar />

        <div className="viewports">
          <div className="panel panel-plan tour-plan-view">
            <div className="panel-header">
              <span>Plan View</span>
              <div className="panel-header-actions">
                <button className="panel-header-btn" title="Expand">⤢</button>
              </div>
            </div>
            <div className="panel-body">
              <PlanView />
            </div>
          </div>

          <div className="right-column">
            <div className="panel panel-3d tour-3d-view">
              <div className="panel-header">
                <span>3D View</span>
                <div className="panel-header-actions">
                  <button className="panel-header-btn" title="Expand">⤢</button>
                </div>
              </div>
              <div className="panel-body">
                <View3D />
              </div>
            </div>
            <div className="panel panel-3d tour-elevations-panel">
              <ElevationsPanel />
            </div>
          </div>
        </div>
      </div>

      <InteractiveTutorial />
    </div>
  );
}

