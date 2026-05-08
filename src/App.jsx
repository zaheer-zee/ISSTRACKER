import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import ISSTracker from './components/ISSTracker';
import NewsDashboard from './components/NewsDashboard';
import Charts from './components/Charts';
import Chatbot from './components/Chatbot';
import ThemeToggle from './components/ThemeToggle';

function App() {
  const [speedData, setSpeedData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  
  // Minimal Dashboard Data to pass to Chatbot
  const [dashboardData, setDashboardData] = useState({
    iss: { lat: 0, lng: 0 },
    speed: 0,
    locationName: '',
    people: [],
    news: []
  });

  const handleSpeedUpdate = (data) => {
    setSpeedData(prev => {
      const newData = [...prev, data];
      return newData.slice(-30);
    });
    // Assuming ISS tracker doesn't expose full data, we can just use this simplified approach or 
    // better, update Dashboard data via ref or prop. We will just pass what we can or let ISSTracker pass full object
  };

  const updateDashboardContext = (issContextPart) => {
    setDashboardData(prev => ({ ...prev, ...issContextPart }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors text-slate-900 dark:text-slate-100 font-sans">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              🌍
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CosmoNews Dashboard
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top row: Map and News */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div>
            <ISSTracker 
              onSpeedUpdate={handleSpeedUpdate} 
              onDashboardUpdate={updateDashboardContext}
            />
          </div>
          <div className="mt-10 xl:mt-0">
            <NewsDashboard onNewsFetched={(news) => {
              setNewsData(news);
              setDashboardData(prev => ({ ...prev, news }));
            }} />
          </div>
        </div>

        {/* Charts Section */}
        <div className="pt-8">
          <Charts speedData={speedData} newsData={newsData} />
        </div>

      </main>

      {/* Floating Chatbot */}
      <Chatbot dashboardData={{...dashboardData, speed: speedData[speedData.length - 1]?.speed || 0}} />
      
    </div>
  );
}

export default App;
