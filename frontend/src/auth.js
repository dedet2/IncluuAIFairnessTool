import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = 'http://localhost:5001'; // Update with your backend API URL

const register = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/register`, {
      email,
      password,
    });
    const token = response.data.token;
    localStorage.setItem('token', token);
    return jwtDecode(token);
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/login`, {
      email,
      password,
    });
    const token = response.data.token;
    localStorage.setItem('token', token);
    return jwtDecode(token);
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

const logout = () => {
  localStorage.removeItem('token');
};

const getToken = () => {
  return localStorage.getItem('token');
};

const isAuthenticated = () => {
  const token = getToken();
  return token && !isTokenExpired(token);
};

const isTokenExpired = (token) => {
  try {
    const decodedToken = jwtDecode(token);
    return decodedToken.exp < Date.now() / 1000;
  } catch (error) {
    return true;
  }
};

export { register, login, logout, getToken, isAuthenticated, API_BASE_URL };