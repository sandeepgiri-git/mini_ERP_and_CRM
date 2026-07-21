import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/Customers/CustomerList';
import CustomerForm from './pages/Customers/CustomerForm';
import CustomerDetail from './pages/Customers/CustomerDetail';
import ProductList from './pages/Products/ProductList';
import ProductForm from './pages/Products/ProductForm';
import ProductDetail from './pages/Products/ProductDetail';
import ChallanList from './pages/Challans/ChallanList';
import ChallanCreate from './pages/Challans/ChallanCreate';
import ChallanDetail from './pages/Challans/ChallanDetail';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />

              {/* Customers */}
              <Route path="customers" element={<CustomerList />} />
              <Route path="customers/new" element={
                <ProtectedRoute roles={['ADMIN', 'SALES']}>
                  <CustomerForm />
                </ProtectedRoute>
              } />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="customers/:id/edit" element={
                <ProtectedRoute roles={['ADMIN', 'SALES']}>
                  <CustomerForm />
                </ProtectedRoute>
              } />

              {/* Products */}
              <Route path="products" element={<ProductList />} />
              <Route path="products/new" element={
                <ProtectedRoute roles={['ADMIN', 'WAREHOUSE']}>
                  <ProductForm />
                </ProtectedRoute>
              } />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="products/:id/edit" element={
                <ProtectedRoute roles={['ADMIN', 'WAREHOUSE']}>
                  <ProductForm />
                </ProtectedRoute>
              } />

              {/* Challans */}
              <Route path="challans" element={<ChallanList />} />
              <Route path="challans/new" element={
                <ProtectedRoute roles={['ADMIN', 'SALES']}>
                  <ChallanCreate />
                </ProtectedRoute>
              } />
              <Route path="challans/:id" element={<ChallanDetail />} />
              <Route path="challans/:id/edit" element={
                <ProtectedRoute roles={['ADMIN', 'SALES']}>
                  <ChallanCreate />
                </ProtectedRoute>
              } />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
