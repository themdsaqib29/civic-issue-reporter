import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatIssuePage from './pages/ChatIssuePage';
import IssuesListPage from './pages/IssuesListPage';
import StatsPage from './pages/StatsPage';
import AdminDashboard from './pages/AdminDashboard';
import MyIssuesPage from './pages/MyIssuesPage';



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/report-issue" element={<ChatIssuePage />} />
        <Route path="/issues" element={<IssuesListPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/my-issues" element={<MyIssuesPage />} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;