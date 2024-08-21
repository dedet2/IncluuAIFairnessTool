import React from 'react';
import { Link } from 'react-router-dom';

const WelcomePage = () => {
  return (
    <div>
      <h1>Welcome to Incluu</h1>
      <p>Please register or login to continue.</p>
      <Link to="/register">Register</Link>
      <Link to="/login">Login</Link>
    </div>
  );
};

export default WelcomePage;