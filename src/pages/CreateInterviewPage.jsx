import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function CreateInterviewPage() {
  const [persona, setPersona] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!persona.trim() || !domain.trim()) {
      setError('Please fill in both fields');
      return;
    }
    
    setLoading(true);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Please log in to create an interview');
      }

      // Create new interview
      const { data, error: insertError } = await supabase
        .from('interviews')
        .insert({ 
          user_id: user.id, 
          persona: persona.trim(), 
          domain: domain.trim(),
          created_at: new Date().toISOString() 
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      // Navigate to the interview page
      navigate(`/interview/${data.id}`);
      
    } catch (error) {
      console.error('Error creating interview:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Create New Interview</h2>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fff2f0', 
          color: '#ff4d4f', 
          borderRadius: '4px',
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="persona" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Persona (who you are interviewing)
          </label>
          <input 
            id="persona"
            type="text" 
            placeholder="e.g., Senior Marketing Manager" 
            value={persona} 
            onChange={e => setPersona(e.target.value)}
            required
            style={{ 
              width: '100%', 
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #d9d9d9' 
            }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="domain" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Domain (subject area)
          </label>
          <input 
            id="domain"
            type="text" 
            placeholder="e.g., Social Media Advertising" 
            value={domain} 
            onChange={e => setDomain(e.target.value)}
            required
            style={{ 
              width: '100%', 
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #d9d9d9' 
            }}
          />
        </div>
        
        <button 
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Creating...' : 'Start Interview'}
        </button>
        
        <button 
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: 'transparent',
            color: '#666',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
  