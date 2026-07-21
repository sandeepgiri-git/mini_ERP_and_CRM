import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface ChallanItem {
  id: string;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  unitPriceSnapshot: string;
  quantity: number;
  product: { id: string; currentStock: number };
}

interface Challan {
  id: string;
  challanNumber: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string; name: string; mobile: string;
    businessName?: string; gstNumber?: string; address?: string;
  };
  createdBy: { name: string; role: string };
  items: ChallanItem[];
}

export default function ChallanDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { showToast } = useToast();

  const [challan, setChallan] = useState<Challan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  const fetchChallan = async () => {
    try {
      const res = await api.get(`/challans/${id}`);
      setChallan(res.data);
    } catch {
      showToast('Failed to load challan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchChallan(); }, [id]);

  const handleConfirm = async () => {
    if (!window.confirm('Confirm this challan? Stock will be deducted immediately.')) return;
    setIsActioning(true);
    try {
      await api.post(`/challans/${id}/confirm`);
      showToast('Challan confirmed. Stock deducted.', 'success');
      await fetchChallan();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Confirm failed.';
      showToast(msg, 'error');
    } finally {
      setIsActioning(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this draft challan?')) return;
    setIsActioning(true);
    try {
      await api.post(`/challans/${id}/cancel`);
      showToast('Challan cancelled.', 'info');
      await fetchChallan();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Cancel failed.';
      showToast(msg, 'error');
    } finally {
      setIsActioning(false);
    }
  };

  if (isLoading) {
    return <div className="loading-overlay"><span className="loading-spinner"/> Loading…</div>;
  }
  if (!challan) {
    return <div className="empty-state"><div className="empty-state__title">Challan not found.</div></div>;
  }

  const totalValue = challan.items.reduce(
    (s, i) => s + i.quantity * parseFloat(i.unitPriceSnapshot), 0
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">{challan.challanNumber}</h1>
          <p className="page-subtitle">
            <span className={`badge badge--${challan.status.toLowerCase()}`}>{challan.status}</span>
            &nbsp;·&nbsp;Created by {challan.createdBy.name}&nbsp;·&nbsp;
            {new Date(challan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          {can(['ADMIN', 'SALES']) && challan.status === 'DRAFT' && (
            <>
              <button className="btn btn--success" disabled={isActioning} onClick={handleConfirm}>
                ✓ Confirm
              </button>
              <button className="btn btn--secondary" disabled={isActioning} onClick={() => navigate(`/challans/${challan.id}/edit`)}>
                Edit Challan
              </button>
              <button className="btn btn--danger" disabled={isActioning} onClick={handleCancel}>
                Cancel Challan
              </button>
            </>
          )}
          <button className="btn btn--ghost" onClick={() => navigate('/challans')}>← Back</button>
        </div>
      </div>

      <div className="detail-layout">
        {/* Left: Items table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="table-wrapper">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div className="card__title">Line Items</div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th className="num">Unit Price (₹)</th>
                    <th className="num">Qty</th>
                    <th className="num">Line Total (₹)</th>
                    {challan.status === 'CONFIRMED' && <th className="num">Cur. Stock</th>}
                  </tr>
                </thead>
                <tbody>
                  {challan.items.map(item => (
                    <tr key={item.id}>
                      <td className="table-cell--primary">{item.productNameSnapshot}</td>
                      <td className="table-cell--mono">{item.productSkuSnapshot}</td>
                      <td className="num font-tabular">
                        {parseFloat(item.unitPriceSnapshot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="num font-tabular fw-500">{item.quantity.toLocaleString('en-IN')}</td>
                      <td className="num font-tabular">
                        {(item.quantity * parseFloat(item.unitPriceSnapshot)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      {challan.status === 'CONFIRMED' && (
                        <td className="num font-tabular text-muted">{item.product?.currentStock ?? '—'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                    <td colSpan={challan.status === 'CONFIRMED' ? 3 : 3} className="fw-500 text-secondary" style={{ padding: '8px 12px', fontSize: '12px' }}>TOTAL</td>
                    <td className="num font-tabular fw-600" style={{ padding: '8px 12px' }}>
                      {challan.totalQuantity.toLocaleString('en-IN')}
                    </td>
                    <td className="num font-tabular fw-600" style={{ padding: '8px 12px' }}>
                      {totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    {challan.status === 'CONFIRMED' && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {challan.status === 'DRAFT' && can(['ADMIN', 'SALES']) && (
            <div style={{ padding: '12px 16px', background: 'var(--color-warning-bg)', border: '1px solid #F0DCA0', borderRadius: '4px', fontSize: '13px', color: 'var(--color-warning)' }}>
              This challan is in DRAFT. Stock has not been deducted yet. Confirm to finalize.
            </div>
          )}
        </div>

        {/* Right: Customer + meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card__header"><div className="card__title">Customer</div></div>
            {[
              ['Name', challan.customer.name],
              ['Business', challan.customer.businessName || '—'],
              ['Mobile', challan.customer.mobile],
              ['GST', challan.customer.gstNumber || '—'],
              ['Address', challan.customer.address || '—'],
            ].map(([label, value]) => (
              <div className="detail-field-row" key={label}>
                <span className="detail-field-label">{label}</span>
                <span className="detail-field-value">{value}</span>
              </div>
            ))}
            <div style={{ marginTop: '12px' }}>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => navigate(`/customers/${challan.customer.id}`)}
              >
                View customer →
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card__header"><div className="card__title">Challan Details</div></div>
            {[
              ['Number', challan.challanNumber],
              ['Status', challan.status],
              ['Created By', challan.createdBy.name],
              ['Created', new Date(challan.createdAt).toLocaleDateString('en-IN')],
              ['Updated', new Date(challan.updatedAt).toLocaleDateString('en-IN')],
            ].map(([label, value]) => (
              <div className="detail-field-row" key={label}>
                <span className="detail-field-label">{label}</span>
                <span className="detail-field-value">
                  {label === 'Status'
                    ? <span className={`badge badge--${(value as string).toLowerCase()}`}>{value}</span>
                    : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
