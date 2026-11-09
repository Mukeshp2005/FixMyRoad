import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import CitizenDashboard from '../pages/CitizenDashboard';
import MunicipalityDashboard from '../pages/MunicipalityDashboard';
import AdminDashboard from '../pages/AdminDashboard';
import ReportIssuePage from '../pages/citizen/ReportIssuePage';
import MyComplaintsPage from '../pages/citizen/MyComplaintsPage';
import ComplaintDetailsPage from '../pages/citizen/ComplaintDetailsPage';
import MunicipalityComplaintsPage from '../pages/municipality/MunicipalityComplaintsPage';
import MunicipalityComplaintDetailsPage from '../pages/municipality/MunicipalityComplaintDetailsPage';
import ReopenRequestsPage from '../pages/municipality/ReopenRequestsPage';
import ReopenRequestDetailsPage from '../pages/municipality/ReopenRequestDetailsPage';
import AnalyticsDashboardPage from '../pages/municipality/AnalyticsDashboardPage';
import SystemHealthPage from '../pages/admin/SystemHealthPage';
import OperationsDashboardPage from '../pages/admin/OperationsDashboardPage';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Role-Protected Routes with MainLayout */}
      <Route element={<MainLayout />}>
        {/* Protected Main Site Landing */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LandingPage />
            </ProtectedRoute>
          }
        />
        {/* CITIZEN Portal */}
        <Route
          path="/citizen/dashboard"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN']}>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/report"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN']}>
              <ReportIssuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/complaints"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN']}>
              <MyComplaintsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/complaints/:complaintId"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN', 'MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER', 'SUPER_ADMIN']}>
              <ComplaintDetailsPage />
            </ProtectedRoute>
          }
        />

        {/* MUNICIPALITY Portal */}
        <Route
          path="/municipality/dashboard"
          element={
            <ProtectedRoute allowedRoles={['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER']}>
              <MunicipalityDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/municipality/complaints"
          element={
            <ProtectedRoute allowedRoles={['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER']}>
              <MunicipalityComplaintsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/municipality/complaints/:complaintId"
          element={
            <ProtectedRoute allowedRoles={['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER', 'SUPER_ADMIN']}>
              <MunicipalityComplaintDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/municipality/reopen-requests"
          element={
            <ProtectedRoute allowedRoles={['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER', 'SUPER_ADMIN']}>
              <ReopenRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/municipality/reopen-requests/:id"
          element={
            <ProtectedRoute allowedRoles={['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER', 'SUPER_ADMIN']}>
              <ReopenRequestDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/municipality/analytics"
          element={
            <ProtectedRoute allowedRoles={['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER', 'SUPER_ADMIN']}>
              <AnalyticsDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* SUPER_ADMIN Portal */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AnalyticsDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/health"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'MUNICIPALITY_ADMIN']}>
              <SystemHealthPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/operations"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <OperationsDashboardPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
