import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface CustomerNote {
  id: string;
  note: string;
  createdAt: string;
  createdBy: { name: string; role: string };
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: string;
  address?: string;
  status: string;
  followUpDate?: string;
  createdAt: string;
  notes: CustomerNote[];
}

export default function CustomerDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [noteFollowUp, setNoteFollowUp] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const fetchCustomer = async () => {
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data);
    } catch {
      showToast('Failed to load customer.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCustomer(); }, [id]);

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setIsAddingNote(true);
    try {
      await api.post(`/customers/${id}/notes`, {
        note: noteText,
        followUpDate: noteFollowUp ? new Date(noteFollowUp).toISOString() : undefined,
      });
      showToast('Note added.', 'success');
      setNoteText('');
      setNoteFollowUp('');
      setShowNoteForm(false);
      await fetchCustomer();
    } catch {
      showToast('Failed to add note.', 'error');
    } finally {
      setIsAddingNote(false);
    }
  };

  if (isLoading) {
    return <div className="loading-overlay"><span className="loading-spinner"/> Loading…</div>;
  }
  if (!customer) {
    return <div className="empty-state"><div className="empty-state__title">Customer not found.</div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">{customer.name}</h1>
          <p className="page-subtitle">
            <span className={`badge badge--${customer.status.toLowerCase()}`}>{customer.status}</span>
            &nbsp;·&nbsp;
            <span className={`badge badge--${customer.customerType.toLowerCase()}`}>{customer.customerType}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {can(['ADMIN', 'SALES']) && (
            <button className="btn btn--secondary" onClick={() => navigate(`/customers/${id}/edit`)}>
              Edit
            </button>
          )}
          <button className="btn btn--ghost" onClick={() => navigate('/customers')}>← Back</button>
        </div>
      </div>

      <div className="detail-layout">
        {/* Left: Profile info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card__header">
              <div className="card__title">Contact & Business</div>
            </div>
            <div>
              {[
                ['Mobile', customer.mobile],
                ['Email', customer.email || '—'],
                ['Business Name', customer.businessName || '—'],
                ['GST Number', customer.gstNumber || '—'],
                ['Address', customer.address || '—'],
                ['Customer Since', new Date(customer.createdAt).toLocaleDateString('en-IN')],
                ['Follow-up Date', customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString('en-IN') : '—'],
              ].map(([label, value]) => (
                <div className="detail-field-row" key={label}>
                  <span className="detail-field-label">{label}</span>
                  <span className="detail-field-value">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* View challans */}
          <div className="card">
            <div className="card__header"><div className="card__title">Challans</div></div>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => navigate(`/challans?customerId=${id}`)}
            >
              View all challans →
            </button>
          </div>
        </div>

        {/* Right: Notes timeline */}
        <div className="card">
          <div className="card__header">
            <div className="card__title">Notes & Follow-ups</div>
            {can(['ADMIN', 'SALES']) && (
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => setShowNoteForm(v => !v)}
              >
                {showNoteForm ? 'Cancel' : '+ Add Note'}
              </button>
            )}
          </div>

          {showNoteForm && (
            <form onSubmit={handleAddNote} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="form-group">
                <label htmlFor="noteText">Note</label>
                <textarea
                  id="noteText"
                  className="form-textarea"
                  rows={3}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add follow-up note, call summary, etc."
                />
              </div>
              <div className="form-group">
                <label htmlFor="noteFollowUp">Schedule Follow-up (optional)</label>
                <input
                  id="noteFollowUp"
                  type="date"
                  className="form-input"
                  value={noteFollowUp}
                  onChange={e => setNoteFollowUp(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn--primary btn--sm" disabled={isAddingNote}>
                {isAddingNote ? 'Adding…' : 'Save Note'}
              </button>
            </form>
          )}

          <div className="notes-list">
            {customer.notes.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <div className="empty-state__title">No notes yet</div>
                <div className="empty-state__desc">Add a note to track follow-ups.</div>
              </div>
            ) : (
              customer.notes.map(note => (
                <div key={note.id} className="note-item">
                  <div className="note-meta">
                    <span className="note-author">{note.createdBy.name}</span>
                    <span className={`badge badge--${note.createdBy.role.toLowerCase()}`}>{note.createdBy.role}</span>
                    <span>{new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="note-text">{note.note}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
