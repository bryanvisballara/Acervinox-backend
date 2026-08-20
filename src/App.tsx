import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { AuthProvider } from './context/AuthContext'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AccountingPage } from './pages/admin/AccountingPage'
import { CatalogPage } from './pages/admin/CatalogPage'
import { ClientsPage } from './pages/admin/ClientsPage'
import { CotizadorPage } from './pages/admin/CotizadorPage'
import { FunnelPage } from './pages/admin/FunnelPage'
import { MaintenancesPage } from './pages/admin/MaintenancesPage'
import { OrdersPage } from './pages/admin/OrdersPage'
import { ProductDetailPage } from './pages/admin/ProductDetailPage'
import { StageOrdersPage } from './pages/admin/StageOrdersPage'
import { ClientLayout } from './pages/client/ClientLayout'
import { ClientOrderPage } from './pages/client/ClientOrderPage'
import { ClientPayPage } from './pages/client/ClientPayPage'
import { ClientPortal } from './pages/client/ClientPortal'
import { ClientTallerPage } from './pages/client/ClientTallerPage'
import { ClientTrackPage } from './pages/client/ClientTrackPage'
import { WorkshopLayout } from './pages/workshop/WorkshopLayout'
import { isNativeApp } from './lib/native'

function LegacyOrderRedirect() {
  const { id } = useParams()
  return <Navigate to={`/admin/pedidos/${id}`} replace />
}

function HomeRoute() {
  if (isNativeApp()) return <Navigate to="/login" replace />
  return <LandingPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar" element={<ForgotPasswordPage />} />
        <Route
          path="/admin"
          element={
            <RequireAuth roles={['admin']}>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="etapas/:stageId" element={<StageOrdersPage />} />
          <Route path="productos" element={<CatalogPage />} />
          <Route path="productos/:id" element={<LegacyOrderRedirect />} />
          <Route path="pedidos/:id" element={<ProductDetailPage />} />
          <Route path="cotizador" element={<CotizadorPage />} />
          <Route path="embudo" element={<FunnelPage />} />
          <Route path="pedidos" element={<OrdersPage />} />
          <Route path="clientes" element={<ClientsPage />} />
          <Route path="contabilidad" element={<AccountingPage />} />
          <Route path="mantenimientos" element={<MaintenancesPage />} />
        </Route>
        <Route
          path="/workshop"
          element={
            <RequireAuth roles={['admin', 'workshop']}>
              <WorkshopLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="etapas/:stageId" element={<StageOrdersPage />} />
          <Route path="pedidos/:id" element={<ProductDetailPage />} />
          <Route path="mantenimientos" element={<MaintenancesPage />} />
        </Route>
        <Route path="/portal" element={<ClientLayout />}>
          <Route index element={<ClientPortal />} />
          <Route path="guia/:code" element={<ClientTrackPage />} />
          <Route path="cuenta" element={<Navigate to="/portal" replace />} />
          <Route path="pago/:code" element={<ClientPayPage />} />
          <Route path="taller" element={<ClientTallerPage />} />
          <Route path="pedidos/:id" element={<ClientOrderPage />} />
        </Route>
        <Route path="*" element={<Navigate to={isNativeApp() ? '/login' : '/'} replace />} />
      </Routes>
    </AuthProvider>
  )
}
