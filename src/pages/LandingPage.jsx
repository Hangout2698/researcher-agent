import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', textAlign: 'center' }}>
      <h1>Welcome to Our App</h1>
      <p style={{ marginBottom: '30px' }}>Please login or sign up to continue</p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <button 
          onClick={() => navigate('/login')}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#2196F3', 
            color: 'white', 
            border: 'none',
            cursor: 'pointer' 
          }}
        >
          Login
        </button>
        
        <button 
          onClick={() => navigate('/signup')}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#4CAF50', 
            color: 'white', 
            border: 'none',
            cursor: 'pointer' 
          }}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
  