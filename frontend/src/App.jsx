import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import WelcomePage from './components/WelcomePage';
import RegistrationPage from './components/RegistrationPage';
import LoginPage from './components/LoginPage';
import DataUploadPage from './components/DataUploadPage';
import ResultsPage from './components/ResultsPage';
import './App.css';

const App = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/upload" element={<DataUploadPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;