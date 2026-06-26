import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we actually have a session or recovery token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // They might not be authorized if the token was invalid
        setError('Invalid or expired recovery link. Please try resetting your password again.');
      }
    });
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        navigate('/'); // go to home or portal
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">GA</div>
          <div>
            <div className="auth-logo-text">Gabriel Academics</div>
          </div>
        </div>
        <div className="auth-title">Set New Password</div>
        
        {success ? (
          <div className="success-msg" style={{display: 'block'}}>
            Password updated successfully! Redirecting...
          </div>
        ) : (
          <form onSubmit={handleUpdate}>
            {error && <div className="error-msg" style={{display: 'block'}}>{error}</div>}
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                className="form-input" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                minLength={6}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{marginTop: '20px'}} disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
