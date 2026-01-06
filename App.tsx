
import React from 'react';
import { AdminPanel } from './components/AdminPanel';

function App() {
  return (
    <div className="min-h-screen bg-[#050505] selection:bg-blue-600 selection:text-white">
      <AdminPanel onLogout={() => window.location.reload()} />
    </div>
  );
}

export default App;
