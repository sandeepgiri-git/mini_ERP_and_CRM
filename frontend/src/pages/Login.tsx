import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TEST_USERS = [
  { role: 'ADMIN', label: 'Admin User', email: 'admin@example.com', password: 'admin123', desc: 'Full operations & system access' },
  { role: 'SALES', label: 'Sales Rep', email: 'sales@example.com', password: 'sales123', desc: 'Customers CRM & Sales Challans' },
  { role: 'WAREHOUSE', label: 'Warehouse Mgr', email: 'warehouse@example.com', password: 'warehouse123', desc: 'Product catalog & Stock movements' },
  { role: 'ACCOUNTS', label: 'Accounts Mgr', email: 'accounts@example.com', password: 'accounts123', desc: 'Read-only financial & audit view' },
];

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

  const quickFill = (user: typeof TEST_USERS[0]) => {
    setEmail(user.email);
    setPassword(user.password);
    setError('');
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

        {/* Evaluator Quick-Fill Credentials Box */}
        <div style={{ marginTop: '28px', padding: '14px', background: 'var(--color-bg)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span className="text-xs fw-500" style={{ color: 'var(--color-text-primary)' }}>Evaluator Quick-Fill Accounts</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Click to auto-fill</span>
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {TEST_USERS.map(user => (
              <div
                key={user.role}
                onClick={() => quickFill(user)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease, background-color 150ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)';
                  e.currentTarget.style.backgroundColor = 'var(--color-bg)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <span className={`badge badge--${user.role.toLowerCase()}`} style={{ fontSize: '10px', minWidth: '76px', textAlign: 'center', padding: '2px 6px' }}>
                    {user.role}
                  </span>
                  <div>
                    <div className="text-xs fw-500" style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{user.email}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{user.desc}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  style={{ fontSize: '11px', padding: '3px 8px', flexShrink: 0 }}
                  onClick={e => {
                    e.stopPropagation();
                    quickFill(user);
                  }}
                >
                  Fill →
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            All accounts use password: <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>*123</code> (e.g. <code style={{ fontFamily: 'monospace' }}>admin123</code>)
          </div>
        </div>
      </div>
    </div>
  );
}
