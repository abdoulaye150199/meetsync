import { SiGoogle, SiApple } from 'react-icons/si';

const SocialLoginButtons = () => {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-base font-medium text-white/70">Ou continuer avec</p>
      <div className="flex gap-3">
        <button
          type="button"
          className="glass-3d-btn flex h-11 w-11 items-center justify-center rounded-xl text-white transition-transform hover:scale-105"
          aria-label="Continuer avec Google"
        >
          <SiGoogle className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="glass-3d-btn flex h-11 w-11 items-center justify-center rounded-xl text-white transition-transform hover:scale-105"
          aria-label="Continuer avec Apple"
        >
          <SiApple className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default SocialLoginButtons;
