import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import StockIn from './pages/StockIn'
import StockOut from './pages/StockOut'
import CurrentStock from './pages/CurrentStock'
import StockMovement from './pages/StockMovement'
import Categories from './pages/Categories'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/stock-in" element={<ProtectedRoute><StockIn /></ProtectedRoute>} />
      <Route path="/stock-out" element={<ProtectedRoute><StockOut /></ProtectedRoute>} />
      <Route path="/current-stock" element={<ProtectedRoute><CurrentStock /></ProtectedRoute>} />
      <Route path="/stock-movement" element={<ProtectedRoute><StockMovement /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
