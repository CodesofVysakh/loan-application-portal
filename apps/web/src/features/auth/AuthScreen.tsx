import { useState } from 'react';
import {
  login,
  registerCustomer,
  User,
} from '../../lib/api';

interface AuthScreenProps {
  onAuthenticated: (user: User) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.SubmitEvent<HTMLFormElement>,
    ) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await registerCustomer({ fullName, email, password });
      }

      const result = await login(email, password);
      onAuthenticated(result.user);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <div className="brand-mark">R</div>
        <p className="eyebrow">PERSONAL FINANCE</p>
        <h1>Your next chapter starts here.</h1>
        <p className="intro-copy">
          Apply for a personal loan, track your application, and
          follow every update in one secure place.
        </p>
        <div className="intro-note">
          <span className="intro-dot" />
          Secure application tracking
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">
            {isRegistering ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}
          </p>

          <h2>
            {isRegistering ? 'Get started' : 'Sign in to your portal'}
          </h2>

          <p className="muted">
            {isRegistering
              ? 'Create a customer account to apply for a loan.'
              : 'Enter your details to continue.'}
          </p>

          <form onSubmit={handleSubmit} className="form-stack">
            {isRegistering && (
              <label className="field">
                <span>Full name</span>
                <input
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                  placeholder="Your full name"
                />
              </label>
            )}

            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="you@example.com"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={
                  isRegistering ? 'new-password' : 'current-password'
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={72}
                required
                placeholder="At least 8 characters"
              />
            </label>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <button className="primary-button" disabled={loading}>
              {loading
                ? 'Please wait…'
                : isRegistering
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            {isRegistering
              ? 'Already have an account?'
              : "Don't have an account?"}{' '}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
            >
              {isRegistering ? 'Sign in' : 'Register'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}