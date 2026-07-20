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

export default function TopBar() {
  const location = useLocation();
  const title = getTitle(location.pathname);

  return (
    <header className="topbar">
      <h1 className="topbar__title">{title}</h1>
    </header>
  );
}
