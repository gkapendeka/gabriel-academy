import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Careers() {
  const navigate = useNavigate();

  return (
    <div id="app-shell" style={{background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
      {/* Navbar */}
      <nav style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'}} onClick={() => navigate('/')}>
          <div className="brand-mark">GA</div>
          <span style={{fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px'}}>Gabriel Academics</span>
        </div>
        <div style={{display: 'flex', gap: '32px', alignItems: 'center', fontWeight: 500}}>
          <span style={{cursor: 'pointer', opacity: 0.8}} onClick={() => navigate('/')}>Home</span>
          <span style={{cursor: 'pointer', color: 'var(--gold)'}}>Become a Consultant</span>
          <button className="btn btn-primary" onClick={() => navigate('/auth/consultant')}>Get Started</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px', textAlign: 'center'}}>
        <div style={{display: 'inline-block', padding: '6px 16px', borderRadius: '100px', background: 'rgba(245,158,11,0.1)', color: 'var(--gold)', fontSize: '13px', fontWeight: 600, marginBottom: '24px'}}>WE ARE HIRING</div>
        <h1 style={{fontSize: '56px', fontWeight: 800, letterSpacing: '-2px', marginBottom: '24px', lineHeight: 1.1, maxWidth: '800px'}}>
          Join the Elite Network of <br/><span style={{color: 'var(--gold)'}}>Academic Consultants</span>
        </h1>
        <p style={{fontSize: '20px', color: 'var(--muted)', maxWidth: '600px', marginBottom: '48px', lineHeight: 1.6}}>
          Earn money by sharing your expertise. We are looking for high-achieving postgraduates, researchers, and professionals to help students succeed.
        </p>

        {/* Perks Grid */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '1000px', width: '100%', marginBottom: '64px', textAlign: 'left'}}>
          <div className="card-box" style={{background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'}}>
            <div style={{fontSize: '32px', marginBottom: '16px'}}>💸</div>
            <h3 style={{fontSize: '18px', marginBottom: '8px'}}>Excellent Payouts</h3>
            <p style={{color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5}}>Set your own schedule and take on jobs that fit your expertise. We offer highly competitive compensation rates up to 90% of the client budget.</p>
          </div>
          <div className="card-box" style={{background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'}}>
            <div style={{fontSize: '32px', marginBottom: '16px'}}>🛡️</div>
            <h3 style={{fontSize: '18px', marginBottom: '8px'}}>Complete Anonymity</h3>
            <p style={{color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5}}>Your identity is fully protected. All communication with clients is brokered securely through our platform.</p>
          </div>
          <div className="card-box" style={{background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'}}>
            <div style={{fontSize: '32px', marginBottom: '16px'}}>🎯</div>
            <h3 style={{fontSize: '18px', marginBottom: '8px'}}>Flexible Work</h3>
            <p style={{color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5}}>Browse the Mission Board and accept only the jobs you want to do. Work from anywhere, at any time.</p>
          </div>
        </div>

        {/* CTA */}
        <div style={{background: 'var(--surface)', padding: '48px', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '800px', width: '100%'}}>
          <h2 style={{fontSize: '32px', marginBottom: '16px'}}>Ready to Apply?</h2>
          <p style={{color: 'var(--muted)', marginBottom: '32px'}}>Sign up as a Consultant today. Once registered, your profile will be reviewed by our administration team before you can accept missions.</p>
          <button className="btn btn-gold" style={{padding: '16px 32px', fontSize: '18px'}} onClick={() => navigate('/auth/consultant')}>Apply Now</button>
        </div>
      </div>

      {/* Footer */}
      <footer style={{padding: '48px', color: 'var(--muted)', borderTop: '1px solid var(--border)'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div className="brand-mark" style={{opacity: 0.5}}>GA</div>
            <div style={{fontSize: '14px'}}>© {new Date().getFullYear()} Gabriel Academics (Pty) Ltd · All rights reserved</div>
          </div>
          <div style={{display: 'flex', gap: '24px', fontSize: '14px'}}>
            <span style={{cursor: 'pointer'}}>Privacy Policy</span>
            <span style={{cursor: 'pointer'}}>Terms of Service</span>
            <span style={{cursor: 'pointer', color: 'var(--gold)'}} onClick={() => navigate('/auth/consultant')}>Client Login</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
