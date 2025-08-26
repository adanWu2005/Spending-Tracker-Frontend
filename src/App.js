import './App.css';
import Login from './components/Login'
import Register from './components/Register'
import EmailVerification from './components/EmailVerification'
import Home from './components/Home'
import AutoTagRules from './components/AutoTagRules'
import ProtectedRoute from "./components/ProtectedRoute"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

function Logout() {
  localStorage.clear()
  return <Navigate to="/login" />
}

function NotFound() {
  return <div>Page not found</div>
}

function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auto-tag-rules"
        element={
          <ProtectedRoute>
            <AutoTagRules />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="*" element={<NotFound />}></Route>
    </Routes>
  </BrowserRouter>
  );
}

export default App;
