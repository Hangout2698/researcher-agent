import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function TestConnection() {
  const [configStatus, setConfigStatus] = useState('Testing configuration...');
  const [supabaseInfo, setSupabaseInfo] = useState(null);
  const [authStatus, setAuthStatus] = useState('Not tested');
  const [storageStatus, setStorageStatus] = useState('Not tested');
  const [databaseStatus, setDatabaseStatus] = useState('Not tested');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Basic configuration test
    function testConfiguration() {
      try {
        const url = supabase.supabaseUrl;
        const key = supabase.supabaseKey ? "✓ Present" : "✗ Missing";
        
        setSupabaseInfo({
          url,
          key
        });
        
        setConfigStatus('✅ Supabase client configured!');
        return true;
      } catch (err) {
        setConfigStatus('❌ Failed to initialize Supabase client');
        setErrors(prev => ({ ...prev, config: err.message }));
        return false;
      }
    }

    // Test anonymous authentication
    async function testAuth() {
      try {
        setAuthStatus('Testing...');
        // Try to get user session (should return null for anonymous)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setAuthStatus('✅ Authentication API working');
        return true;
      } catch (err) {
        setAuthStatus('❌ Authentication API error');
        setErrors(prev => ({ ...prev, auth: err.message }));
        return false;
      }
    }

    // Test database operation
    async function testDatabase() {
      try {
        setDatabaseStatus('Testing...');
        
        // Create a temporary table name for our test
        // Try to query system tables which should be readable
        const { data, error } = await supabase
          .from('_realtime')
          .select('*')
          .limit(1);
          
        if (error && error.code !== '42P01') { // 42P01 is "table does not exist" which is fine
          // Even permission errors (PGRST116) are okay - it means we connected
          if (error.code === 'PGRST116') {
            setDatabaseStatus('✅ Database connected (permission restricted)');
            return true;
          }
          throw error;
        }
        
        setDatabaseStatus('✅ Database connected');
        return true;
      } catch (err) {
        setDatabaseStatus('❌ Database API error');
        setErrors(prev => ({ ...prev, database: err.message }));
        return false;
      }
    }

    // Test storage bucket operation
    async function testStorage() {
      try {
        setStorageStatus('Testing...');
        
        // List buckets (will fail with permissions error, but shows we're connected)
        const { data, error } = await supabase.storage.listBuckets();
        
        if (error) {
          // Permission errors are actually good - means we're connected
          if (error.message.includes('permission') || error.statusCode === 400) {
            setStorageStatus('✅ Storage API connected (permission restricted)');
            return true;
          }
          throw error;
        }
        
        setStorageStatus('✅ Storage API connected');
        return true;
      } catch (err) {
        setStorageStatus('❌ Storage API error');
        setErrors(prev => ({ ...prev, storage: err.message }));
        return false;
      }
    }

    // Run all tests
    async function runTests() {
      // First check configuration
      const configOk = testConfiguration();
      if (!configOk) return;
      
      // Run all tests in parallel
      await Promise.all([
        testAuth(),
        testDatabase(),
        testStorage()
      ]);
    }

    runTests();
  }, []);

  // Helper function for status styling
  const getStatusColor = (status) => {
    if (status.includes('✅')) return '#52c41a';
    if (status.includes('❌')) return '#ff4d4f';
    return '#1890ff';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        padding: '25px',
        borderRadius: '8px', 
        backgroundColor: '#fafafa',
        border: '1px solid #d9d9d9',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Supabase Comprehensive Test</h2>
        
        {/* Configuration Section */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ 
            borderBottom: '1px solid #d9d9d9', 
            paddingBottom: '8px',
            marginBottom: '15px' 
          }}>
            Client Configuration
          </h3>
          
          <p style={{ fontWeight: 'bold', color: getStatusColor(configStatus) }}>
            {configStatus}
          </p>
          
          {supabaseInfo && (
            <div style={{ marginTop: '10px' }}>
              <p><strong>URL:</strong> {supabaseInfo.url}</p>
              <p><strong>API Key:</strong> {supabaseInfo.key}</p>
            </div>
          )}
          
          {errors.config && (
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#fff2f0', 
              border: '1px solid #ffccc7',
              borderRadius: '4px'
            }}>
              <code>{errors.config}</code>
            </div>
          )}
        </div>
        
        {/* Services Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {/* Auth Section */}
          <div style={{ 
            padding: '15px', 
            borderRadius: '8px',
            border: '1px solid #d9d9d9',
            backgroundColor: '#fff' 
          }}>
            <h3 style={{ marginBottom: '15px' }}>Authentication</h3>
            <p style={{ fontWeight: 'bold', color: getStatusColor(authStatus) }}>
              {authStatus}
            </p>
            {errors.auth && (
              <div style={{ 
                marginTop: '10px', 
                padding: '10px', 
                backgroundColor: '#fff2f0', 
                border: '1px solid #ffccc7',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <code>{errors.auth}</code>
              </div>
            )}
          </div>
          
          {/* Database Section */}
          <div style={{ 
            padding: '15px', 
            borderRadius: '8px',
            border: '1px solid #d9d9d9',
            backgroundColor: '#fff' 
          }}>
            <h3 style={{ marginBottom: '15px' }}>Database</h3>
            <p style={{ fontWeight: 'bold', color: getStatusColor(databaseStatus) }}>
              {databaseStatus}
            </p>
            {errors.database && (
              <div style={{ 
                marginTop: '10px', 
                padding: '10px', 
                backgroundColor: '#fff2f0', 
                border: '1px solid #ffccc7',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <code>{errors.database}</code>
              </div>
            )}
          </div>
          
          {/* Storage Section */}
          <div style={{ 
            padding: '15px', 
            borderRadius: '8px',
            border: '1px solid #d9d9d9',
            backgroundColor: '#fff' 
          }}>
            <h3 style={{ marginBottom: '15px' }}>Storage</h3>
            <p style={{ fontWeight: 'bold', color: getStatusColor(storageStatus) }}>
              {storageStatus}
            </p>
            {errors.storage && (
              <div style={{ 
                marginTop: '10px', 
                padding: '10px', 
                backgroundColor: '#fff2f0', 
                border: '1px solid #ffccc7',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <code>{errors.storage}</code>
              </div>
            )}
          </div>
        </div>
        
        <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
          <p>Note: Permission errors on some tests are expected behavior for anonymous access.</p>
        </div>
      </div>
    </div>
  );
} 