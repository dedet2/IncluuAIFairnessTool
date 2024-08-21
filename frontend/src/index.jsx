// index.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import 'antd/dist/reset.css';  // Add this line

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
