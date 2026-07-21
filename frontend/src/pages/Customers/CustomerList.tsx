import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  customerType: string;
  status: string;
  followUpDate?: string;
  updatedAt: string;
}

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge--${status.toLowerCase()}`}>{status}</span>;
}
function TypeBadge({ type }: { type: string }) {
  return <span className={`badge badge--${type.toLowerCase()}`}>{type}</span>;
}

export default function CustomerList() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(customerType ? { customerType } : {}),
      });
      const res = await api.get(`/customers?${params}`);
      setCustomers(res.data.customers);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      // handled by interceptor
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, status, customerType]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    setPage(1);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{total} total customers</p>
        </div>
        {can(['ADMIN', 'SALES']) && (
          <button className="btn btn--primary" onClick={() => navigate('/customers/new')}>
            + Add Customer
          </button>
        )}
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <SearchIcon />
            <input
              id="customer-search"
              type="text"
              className="search-input"
              placeholder="Search name, mobile, business…"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>

          <select
            id="customer-status-filter"
            className="filter-select"
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            id="customer-type-filter"
            className="filter-select"
            value={customerType}
            onChange={e => { setCustomerType(e.target.value); setPage(1); }}
          >
            <option value="">All types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </div>

        {isLoading ? (
          <div className="loading-overlay"><span className="loading-spinner"/> Loading…</div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">No customers found</div>
            <div className="empty-state__desc">Try adjusting your search or filters.</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Business</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Follow-up</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <td className="table-cell--primary">{c.name}</td>
                    <td className="table-cell--mono">{c.mobile}</td>
                    <td>{c.businessName || <span className="text-muted">—</span>}</td>
                    <td><TypeBadge type={c.customerType} /></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      {c.followUpDate
                        ? new Date(c.followUpDate).toLocaleDateString('en-IN')
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-muted text-xs">
                      {new Date(c.updatedAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span>{total} records</span>
          <div className="pagination__controls">
            <button
              className="pagination__btn"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              ‹ Prev
            </button>
            <span style={{ padding: '4px 8px', fontSize: '12px' }}>
              {page} / {pages}
            </span>
            <button
              className="pagination__btn"
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
