import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useToast } from '../../contexts/ToastContext';

interface FormData {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minStockAlert: string;
  location: string;
}

const INITIAL: FormData = {
  name: '', sku: '', category: '', unitPrice: '',
  currentStock: '0', minStockAlert: '5', location: '',
};

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const isEdit = !!id;

  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    setIsFetching(true);
    api.get(`/products/${id}`)
      .then(res => {
        const p = res.data;
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category,
          unitPrice: String(parseFloat(p.unitPrice)),
          currentStock: String(p.currentStock),
          minStockAlert: String(p.minStockAlert),
          location: p.location || '',
        });
      })
      .catch(() => showToast('Failed to load product.', 'error'))
      .finally(() => setIsFetching(false));
  }, [id]);

  const set = (field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.sku.trim()) e.sku = 'Required';
    if (!form.category.trim()) e.category = 'Required';
    if (!form.unitPrice || isNaN(Number(form.unitPrice)) || Number(form.unitPrice) <= 0)
      e.unitPrice = 'Must be a positive number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const payload = {
        ...form,
        unitPrice: parseFloat(form.unitPrice),
        currentStock: parseInt(form.currentStock, 10),
        minStockAlert: parseInt(form.minStockAlert, 10),
      };
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        showToast('Product updated.', 'success');
        navigate(`/products/${id}`);
      } else {
        const res = await api.post('/products', payload);
        showToast('Product created.', 'success');
        navigate(`/products/${res.data.id}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Save failed.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="loading-overlay"><span className="loading-spinner"/> Loading…</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">{isEdit ? 'Edit Product' : 'New Product'}</h1>
        </div>
        <button className="btn btn--ghost" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-section__title">Product Details</div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="pname" className="label-required">Product Name</label>
              <input id="pname" type="text" className={`form-input${errors.name ? ' error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="sku" className="label-required">SKU</label>
              <input id="sku" type="text" className={`form-input font-mono${errors.sku ? ' error' : ''}`} value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="BOLT-M8-50" />
              {errors.sku && <span className="form-error">{errors.sku}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="category" className="label-required">Category</label>
              <input id="category" type="text" className={`form-input${errors.category ? ' error' : ''}`} value={form.category} onChange={e => set('category', e.target.value)} placeholder="Fasteners, Pipes, Valves…" />
              {errors.category && <span className="form-error">{errors.category}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="location">Storage Location</label>
              <input id="location" type="text" className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Rack A-1" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title">Pricing & Stock</div>
          <div className="form-grid form-grid--3">
            <div className="form-group">
              <label htmlFor="unitPrice" className="label-required">Unit Price (₹)</label>
              <input id="unitPrice" type="number" step="0.01" min="0" className={`form-input${errors.unitPrice ? ' error' : ''}`} value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} />
              {errors.unitPrice && <span className="form-error">{errors.unitPrice}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="currentStock">Current Stock</label>
              <input id="currentStock" type="number" min="0" step="1" className="form-input" value={form.currentStock} onChange={e => set('currentStock', e.target.value)} disabled={isEdit} />
              {isEdit && <span className="form-hint">Use stock adjustment to change stock.</span>}
            </div>
            <div className="form-group">
              <label htmlFor="minStockAlert">Min Stock Alert</label>
              <input id="minStockAlert" type="number" min="0" step="1" className="form-input" value={form.minStockAlert} onChange={e => set('minStockAlert', e.target.value)} />
              <span className="form-hint">Alert when stock falls below this.</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={isLoading}>
            {isLoading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
