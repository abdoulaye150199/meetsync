import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import FormInput from './FormInput';
import SocialLoginButtons from './SocialLoginButtons';

interface LoginFormProps {
  onToggle: () => void;
}

interface LoginApiResponse {
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
  };
  error?: string;
}

const LoginForm = ({ onToggle }: LoginFormProps) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiService.post<LoginApiResponse>('/auth/login', {
        email: email.trim(),
        motDePasse: password,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      const token = response.data?.data?.jeton;
      const role = response.data?.data?.utilisateur?.role;
      if (!token) {
        setError('Réponse de connexion invalide.');
        return;
      }

      login(token);
      navigate(role === 'ADMIN' ? '/admin' : '/splash');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-8 py-4 lg:px-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <h1 className="mb-12 text-center font-logo text-4xl tracking-wider text-white lg:text-5xl">
          <span className="font-logo">MEET SYNC</span>
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FormInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            name="email"
            required
          />
          <div className="flex flex-col gap-2">
            <FormInput
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              name="password"
              required
            />
            <a
              href="#forgot-password"
              className="self-end text-sm text-white/70 hover:text-white transition-colors"
            >
              Forgot your password?
            </a>
          </div>

          {/* Buttons */}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-white/10 backdrop-blur-sm py-4 text-lg font-medium text-white transition-colors hover:bg-white/20"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>

          <button
            type="button"
            onClick={onToggle}
            className="w-full rounded-lg border-2 border-white bg-transparent py-4 text-lg font-medium text-white transition-colors hover:bg-white hover:text-primary"
          >
            S'inscrire
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-200" role="alert">
            {error}
          </p>
        )}

        {/* Social Login */}
        <div className="mt-8">
          <SocialLoginButtons />
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
