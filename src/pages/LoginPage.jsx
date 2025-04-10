import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      
      // Success - navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input 
          id="email"
          type="email" 
          placeholder="Your email" 
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} 
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
        <input 
          id="password"
          type="password" 
          placeholder="Your password" 
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} 
        />
      </div>
      
      {error && (
        <p style={{ color: 'red', marginTop: '0', marginBottom: '15px', fontSize: '0.9em' }}>
          {error}
        </p>
      )}
      
      <button 
        type="submit"
        disabled={loading}
        style={{ 
          width: '100%',
          padding: '10px 15px', 
          backgroundColor: '#2196F3', 
          color: 'white', 
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer' 
        }}
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
      
      <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.9em' }}>
        Don't have an account? <a href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>Sign Up</a>
      </p>
    </form>
  );
}
  