import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SiGoogle, SiApple } from 'react-icons/si';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { requestGoogleProfileAccessToken } from '../../services/googleAuth';

interface GoogleAuthApiResponse {
  success: boolean;
  message?: string;
  data?: {
    utilisateur?: {
      id: string;
      nom: string;
      email: string;
      role: string;
    };
    jeton?: string;
    estNouveauCompte?: boolean;
  };
  error?: string;
}

interface GoogleConfigApiResponse {
  success: boolean;
  data?: {
    configured?: boolean;
    clientId?: string | null;
  };
  error?: string;
}

const SocialLoginButtons = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveGoogleClientId = async () => {
    const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
    if (envClientId) {
      return envClientId;
    }

    const response = await apiService.get<GoogleConfigApiResponse>('/auth/google/config');
    if (response.error) {
      throw new Error(response.error);
    }

    const apiClientId = response.data?.data?.clientId?.trim();
    if (apiClientId) {
      return apiClientId;
    }

    throw new Error("Google OAuth n'est pas encore configuré sur le serveur.");
  };

  const handleGoogleAuth = async () => {
    if (isGoogleLoading) return;

    setIsGoogleLoading(true);
    setError(null);

    try {
      const clientId = await resolveGoogleClientId();
      const tokenResponse = await requestGoogleProfileAccessToken(clientId);
      const accessToken = tokenResponse.access_token;

      if (!accessToken) {
        setError('Jeton Google manquant.');
        return;
      }

      const response = await apiService.post<GoogleAuthApiResponse>('/auth/google', {
        accessToken,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      const token = response.data?.data?.jeton;
      if (!token) {
        setError('Réponse Google invalide.');
        return;
      }

      login(token);
      navigate('/splash');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Connexion Google impossible.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-base font-medium text-white/70">Ou continuer avec</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            void handleGoogleAuth();
          }}
          disabled={isGoogleLoading}
          className="glass-3d-btn flex h-11 w-11 items-center justify-center rounded-xl text-white transition-transform hover:scale-105"
          aria-label="Continuer avec Google"
          title="Continuer avec Google"
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
      {isGoogleLoading && (
        <p className="text-sm text-white/80">Connexion Google...</p>
      )}
      {error && (
        <p className="text-center text-sm text-red-200" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default SocialLoginButtons;
