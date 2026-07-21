import { useLocation } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/customers/new': 'New Customer',
  '/products': 'Products',
  '/products/new': 'New Product',
  '/challans': 'Sales Challans',
  '/challans/new': 'New Challan',
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes('/customers/') && pathname.includes('/edit')) return 'Edit Customer';
  if (pathname.includes('/products/') && pathname.includes('/edit')) return 'Edit Product';
  if (pathname.includes('/customers/')) return 'Customer Detail';
  if (pathname.includes('/products/')) return 'Product Detail';
  if (pathname.includes('/challans/')) return 'Challan Detail';
  return 'ERP Portal';
}

interface TopBarProps {
  onToggleSidebar?: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const location = useLocation();
  const title = getTitle(location.pathname);

  return (
    <header className="topbar">
      <button className="topbar__menu-btn" onClick={onToggleSidebar} title="Toggle Navigation">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <h1 className="topbar__title">{title}</h1>
    </header>
  );
}
