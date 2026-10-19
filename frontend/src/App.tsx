import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ItemsPage from './pages/ItemsPage'
import PartiesPage from './pages/PartiesPage'
import PartyDetailPage from './pages/PartyDetailPage'
import ItemDetailPage from './pages/ItemDetailPage'
import PurchasesPage from './pages/PurchasesPage'
import PurchaseDetailPage from './pages/PurchaseDetailPage'
import PurchaseFormPage from './pages/PurchaseFormPage'
import PosPage from './pages/PosPage'
import SalesPage from './pages/SalesPage'
import SaleDetailPage from './pages/SaleDetailPage'
import SaleFormPage from './pages/SaleFormPage'
import ReturnsPage from './pages/ReturnsPage'
import ReturnFormPage from './pages/ReturnFormPage'
import ReturnDetailPage from './pages/ReturnDetailPage'
import PaymentsPage from './pages/PaymentsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="items" element={<ItemsPage />} />
                <Route path="items/:id" element={<ItemDetailPage />} />
                <Route path="purchases" element={<PurchasesPage />} />
                <Route path="purchases/new" element={<PurchaseFormPage />} />
                <Route path="purchases/:id" element={<PurchaseDetailPage />} />
                <Route path="purchases/:id/edit" element={<PurchaseFormPage />} />
                <Route path="pos" element={<PosPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="sales/new" element={<Navigate to="/pos" replace />} />
                <Route path="sales/:id" element={<SaleDetailPage />} />
                <Route path="sales/:id/edit" element={<SaleFormPage />} />
                <Route path="returns" element={<ReturnsPage />} />
                <Route path="returns/new" element={<ReturnFormPage />} />
                <Route path="returns/:kind/:id" element={<ReturnDetailPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="suppliers" element={<PartiesPage kind="suppliers" />} />
                <Route path="suppliers/:id" element={<PartyDetailPage kind="suppliers" />} />
                <Route path="customers" element={<PartiesPage kind="customers" />} />
                <Route path="customers/:id" element={<PartyDetailPage kind="customers" />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
