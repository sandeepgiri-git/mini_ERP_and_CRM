import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
  totalCustomers: number;
  activeCustomers: number;
  leadsCount: number;
  totalProducts: number;
  lowStockCount: number;
  totalChallans: number;
  draftChallans: number;
  confirmedChallans: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [custRes, prodRes, challanRes] = await Promise.all([
          api.get('/customers?limit=1'),
          api.get('/products?limit=1'),
          api.get('/challans?limit=1'),
        ]);

        const [custActive] = await Promise.all([
          api.get('/customers?limit=1&status=ACTIVE'),
        ]);
        const [custLead] = await Promise.all([
          api.get('/customers?limit=1&status=LEAD'),
        ]);
        const [challanDraft] = await Promise.all([
          api.get('/challans?limit=1&status=DRAFT'),
        ]);
        const [challanConfirmed] = await Promise.all([
          api.get('/challans?limit=1&status=CONFIRMED'),
        ]);

        // Low stock: fetch all products and count those below alert
        const prodAll = await api.get('/products?limit=100');
        const lowStock = prodAll.data.products.filter(
          (p: { currentStock: number; minStockAlert: number }) =>
            p.currentStock <= p.minStockAlert
        );

        setStats({
          totalCustomers: custRes.data.total,
          activeCustomers: custActive[0].data.total,
          leadsCount: custLead[0].data.total,
          totalProducts: prodRes.data.total,
          lowStockCount: lowStock.length,
          totalChallans: challanRes.data.total,
          draftChallans: challanDraft[0].data.total,
          confirmedChallans: challanConfirmed[0].data.total,
        });
      } catch {
        // silently fail stats
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name}. Here's an overview.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-overlay"><span className="loading-spinner"/> Loading…</div>
      ) : (
        <>
          {/* Customer stats */}
          <div style={{ marginBottom: '8px' }}>
            <p className="text-xs text-secondary fw-500" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Customers</p>
          </div>
          <div className="stat-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-card__label">Total</div>
              <div className="stat-card__value">{stats?.totalCustomers ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Active</div>
              <div className="stat-card__value">{stats?.activeCustomers ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Leads</div>
              <div className="stat-card__value">{stats?.leadsCount ?? '—'}</div>
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <p className="text-xs text-secondary fw-500" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Inventory</p>
          </div>
          <div className="stat-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-card__label">Total Products</div>
              <div className="stat-card__value">{stats?.totalProducts ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Low Stock</div>
              <div className="stat-card__value" style={{ color: (stats?.lowStockCount ?? 0) > 0 ? 'var(--color-danger)' : undefined }}>
                {stats?.lowStockCount ?? '—'}
              </div>
              {(stats?.lowStockCount ?? 0) > 0 && (
                <div className="stat-card__sub" style={{ color: 'var(--color-danger)' }}>Needs attention</div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <p className="text-xs text-secondary fw-500" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Sales Challans</p>
          </div>
          <div className="stat-grid" style={{ marginBottom: '32px' }}>
            <div className="stat-card">
              <div className="stat-card__label">Total</div>
              <div className="stat-card__value">{stats?.totalChallans ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Draft</div>
              <div className="stat-card__value">{stats?.draftChallans ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Confirmed</div>
              <div className="stat-card__value">{stats?.confirmedChallans ?? '—'}</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">Quick Actions</div>
            </div>
            <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn--primary" onClick={() => navigate('/customers/new')}>
                + Add Customer
              </button>
              <button className="btn btn--secondary" onClick={() => navigate('/challans/new')}>
                + New Challan
              </button>
              <button className="btn btn--secondary" onClick={() => navigate('/products')}>
                View Inventory
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
