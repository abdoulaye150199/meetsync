import { useState } from 'react';
import ViewTransitionLink from '../ViewTransitionLink';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import PhoneMockup from './PhoneMockup';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleForm = () => {
    setIsLogin((prev) => !prev);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden ">
      <ViewTransitionLink
        to="/"
        className="absolute left-4 top-4 z-30 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01333D] focus-visible:ring-offset-2"
        aria-label="Retour à l'accueil"
      >
        <span aria-hidden="true">←</span>
        Retour à l&apos;accueil
      </ViewTransitionLink>
      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen w-full bg-white flex items-center justify-center">
        {isLogin ? (
          <LoginForm onToggle={toggleForm} />
        ) : (
          <RegisterForm onToggle={toggleForm} />
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block min-h-screen w-full">
        {/* Form Panel Container - Animates between left and right */}
        <div
          className={`absolute top-0 bottom-0 w-[48%] z-20 transition-all duration-700 ease-in-out ${
            isLogin ? 'left-0' : 'left-[52%]'
          }`}
        >
          <div
            className={`h-full mr-3 mb-4 bg-[#01333D] flex items-center justify-center transition-all duration-700 ease-in-out ${
              isLogin ? 'rounded-tr-[90px] rounded-br-[90px]' : 'rounded-tl-[90px] rounded-bl-[90px]'
            }`}
          >
            {isLogin ? (
              <LoginForm onToggle={toggleForm} />
            ) : (
              <RegisterForm onToggle={toggleForm} />
            )}
          </div>
        </div>

        {/* Phone Mockup Container - Animates between right and left */}
        <div
          className={`absolute top-0 bottom-0 w-[48%] z-10 flex items-center justify-center transition-all duration-700 ease-in-out ${
            isLogin ? 'left-[52%]' : 'left-0'
          }`}
        >
          <PhoneMockup />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
