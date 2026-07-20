import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useToast } from '../../contexts/ToastContext';

interface FormData {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: string;
  address: string;
  status: string;
  followUpDate: string;
}

const INITIAL: FormData = {
  name: '', mobile: '', email: '', businessName: '', gstNumber: '',
  customerType: 'RETAIL', address: '', status: 'LEAD', followUpDate: '',
};

export default function CustomerForm() {
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
    api.get(`/customers/${id}`)
      .then(res => {
        const c = res.data;
        setForm({
          name: c.name,
          mobile: c.mobile,
          email: c.email || '',
          businessName: c.businessName || '',
          gstNumber: c.gstNumber || '',
          customerType: c.customerType,
          address: c.address || '',
          status: c.status,
          followUpDate: c.followUpDate ? c.followUpDate.split('T')[0] : '',
        });
      })
      .catch(() => showToast('Failed to load customer.', 'error'))
      .finally(() => setIsFetching(false));
  }, [id]);

  const set = (field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.mobile.trim()) e.mobile = 'Required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.customerType) e.customerType = 'Required';
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
        followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
      };
      if (isEdit) {
        await api.put(`/customers/${id}`, payload);
        showToast('Customer updated.', 'success');
        navigate(`/customers/${id}`);
      } else {
        const res = await api.post('/customers', payload);
        showToast('Customer created.', 'success');
        navigate(`/customers/${res.data.id}`);
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
          <h1 className="page-title">{isEdit ? 'Edit Customer' : 'New Customer'}</h1>
        </div>
        <button className="btn btn--ghost" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {/* Contact info */}
        <div className="form-section">
          <div className="form-section__title">Contact Information</div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name" className="label-required">Full Name</label>
              <input id="name" type="text" className={`form-input${errors.name ? ' error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="mobile" className="label-required">Mobile</label>
              <input id="mobile" type="tel" className={`form-input${errors.mobile ? ' error' : ''}`} value={form.mobile} onChange={e => set('mobile', e.target.value)} />
              {errors.mobile && <span className="form-error">{errors.mobile}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" className={`form-input${errors.email ? ' error' : ''}`} value={form.email} onChange={e => set('email', e.target.value)} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group form-group--full">
              <label htmlFor="address">Address</label>
              <textarea id="address" className="form-textarea" value={form.address} onChange={e => set('address', e.target.value)} rows={2} />
            </div>
          </div>
        </div>

        {/* Business info */}
        <div className="form-section">
          <div className="form-section__title">Business Information</div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="businessName">Business Name</label>
              <input id="businessName" type="text" className="form-input" value={form.businessName} onChange={e => set('businessName', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="gstNumber">GST Number</label>
              <input id="gstNumber" type="text" className="form-input font-mono" placeholder="29ABCDE1234F1Z5" value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="customerType" className="label-required">Customer Type</label>
              <select id="customerType" className={`form-select${errors.customerType ? ' error' : ''}`} value={form.customerType} onChange={e => set('customerType', e.target.value)}>
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            </div>
          </div>
        </div>

        {/* CRM status */}
        <div className="form-section">
          <div className="form-section__title">CRM Status</div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="status" className="label-required">Status</label>
              <select id="status" className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="followUpDate">Follow-up Date</label>
              <input id="followUpDate" type="date" className="form-input" value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)} />
              <span className="form-hint">Schedule a follow-up reminder.</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={isLoading}>
            {isLoading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Customer'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
