import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Login failed. Check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__logo">
          <div className="login-card__logo-icon">E</div>
          <span className="login-card__logo-text">ERP Portal</span>
        </div>
        <h1 className="login-card__title">Sign in</h1>
        <p className="login-card__subtitle">
          Enter your credentials to access the portal.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn--primary w-full" disabled={isLoading}>
            {isLoading ? (
              <><span className="loading-spinner" style={{width:'12px',height:'12px',borderWidth:'2px'}}/> Signing in…</>
            ) : 'Sign in'}
          </button>
        </form>

        {/* Test credentials hint */}
        <div style={{ marginTop: '24px', padding: '12px', background: 'var(--color-bg)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>
          <p className="text-xs text-secondary fw-500" style={{ marginBottom: '6px' }}>Test credentials</p>
          <div style={{ display: 'grid', gap: '3px', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
            <div>admin@example.com / admin123</div>
            <div>sales@example.com / sales123</div>
            <div>warehouse@example.com / warehouse123</div>
            <div>accounts@example.com / accounts123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
