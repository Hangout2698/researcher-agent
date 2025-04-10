import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadUserAndInterviews() {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (!user) return;

        // Fetch interviews 
        const { data, error } = await supabase
          .from('interviews')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching interviews:', error);
        } else {
          setInterviews(data || []);
        }
      } catch (error) {
        console.error('Dashboard loading error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserAndInterviews();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div>Loading dashboard data...</div>;
  }

  return (
    <div style={{ maxWidth: '960px', margin: '40px auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Dashboard</h1>
        <div>
          <span style={{ marginRight: '15px' }}>Welcome, {user?.email}</span>
          <button 
            onClick={handleSignOut}
            style={{ 
              padding: '8px 12px', 
              backgroundColor: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer' 
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={() => navigate('/create-interview')}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#4CAF50', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer' 
          }}
        >
          + New Interview
        </button>
      </div>

      <h2>Your Interviews</h2>
      
      {interviews.length === 0 ? (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '5px',
          textAlign: 'center' 
        }}>
          <p>You haven't created any interviews yet.</p>
          <p>Click the "New Interview" button to get started!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {interviews.map((interview) => (
            <div 
              key={interview.id} 
              style={{ 
                border: '1px solid #eee', 
                padding: '15px', 
                borderRadius: '5px',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
                {interview.persona} – {interview.domain}
              </h3>
              
              <p style={{ 
                fontSize: '0.9em', 
                color: '#666', 
                marginBottom: '15px' 
              }}>
                Created: {new Date(interview.created_at).toLocaleString()}
              </p>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => navigate(`/interview/${interview.id}`)}
                  style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#1976d2', 
                    color: 'white', 
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer' 
                  }}
                >
                  Open Interview
                </button>
                
                <button 
                  disabled 
                  title="Coming soon"
                  style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#f5f5f5',
                    color: '#999',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    cursor: 'not-allowed' 
                  }}
                >
                  Export Summary
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
  