import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: number;
  minStockAlert: number;
  location?: string;
}

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

function LowStockBadge({ stock, alert }: { stock: number; alert: number }) {
  if (stock <= alert) return <span className="badge badge--low-stock">Low Stock</span>;
  return null;
}

export default function ProductList() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search ? { search } : {}),
        ...(lowStockOnly ? { lowStock: 'true' } : {}),
      });
      const res = await api.get(`/products?${params}`);
      setProducts(res.data.products);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      // handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [page, search, lowStockOnly]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{total} total products</p>
        </div>
        {can(['ADMIN', 'WAREHOUSE']) && (
          <button className="btn btn--primary" onClick={() => navigate('/products/new')}>
            + Add Product
          </button>
        )}
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <SearchIcon />
            <input
              id="product-search"
              type="text"
              className="search-input"
              placeholder="Search name, SKU, category…"
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setPage(1); }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={e => { setLowStockOnly(e.target.checked); setPage(1); }}
            />
            Low stock only
          </label>
        </div>

        {isLoading ? (
          <div className="loading-overlay"><span className="loading-spinner"/> Loading…</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">No products found</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th className="num">Unit Price (₹)</th>
                  <th className="num">Stock</th>
                  <th className="num">Min Alert</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const isLow = p.currentStock <= p.minStockAlert;
                  return (
                    <tr
                      key={p.id}
                      className={isLow ? 'low-stock' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/products/${p.id}`)}
                    >
                      <td className="table-cell--primary">{p.name}</td>
                      <td className="table-cell--mono">{p.sku}</td>
                      <td>{p.category}</td>
                      <td>{p.location || <span className="text-muted">—</span>}</td>
                      <td className="num font-tabular">
                        {parseFloat(p.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`num font-tabular fw-500${isLow ? ' text-danger' : ''}`}
                        style={{ color: isLow ? 'var(--color-danger)' : undefined }}>
                        {p.currentStock.toLocaleString('en-IN')}
                      </td>
                      <td className="num font-tabular text-muted">{p.minStockAlert}</td>
                      <td>
                        <LowStockBadge stock={p.currentStock} alert={p.minStockAlert} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span>{total} records</span>
          <div className="pagination__controls">
            <button className="pagination__btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              ‹ Prev
            </button>
            <span style={{ padding: '4px 8px', fontSize: '12px' }}>{page} / {pages}</span>
            <button className="pagination__btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
