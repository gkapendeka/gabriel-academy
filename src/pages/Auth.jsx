import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sendEmail, EmailTemplates } from '../lib/emailService';

export default function Auth() {
  const { role } = useParams(); // client, consultant, admin
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [subjects, setSubjects] = useState('');
  const [qualFile, setQualFile] = useState(null);

  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        const userRole = profile?.role || role || 'client';
        navigate(`/${userRole}`);
      }
    });
    
    // Also check if they are already logged in when arriving
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        const userRole = profile?.role || role || 'client';
        navigate(`/${userRole}`);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate, role]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isResetting) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });
        if (resetError) throw resetError;
        setSuccess('Password reset link sent! Check your email.');
        return;
      }

      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        // Let's redirect based on actual DB role to prevent routing to /undefined
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        const userRole = profile?.role || role || 'client'; // fallback
        
        navigate(`/${userRole}`);
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/${role}`,
            data: {
              full_name: fullName,
              phone: phone,
              role: role, // Default to requested role
              qualification: qualification,
              subjects: subjects
            }
          }
        });
        if (signUpError) throw signUpError;

        if (role === 'consultant' && qualFile) {
          try {
            const fileExt = qualFile.name.split('.').pop();
            const fileName = `${data.user.id}_qual_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('qualifications').upload(fileName, qualFile);
            if (!uploadError) {
              await supabase.from('profiles').update({ qualifications_url: fileName }).eq('id', data.user.id);
            }
          } catch (e) {
            console.error("Failed to upload qual:", e);
          }
        }

        // Immediately trigger the custom 'Application Received' email via Resend Edge Function
        if (role === 'consultant') {
          // Fire and forget so we don't block the UI
          sendEmail(email, 'Application Received - Gabriel Academics', EmailTemplates.consultantApplied(fullName));
        }

        setSuccess('Registration successful! Please check your email to verify.');
      }
    } catch (err) {
      console.error('Auth Error:', err);
      setError(err.message || err.error_description || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen">
      <button className="auth-back" onClick={() => navigate('/')}>← Back to Home</button>
      
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">GA</div>
          <div>
            <div className="auth-logo-text">Gabriel Academics</div>
            <div className="auth-logo-sub">
              {role === 'client' ? 'Client Portal' : role === 'consultant' ? 'Consultant Portal' : 'Command Centre'}
            </div>
          </div>
        </div>

        <div className="auth-title">
          {isResetting ? 'Reset Password' : isLogin ? 'Welcome back' : 'Create account'}
        </div>
        <div className="auth-sub">
          {isResetting 
            ? 'Enter your email to receive a password reset link.'
            : isLogin 
              ? 'Sign in to access your portal.' 
              : `Register as a new ${role}.`}
        </div>

        {!isResetting && (
          <div className="auth-tabs">
            <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Sign In</button>
            <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Register</button>
          </div>
        )}

        {error && <div className="error-msg" style={{display: 'block'}}>{error}</div>}
        {success && <div className="success-msg" style={{display: 'block'}}>{success}</div>}

        {success ? (
          <div style={{textAlign: 'center', marginTop: '24px', marginBottom: '8px'}}>
            <button type="button" className="btn btn-primary btn-block" onClick={() => { setIsLogin(true); setIsResetting(false); setSuccess(''); }}>
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth}>
            {!isResetting && !isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name / Alias</label>
                  <input type="text" className="form-input" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="How we should address you" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-input" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="Used for WhatsApp updates" />
                </div>
                
                {role === 'consultant' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Highest Qualification</label>
                      <input type="text" className="form-input" required value={qualification} onChange={e => setQualification(e.target.value)} placeholder="e.g. BSc Computer Science, Honours" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Upload Proof of Qualification</label>
                      <input type="file" className="form-input" required onChange={e => setQualFile(e.target.files[0])} />
                      <div className="form-note">Please attach your transcript or degree (PDF/Img)</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subjects You Cover</label>
                      <input type="text" className="form-input" required value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="e.g. Maths, Physics, Programming" />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
            </div>

            {!isResetting && (
              <div className="form-group">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <label className="form-label" style={{margin: 0}}>Password</label>
                  {isLogin && (
                    <button type="button" onClick={() => { setIsResetting(true); setError(''); setSuccess(''); }} style={{background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', cursor: 'pointer', padding: 0}}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{position: 'relative'}}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="form-input" 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    style={{marginTop: '8px', paddingRight: '40px'}} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                      background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                      padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" style={{marginTop: '20px'}} disabled={loading}>
              {loading ? <span className="spinner"></span> : isResetting ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
            
            {isResetting && (
              <button type="button" className="btn btn-block" style={{marginTop: '10px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0'}} onClick={() => { setIsResetting(false); setError(''); setSuccess(''); }}>
                Cancel
              </button>
            )}
          </form>
        )}

        {!isLogin && role === 'consultant' && (
          <div className="auth-role-note">
            <strong>Note:</strong> Your account will need to be verified by Gabriel Academics before you can accept jobs.
          </div>
        )}
        {role === 'consultant' && (
          <div style={{textAlign: 'center', marginTop: '16px'}}>
            <span
              onClick={() => navigate('/auth/admin')}
              style={{fontSize: '10px', color: 'var(--dim)', opacity: 0.35, cursor: 'pointer', letterSpacing: '0.5px'}}
            >admin</span>
          </div>
        )}
      </div>
    </div>
  );
}
