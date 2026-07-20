import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface StockMovement {
  id: string;
  movementType: 'IN' | 'OUT';
  quantityChanged: number;
  reason: string;
  createdAt: string;
  createdBy: { name: string };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: number;
  minStockAlert: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
  stockMovements: StockMovement[];
}

export default function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('IN');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${id}`);
      setProduct(res.data);
    } catch {
      showToast('Failed to load product.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProduct(); }, [id]);

  const handleAdjust = async (e: FormEvent) => {
    e.preventDefault();
    if (!adjQty || !adjReason.trim()) return;
    setIsAdjusting(true);
    try {
      await api.post(`/products/${id}/stock-movements`, {
        movementType: adjType,
        quantityChanged: parseInt(adjQty, 10),
        reason: adjReason,
      });
      showToast(`Stock ${adjType === 'IN' ? 'added' : 'removed'} successfully.`, 'success');
      setAdjQty('');
      setAdjReason('');
      setShowAdjust(false);
      await fetchProduct();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Adjustment failed.';
      showToast(msg, 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  if (isLoading) {
    return <div className="loading-overlay"><span className="loading-spinner"/> Loading…</div>;
  }
  if (!product) {
    return <div className="empty-state"><div className="empty-state__title">Product not found.</div></div>;
  }

  const isLow = product.currentStock <= product.minStockAlert;

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">{product.name}</h1>
          <p className="page-subtitle">
            <span className="table-cell--mono">{product.sku}</span>
            &nbsp;·&nbsp;{product.category}
            {isLow && <>&nbsp;·&nbsp;<span className="badge badge--low-stock">Low Stock</span></>}
          </p>
        </div>
        <div className="flex gap-2">
          {can(['ADMIN', 'WAREHOUSE']) && (
            <>
              <button className="btn btn--secondary" onClick={() => setShowAdjust(v => !v)}>
                Adjust Stock
              </button>
              <button className="btn btn--ghost" onClick={() => navigate(`/products/${id}/edit`)}>
                Edit
              </button>
            </>
          )}
          <button className="btn btn--ghost" onClick={() => navigate('/products')}>← Back</button>
        </div>
      </div>

      <div className="detail-layout">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card__header"><div className="card__title">Product Info</div></div>
            {[
              ['SKU', product.sku],
              ['Category', product.category],
              ['Unit Price', `₹ ${parseFloat(product.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
              ['Location', product.location || '—'],
              ['Last Updated', new Date(product.updatedAt).toLocaleDateString('en-IN')],
            ].map(([label, value]) => (
              <div className="detail-field-row" key={label}>
                <span className="detail-field-label">{label}</span>
                <span className="detail-field-value">{value}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card__header"><div className="card__title">Stock Level</div></div>
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: '36px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: isLow ? 'var(--color-danger)' : 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                {product.currentStock.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-muted">units in stock · alert at {product.minStockAlert}</div>
            </div>
          </div>

          {/* Stock adjust form */}
          {showAdjust && can(['ADMIN', 'WAREHOUSE']) && (
            <div className="card">
              <div className="card__header"><div className="card__title">Adjust Stock</div></div>
              <form onSubmit={handleAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label>Movement Type</label>
                  <div className="flex gap-3">
                    {(['IN', 'OUT'] as const).map(t => (
                      <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" name="adjType" value={t} checked={adjType === t} onChange={() => setAdjType(t)} />
                        {t === 'IN' ? 'Stock IN' : 'Stock OUT'}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="adjQty">Quantity</label>
                  <input id="adjQty" type="number" min="1" step="1" className="form-input" value={adjQty} onChange={e => setAdjQty(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="adjReason">Reason</label>
                  <input id="adjReason" type="text" className="form-input" value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="e.g. Purchase order #PO-001" required />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn--primary btn--sm" disabled={isAdjusting}>
                    {isAdjusting ? 'Saving…' : 'Apply'}
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowAdjust(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right: movement log */}
        <div className="card">
          <div className="card__header"><div className="card__title">Stock Movement Log</div></div>
          {product.stockMovements.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div className="empty-state__title">No movements yet</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 0', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--color-border)' }}>Date</th>
                  <th style={{ padding: '8px 0', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--color-border)' }}>Type</th>
                  <th style={{ padding: '8px 0', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--color-border)' }}>Qty</th>
                  <th style={{ padding: '8px 0', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--color-border)' }}>Reason</th>
                  <th style={{ padding: '8px 0', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--color-border)' }}>By</th>
                </tr>
              </thead>
              <tbody>
                {product.stockMovements.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {new Date(m.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '8px 0' }}>
                      <span className={`badge badge--${m.movementType === 'IN' ? 'active' : 'cancelled'}`}>
                        {m.movementType}
                      </span>
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: m.movementType === 'IN' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {m.movementType === 'IN' ? '+' : '−'}{m.quantityChanged}
                    </td>
                    <td style={{ padding: '8px 0', fontSize: '12px' }}>{m.reason}</td>
                    <td style={{ padding: '8px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>{m.createdBy.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
