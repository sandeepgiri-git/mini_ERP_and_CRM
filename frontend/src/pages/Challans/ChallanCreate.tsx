import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useToast } from '../../contexts/ToastContext';

interface Customer { id: string; name: string; businessName?: string; mobile: string; }
interface Product { id: string; name: string; sku: string; unitPrice: string; currentStock: number; }
interface LineItem { productId: string; name: string; sku: string; unitPrice: number; currentStock: number; quantity: number; }

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function ChallanCreate() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { showToast } = useToast();

  // Customer picker
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [custOpen, setCustOpen] = useState(false);
  const custRef = useRef<HTMLDivElement>(null);

  // Product picker
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState<Product[]>([]);
  const [prodOpen, setProdOpen] = useState(false);
  const prodRef = useRef<HTMLDivElement>(null);

  // Line items
  const [items, setItems] = useState<LineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    const fetchChallan = async () => {
      try {
        const res = await api.get(`/challans/${id}`);
        const data = res.data;
        if (data.status !== 'DRAFT') {
          showToast('Only DRAFT challans can be edited.', 'error');
          navigate(`/challans/${id}`);
          return;
        }
        setSelectedCustomer(data.customer);
        setItems(data.items.map((i: {
          productId: string;
          productNameSnapshot: string;
          productSkuSnapshot: string;
          unitPriceSnapshot: string;
          product?: { currentStock?: number };
          quantity: number;
        }) => ({
          productId: i.productId,
          name: i.productNameSnapshot,
          sku: i.productSkuSnapshot,
          unitPrice: parseFloat(i.unitPriceSnapshot),
          currentStock: i.product?.currentStock ?? 0,
          quantity: i.quantity,
        })));
      } catch {
        showToast('Failed to load challan.', 'error');
        navigate('/challans');
      } finally {
        setIsFetching(false);
      }
    };
    fetchChallan();
  }, [id, navigate, showToast]);

  // Customer search
  useEffect(() => {
    if (!custSearch.trim()) { setCustResults([]); return; }
    const t = setTimeout(async () => {
      const res = await api.get(`/customers?search=${encodeURIComponent(custSearch)}&limit=8`);
      setCustResults(res.data.customers);
    }, 250);
    return () => clearTimeout(t);
  }, [custSearch]);

  // Product search
  useEffect(() => {
    if (!prodSearch.trim()) { setProdResults([]); return; }
    const t = setTimeout(async () => {
      const res = await api.get(`/products?search=${encodeURIComponent(prodSearch)}&limit=8`);
      setProdResults(res.data.products);
    }, 250);
    return () => clearTimeout(t);
  }, [prodSearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (custRef.current && !custRef.current.contains(e.target as Node)) setCustOpen(false);
      if (prodRef.current && !prodRef.current.contains(e.target as Node)) setProdOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustSearch('');
    setCustOpen(false);
  };

  const addProduct = (p: Product) => {
    setItems(prev => {
      const exists = prev.find(i => i.productId === p.id);
      if (exists) {
        return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unitPrice: parseFloat(p.unitPrice),
        currentStock: p.currentStock,
        quantity: 1,
      }];
    });
    setProdSearch('');
    setProdOpen(false);
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i));
  };

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const handleSubmit = async (e: FormEvent, saveAs: 'DRAFT' | 'CONFIRMED') => {
    e.preventDefault();
    if (!selectedCustomer) { showToast('Please select a customer.', 'error'); return; }
    if (items.length === 0) { showToast('Add at least one product.', 'error'); return; }

    setIsLoading(true);
    try {
      if (isEdit && id) {
        await api.put(`/challans/${id}`, {
          customerId: selectedCustomer.id,
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        });
        if (saveAs === 'CONFIRMED') {
          await api.post(`/challans/${id}/confirm`);
          showToast('Challan updated and confirmed.', 'success');
        } else {
          showToast('Draft challan updated.', 'success');
        }
        navigate(`/challans/${id}`);
      } else {
        const res = await api.post('/challans', {
          customerId: selectedCustomer.id,
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
          status: saveAs,
        });
        showToast(`Challan ${saveAs === 'DRAFT' ? 'saved as draft' : 'confirmed'}.`, 'success');
        navigate(`/challans/${res.data.id}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? `Failed to ${isEdit ? 'update' : 'create'} challan.`;
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="loading-overlay"><span className="loading-spinner"/> Loading challan…</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">{isEdit ? 'Edit Draft Challan' : 'New Challan'}</h1>
        </div>
        <button className="btn btn--ghost" onClick={() => navigate(isEdit && id ? `/challans/${id}` : '/challans')}>← Back</button>
      </div>

      <div className="challan-create-layout">
        {/* Main form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Customer picker */}
          <div className="card">
            <div className="card__header"><div className="card__title">Customer</div></div>
            {selectedCustomer ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="fw-500">{selectedCustomer.name}</div>
                  {selectedCustomer.businessName && <div className="text-sm text-muted">{selectedCustomer.businessName}</div>}
                  <div className="text-xs text-muted">{selectedCustomer.mobile}</div>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => setSelectedCustomer(null)}>Change</button>
              </div>
            ) : (
              <div className="autocomplete-wrapper" ref={custRef}>
                <input
                  id="cust-search"
                  type="text"
                  className="form-input"
                  placeholder="Search customer by name, mobile…"
                  value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setCustOpen(true); }}
                  onFocus={() => setCustOpen(true)}
                />
                {custOpen && custResults.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {custResults.map(c => (
                      <div key={c.id} className="autocomplete-option" onClick={() => selectCustomer(c)}>
                        <div className="autocomplete-option__primary">{c.name}</div>
                        <div className="autocomplete-option__secondary">{c.businessName || c.mobile}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product line items */}
          <div className="card">
            <div className="card__header"><div className="card__title">Line Items</div></div>

            {/* Product search */}
            <div className="autocomplete-wrapper" ref={prodRef} style={{ marginBottom: '16px' }}>
              <input
                id="prod-search"
                type="text"
                className="form-input"
                placeholder="Search and add product…"
                value={prodSearch}
                onChange={e => { setProdSearch(e.target.value); setProdOpen(true); }}
                onFocus={() => setProdOpen(true)}
              />
              {prodOpen && prodResults.length > 0 && (
                <div className="autocomplete-dropdown">
                  {prodResults.map(p => (
                    <div key={p.id} className="autocomplete-option" onClick={() => addProduct(p)}>
                      <div className="autocomplete-option__primary">{p.name}</div>
                      <div className="autocomplete-option__secondary">
                        {p.sku} · ₹{parseFloat(p.unitPrice).toFixed(2)} · Stock: {p.currentStock}
                        {p.currentStock === 0 && <span style={{ color: 'var(--color-danger)', marginLeft: '4px' }}>OUT OF STOCK</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-state__title">No items added</div>
                <div className="empty-state__desc">Search above to add products.</div>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="line-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th className="num">Unit Price</th>
                      <th className="num">Available</th>
                      <th className="num">Qty</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const overQty = item.quantity > item.currentStock;
                      return (
                        <tr key={item.productId}>
                          <td className="fw-500">{item.name}</td>
                          <td className="table-cell--mono">{item.sku}</td>
                          <td className="num font-tabular">₹{item.unitPrice.toFixed(2)}</td>
                          <td className={`num font-tabular${item.currentStock === 0 ? ' text-danger' : ''}`}
                            style={{ color: item.currentStock === 0 ? 'var(--color-danger)' : undefined }}>
                            {item.currentStock}
                          </td>
                          <td className="num" style={{ width: '80px' }}>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => updateQty(item.productId, parseInt(e.target.value, 10) || 1)}
                              className={`form-input${overQty ? ' error' : ''}`}
                              style={{ width: '70px', textAlign: 'right' }}
                            />
                            {overQty && <div className="form-error" style={{ fontSize: '10px' }}>Over stock</div>}
                          </td>
                          <td>
                            <button className="remove-btn" onClick={() => removeItem(item.productId)}>
                              <CloseIcon />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Summary panel */}
        <div className="card">
          <div className="card__header"><div className="card__title">Summary</div></div>
          <div>
            <div className="detail-field-row">
              <span className="detail-field-label">Customer</span>
              <span className="detail-field-value">{selectedCustomer?.name || '—'}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Line Items</span>
              <span className="detail-field-value font-tabular">{items.length}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Total Qty</span>
              <span className="detail-field-value font-tabular fw-500" style={{ fontSize: '18px' }}>{totalQty}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn btn--success w-full"
              disabled={isLoading || items.length === 0 || !selectedCustomer}
              onClick={e => handleSubmit(e as FormEvent, 'CONFIRMED')}
            >
              {isEdit ? 'Update & Confirm' : 'Confirm Challan'}
            </button>
            <button
              className="btn btn--secondary w-full"
              disabled={isLoading || items.length === 0 || !selectedCustomer}
              onClick={e => handleSubmit(e as FormEvent, 'DRAFT')}
            >
              {isEdit ? 'Update Draft' : 'Save as Draft'}
            </button>
            <button className="btn btn--ghost w-full" onClick={() => navigate(isEdit && id ? `/challans/${id}` : '/challans')}>
              Cancel
            </button>
          </div>

          <div style={{ marginTop: '12px', padding: '10px', background: 'var(--color-warning-bg)', border: '1px solid #F0DCA0', borderRadius: '3px' }}>
            <p className="text-xs" style={{ color: 'var(--color-warning)' }}>
              <strong>Confirm</strong> will immediately deduct stock. Stock is not reserved for drafts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
