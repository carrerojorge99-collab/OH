import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import './App.css';
import Login from './pages/Login';
import Register from './pages/Register';
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
import ProtectedRoute from './components/ProtectedRoute';

function AppRouter() {
  const location = useLocation();

  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
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
      
      <Route path="/estimates" element={
        <ProtectedRoute>
          <Estimates />
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