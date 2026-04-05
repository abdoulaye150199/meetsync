import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import phoneImage from '../../assets/Free iPhone Air (1).png';

interface SplashPageProps {
  onSplashComplete?: () => void;
}

const SplashPage = ({ onSplashComplete }: SplashPageProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-navigate to home after animation completes (3.5 seconds)
    const timer = setTimeout(() => {
      onSplashComplete?.();
      navigate('/home');
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate, onSplashComplete]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#01333D] via-[#01444d] to-[#01333D] flex items-center justify-center">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-white/5 blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Logo with fade-in animation */}
        <div className="mb-12 animate-fadeIn">
          <h1 className="text-center font-logo text-5xl lg:text-7xl tracking-widest text-white drop-shadow-lg">
            MEET SYNC
          </h1>
        </div>

        {/* Phone with scale animation */}
        <div className="relative animate-phoneSlideUp">
          <div className="relative w-[300px] lg:w-[400px]">
            <img
              src={phoneImage}
              alt="MeetSync App Splash"
              className="w-full h-auto drop-shadow-2xl"
            />
          </div>

          {/* Glow effect behind phone */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-[40px] blur-2xl -z-10 animate-pulse" />
        </div>

        {/* Loading indicator */}
        <div className="mt-16 flex flex-col items-center gap-6">
          <div className="flex gap-2">
            <div className="h-2 w-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="h-2 w-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="h-2 w-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
          <p className="text-white/70 text-sm tracking-wider animate-pulse">
            Préparation de votre espace...
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
