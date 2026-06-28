import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomeDashboard from './pages/WelcomeDashboard';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeDashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;