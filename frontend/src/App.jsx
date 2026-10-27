import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { AccessibilityProvider } from './context/AccessibilityContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import AdminRoute from './components/layout/AdminRoute.jsx';
import Layout from './components/layout/Layout.jsx';

import Login from './pages/Login/Login.jsx';
import Cadastro from './pages/Cadastro/Cadastro.jsx';
import EsqueciSenha from './pages/EsqueciSenha/EsqueciSenha.jsx';
import RedefinirSenha from './pages/RedefinirSenha/RedefinirSenha.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Produtos from './pages/Produtos/Produtos.jsx';
import Vendas from './pages/Vendas/Vendas.jsx';
import Estoque from './pages/Estoque/Estoque.jsx';
import Desperdicios from './pages/Desperdicios/Desperdicios.jsx';
import Relatorios from './pages/Relatorios/Relatorios.jsx';
import Perfil from './pages/Perfil/Perfil.jsx';
import Contatos from './pages/Contatos/Contatos.jsx';
import NaoEncontrada from './pages/NaoEncontrada.jsx';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AccessibilityProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/esqueci-senha" element={<EsqueciSenha />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />

              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/vendas" element={<Vendas />} />
                <Route path="/estoque" element={<Estoque />} />
                <Route path="/desperdicios" element={<Desperdicios />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/contatos" element={<AdminRoute><Contatos /></AdminRoute>} />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NaoEncontrada />} />
            </Routes>
          </AuthProvider>
        </AccessibilityProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
