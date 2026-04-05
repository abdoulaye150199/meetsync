import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import FormInput from './FormInput';
import SocialLoginButtons from './SocialLoginButtons';

interface RegisterFormProps {
  onToggle: () => void;
}

interface RegisterApiResponse {
  success: boolean;
  message?: string;
  data?: {
    utilisateur?: {
      id: string;
      nom: string;
      email: string;
      role: string;
    };
  };
  error?: string;
}

interface LoginApiResponse {
  success: boolean;
  data?: {
    jeton?: string;
  };
  error?: string;
}

const RegisterForm = ({ onToggle }: RegisterFormProps) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (trimmedFirstName.length < 2 || trimmedLastName.length < 2) {
      setError('Le prénom et le nom doivent contenir au moins 2 caractères.');
      return;
    }
    const nom = `${trimmedFirstName} ${trimmedLastName}`.trim();

    setIsSubmitting(true);
    setError(null);

    try {
      const registerResponse = await apiService.post<RegisterApiResponse>('/auth/register', {
        nom,
        email: trimmedEmail,
        motDePasse: password,
      });

      if (registerResponse.error) {
        setError(registerResponse.error);
        return;
      }

      const loginResponse = await apiService.post<LoginApiResponse>('/auth/login', {
        email: trimmedEmail,
        motDePasse: password,
      });

      if (loginResponse.error) {
        setError("Compte créé, mais connexion automatique impossible. Connectez-vous manuellement.");
        return;
      }

      const token = loginResponse.data?.data?.jeton;
      if (!token) {
        setError("Compte créé, mais token manquant. Connectez-vous manuellement.");
        return;
      }

      login(token);
      navigate('/splash');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-2 py-4 lg:px-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <h1 className="mb-8 text-center font-logo text-4xl tracking-wider text-white lg:text-5xl">
          <span className="font-logo">MEET SYNC</span>
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormInput
            type="text"
            placeholder="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            name="firstName"
            required
          />
          <FormInput
            type="text"
            placeholder="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            name="lastName"
            required
          />
          <FormInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            name="email"
            required
          />
          <FormInput
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            name="password"
            required
          />
          <FormInput
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            name="confirmPassword"
            required
          />

          {/* Buttons */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-white/10 backdrop-blur-sm py-4 text-lg font-medium text-white transition-colors hover:bg-white/20"
          >
            {isSubmitting ? 'Inscription...' : "S'inscrire"}
          </button>

          <button
            type="button"
            onClick={onToggle}
            className="w-full rounded-lg border-2 border-white bg-transparent py-4 text-lg font-medium text-white transition-colors hover:bg-white hover:text-primary"
          >
            J'ai déjà un compte
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-200" role="alert">
            {error}
          </p>
        )}

        {/* Social Login */}
        <div className="mt-6">
          <SocialLoginButtons />
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
