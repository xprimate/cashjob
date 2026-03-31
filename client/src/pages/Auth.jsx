import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, setAuthToken } from '../services/api';

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const payload = isRegister ? { name, email, password } : { email, password };
      const response = isRegister ? await register(payload) : await login(payload);
      const { token, user } = response.data;
      localStorage.setItem('cashjob_token', token);
      setAuthToken(token);
      onLogin(user);
      setMessage(isRegister ? 'Registered and logged in.' : 'Logged in.');
      setEmail('');
      setPassword('');
      setName('');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Auth failed');
    }
  };

  return (
    <div className="page">
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {isRegister && (
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
      </form>

      <button onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? 'Already have account? Login' : 'No account? Register'}
      </button>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
