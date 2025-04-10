import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    // Basic validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          // By default, Supabase requires email confirmation
          emailRedirectTo: window.location.origin + '/login'
        }
      });
      
      if (error) throw error;
      
      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        // User already exists
        setError('An account with this email already exists. Please login instead.');
        navigate('/login');
        return;
      } else if (data?.user?.identities) {
        // Success with email confirmation
        setMessage('Registration successful! Please check your email for a confirmation link.');
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      } else {
        // Successful signup without confirmation needed
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Signup error:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Sign Up</h2>
      
      {message && (
        <div style={{ 
          padding: '10px',
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: '4px',
          color: '#52c41a',
          marginBottom: '15px'
        }}>
          {message}
        </div>
      )}
      
      {error && (
        <div style={{ 
          padding: '10px',
          backgroundColor: '#fff2f0',
          border: '1px solid #ffccc7',
          borderRadius: '4px',
          color: '#ff4d4f',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}
      
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
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
        <input 
          id="password"
          type="password" 
          placeholder="Choose a password (min 6 characters)" 
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength="6"
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} 
        />
      </div>
      
      <button 
        type="submit"
        disabled={loading}
        style={{ 
          width: '100%',
          padding: '10px 15px', 
          backgroundColor: '#4CAF50', 
          color: 'white', 
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer' 
        }}
      >
        {loading ? 'Creating Account...' : 'Sign Up'}
      </button>
      
      <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.9em' }}>
        Already have an account? <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Login</a>
      </p>
    </form>
  );
}
  