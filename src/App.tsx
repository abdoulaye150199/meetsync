import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header/Header';
import HeroSection from './components/HeroSection/HeroSection';
import AuthPage from './components/Auth/AuthPage';
import { SplashPage } from './components/SplashPage';
import { HomePage } from './components/HomePage';
import AdminPage from './components/Admin/AdminPage';

function App() {
  const location = useLocation();
  
  // Don't show header on auth pages, splash, or home
  const showHeader = 
    location.pathname !== '/login' && 
    location.pathname !== '/splash' && 
    location.pathname !== '/home' &&
    location.pathname !== '/admin';

  return (
    <>
      {showHeader && <Header />}
      <div key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HeroSection />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/splash" element={<SplashPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
