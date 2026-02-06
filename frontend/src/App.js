import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import './App.css';
import Login from './pages/Login';
import Setup from './pages/Setup';
import EmergencyReset from './pages/EmergencyReset';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Calendar from './pages/Calendar';
import ClockInOut from './pages/ClockInOut';
import ClockHistory from './pages/ClockHistory';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import Estimates from './pages/Estimates';
import PurchaseOrders from './pages/PurchaseOrders';
import CostEstimates from './pages/CostEstimates';
import CostEstimateDetail from './pages/CostEstimateDetail';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';
import HumanResources from './pages/HumanResources';
import Payroll from './pages/Payroll';
import Approvals from './pages/Approvals';
import MyRequests from './pages/MyRequests';
import MyProfile from './pages/MyProfile';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import ClientProfileDetail from './pages/ClientProfileDetail';
import ClientEstimates from './pages/ClientEstimates';
import Accounting from './pages/Accounting';
import Companies from './pages/Companies';
import Vendors from './pages/Vendors';
import PaymentReceipts from './pages/PaymentReceipts';
import ProtectedRoute from './components/ProtectedRoute';

function AppRouter() {
  const location = useLocation();

  // Check for session_id in hash - render AuthCallback only once
  const hasSessionId = location.hash?.includes('session_id=');
  
  if (hasSessionId) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/emergency-reset" element={<EmergencyReset />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/projects" element={
        <ProtectedRoute>
          <Projects />
        </ProtectedRoute>
      } />
      
      <Route path="/projects/:projectId" element={
        <ProtectedRoute>
          <ProjectDetail />
        </ProtectedRoute>
      } />
      
      <Route path="/calendar" element={
        <ProtectedRoute>
          <Calendar />
        </ProtectedRoute>
      } />
      
      <Route path="/clock" element={
        <ProtectedRoute>
          <ClockInOut />
        </ProtectedRoute>
      } />
      
      <Route path="/clock/history" element={
        <ProtectedRoute>
          <ClockHistory />
        </ProtectedRoute>
      } />
      
      <Route path="/users" element={
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      } />
      
      <Route path="/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />
      
      <Route path="/invoices" element={
        <ProtectedRoute>
          <Invoices />
        </ProtectedRoute>
      } />
      
      {/* Old estimates page - hidden from navigation but still accessible */}
      <Route path="/estimates-legacy" element={
        <ProtectedRoute>
          <Estimates />
        </ProtectedRoute>
      } />
      
      {/* New Estimados area - Client Profiles */}
      <Route path="/estimados" element={
        <ProtectedRoute>
          <ClientEstimates />
        </ProtectedRoute>
      } />
      
      <Route path="/estimados/:profileId" element={
        <ProtectedRoute>
          <ClientProfileDetail />
        </ProtectedRoute>
      } />
      
      <Route path="/purchase-orders" element={
        <ProtectedRoute>
          <PurchaseOrders />
        </ProtectedRoute>
      } />
      
      <Route path="/cost-estimates" element={
        <ProtectedRoute>
          <CostEstimates />
        </ProtectedRoute>
      } />
      
      <Route path="/cost-estimates/:estimateId" element={
        <ProtectedRoute>
          <CostEstimateDetail />
        </ProtectedRoute>
      } />
      
      <Route path="/audit-log" element={
        <ProtectedRoute>
          <AuditLog />
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      
      <Route path="/hr" element={
        <ProtectedRoute>
          <HumanResources />
        </ProtectedRoute>
      } />
      
      <Route path="/payroll" element={
        <ProtectedRoute>
          <Payroll />
        </ProtectedRoute>
      } />
      <Route path="/approvals" element={
        <ProtectedRoute>
          <Approvals />
        </ProtectedRoute>
      } />
      <Route path="/my-requests" element={
        <ProtectedRoute>
          <MyRequests />
        </ProtectedRoute>
      } />
      <Route path="/my-profile" element={
        <ProtectedRoute>
          <MyProfile />
        </ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute>
          <Clients />
        </ProtectedRoute>
      } />
      <Route path="/clients/:clientId" element={
        <ProtectedRoute>
          <ClientDetail />
        </ProtectedRoute>
      } />
      <Route path="/accounting" element={
        <ProtectedRoute>
          <Accounting />
        </ProtectedRoute>
      } />
      <Route path="/companies" element={
        <ProtectedRoute>
          <Companies />
        </ProtectedRoute>
      } />
      <Route path="/vendors" element={
        <ProtectedRoute>
          <Vendors />
        </ProtectedRoute>
      } />
      <Route path="/receipts" element={
        <ProtectedRoute>
          <PaymentReceipts />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;