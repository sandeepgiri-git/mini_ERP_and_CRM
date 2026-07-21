import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

interface Challan {
  id: string;
  challanNumber: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  totalQuantity: number;
  createdAt: string;
  customer: { name: string; businessName?: string };
  createdBy: { name: string };
  _count: { items: number };
}

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export default function ChallanList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can } = useAuth();

  const [challans, setChallans] = useState<Challan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const customerId = searchParams.get('customerId') || '';

  const fetchChallans = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(status ? { status } : {}),
        ...(customerId ? { customerId } : {}),
        ...(search ? { search } : {}),
      });
      const res = await api.get(`/challans?${params}`);
      setChallans(res.data.challans);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      //
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchChallans(); }, [page, status, search, customerId]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">Sales Challans</h1>
          <p className="page-subtitle">{total} total challans{customerId ? ' (filtered by customer)' : ''}</p>
        </div>
        {can(['ADMIN', 'SALES']) && (
          <button className="btn btn--primary" onClick={() => navigate('/challans/new')}>
            + New Challan
          </button>
        )}
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <SearchIcon />
            <input
              id="challan-search"
              type="text"
              className="search-input"
              placeholder="Search challan# or customer…"
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setPage(1); }}
            />
          </div>
          <select
            id="challan-status-filter"
            className="filter-select"
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {isLoading ? (
          <div className="loading-overlay"><span className="loading-spinner"/> Loading…</div>
        ) : challans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">No challans found</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className="num">Items</th>
                  <th className="num">Total Qty</th>
                  <th>Created By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {challans.map(c => (
                  <tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/challans/${c.id}`)}
                  >
                    <td className="table-cell--mono fw-500">{c.challanNumber}</td>
                    <td className="table-cell--primary">
                      {c.customer.name}
                      {c.customer.businessName && (
                        <div className="text-xs text-muted">{c.customer.businessName}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge--${c.status.toLowerCase()}`}>{c.status}</span>
                    </td>
                    <td className="num font-tabular">{c._count.items}</td>
                    <td className="num font-tabular">{c.totalQuantity.toLocaleString('en-IN')}</td>
                    <td className="text-secondary text-sm">{c.createdBy.name}</td>
                    <td className="text-muted text-xs">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span>{total} records</span>
          <div className="pagination__controls">
            <button className="pagination__btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <span style={{ padding: '4px 8px', fontSize: '12px' }}>{page} / {pages}</span>
            <button className="pagination__btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
