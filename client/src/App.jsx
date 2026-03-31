import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { setAuthToken } from './services/api';
import JobList from './pages/JobList';
import PostJob from './pages/PostJob';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('cashjob_token');
    if (token) {
      setAuthToken(token);
      const savedUser = JSON.parse(localStorage.getItem('cashjob_user') || 'null');
      setUser(savedUser);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('cashjob_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('cashjob_user');
    localStorage.removeItem('cashjob_token');
    setAuthToken();
  };

  return (
    <Router>
      <header className="header">
        <h1>CashJob Canada</h1>
        <nav>
          <Link to="/">Jobs</Link>
          <Link to="/post">Post Job</Link>
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
          {user ? (
            <button onClick={handleLogout}>Logout {user.name}</button>
          ) : (
            <Link to="/auth">Login/Register</Link>
          )}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<JobList />} />
          <Route path="/post" element={<PostJob />} />
          <Route path="/auth" element={<Auth onLogin={handleLogin} />} />
          <Route path="/admin" element={<Admin user={user} />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} CashJob Canada</p>
      </footer>
    </Router>
  );
}

export default App;

