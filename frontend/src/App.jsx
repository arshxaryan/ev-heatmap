import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import MapPage from './pages/MapPage.jsx';
import StatsPage from './pages/StatsPage.jsx';
import Insights from './pages/Insights.jsx';
import Compare from './pages/Compare.jsx';
import Methodology from './pages/Methodology.jsx';
import About from './pages/About.jsx';
import { useApi } from './api/client.js';

/** App shell: nav (with live "Last updated" stamp), routes, footer. */
export default function App() {
  const { data: meta } = useApi('/meta');
  return (
    <div className="flex min-h-full flex-col">
      <NavBar lastUpdated={meta?.lastUpdated} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
