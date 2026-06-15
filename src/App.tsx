import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { AppProvider } from './store';
import { useAppStore } from './store';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="admin" element={<Admin />} />
            <Route path="profile/:id" element={<Profile />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
