import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div id="app-shell" style={{background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
      {/* Navbar */}
      <nav style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'}}>
          <div className="brand-mark">GA</div>
          <span style={{fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px'}}>Gabriel Academics</span>
        </div>
        <div style={{display: 'flex', gap: '32px', alignItems: 'center', fontWeight: 500}}>
          <span style={{cursor: 'pointer', opacity: 0.8}}>How It Works</span>
          <span style={{cursor: 'pointer', opacity: 0.8}}>Disciplines</span>
          <span style={{cursor: 'pointer', opacity: 0.8}}>Our Guarantee</span>
          <span style={{cursor: 'pointer', opacity: 0.8}} onClick={() => navigate('/careers')}>Become a Consultant</span>
          <button className="btn btn-primary" onClick={() => navigate('/auth/client')}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden'}}>
        {/* Decorative Background Elements */}
        <div style={{position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'var(--blue)', filter: 'blur(150px)', opacity: 0.2, borderRadius: '50%'}}></div>
        <div style={{position: 'absolute', bottom: '-10%', right: '-10%', width: '400px', height: '400px', background: 'var(--gold)', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%'}}></div>

        <div style={{zIndex: 1}}>
          <div style={{display: 'inline-block', background: 'rgba(245,158,11,0.1)', color: 'var(--gold)', padding: '8px 16px', borderRadius: '30px', fontSize: '14px', fontWeight: 600, marginBottom: '24px'}}>
            ⭐ Trusted by students from Grade R to PhD across South Africa
          </div>
          <h1 style={{fontSize: '64px', fontWeight: 800, letterSpacing: '-2px', marginBottom: '24px', lineHeight: 1.1, maxWidth: '800px'}}>
            Academic Excellence, <br/><span style={{color: 'var(--gold)'}}>Delivered to You</span>
          </h1>
          <p style={{fontSize: '20px', color: 'var(--muted)', maxWidth: '600px', margin: '0 auto 48px', lineHeight: 1.6}}>
            Professional academic assistance from Primary School through to Postgraduate level. Confidential. Expert. On time.
          </p>
          
          <div style={{display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '48px'}}>
            <button className="btn btn-gold" style={{padding: '16px 32px', fontSize: '18px'}} onClick={() => navigate('/auth/client')}>Submit Your Request</button>
            <button className="btn btn-ghost" style={{padding: '16px 32px', fontSize: '18px', background: 'rgba(255,255,255,0.05)'}}>See How It Works</button>
          </div>

          <div style={{display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', fontSize: '14px', color: 'var(--muted)', fontWeight: 500}}>
            <span>✓ 100% Confidential</span>
            <span>✓ Verified Experts Only</span>
            <span>✓ Quality Guaranteed</span>
            <span>✓ On-Time Delivery</span>
            <span>✓ Simple Process</span>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div style={{background: 'var(--surface)', padding: '100px 24px', borderTop: '1px solid var(--border)'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto'}}>
          <div style={{textAlign: 'center', marginBottom: '64px'}}>
            <h2 style={{fontSize: '42px', fontWeight: 700, marginBottom: '16px'}}>How It Works</h2>
            <p style={{color: 'var(--muted)', fontSize: '20px', maxWidth: '600px', margin: '0 auto'}}>Four steps from request to delivery — we handle everything in between.</p>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px'}}>
            <div className="card-box" style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '32px', textAlign: 'center'}}>
              <div style={{width: '64px', height: '64px', background: 'rgba(59,130,246,0.1)', color: 'var(--blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, margin: '0 auto 24px'}}>1</div>
              <h3 style={{fontSize: '20px', marginBottom: '12px'}}>Submit Your Request</h3>
              <p style={{color: 'var(--muted)', lineHeight: 1.5, fontSize: '14px'}}>Create a free account and describe your assignment — topic, level, pages, deadline and instructions.</p>
            </div>
            <div className="card-box" style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '32px', textAlign: 'center'}}>
              <div style={{width: '64px', height: '64px', background: 'rgba(245,158,11,0.1)', color: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, margin: '0 auto 24px'}}>2</div>
              <h3 style={{fontSize: '20px', marginBottom: '12px'}}>We Match an Expert</h3>
              <p style={{color: 'var(--muted)', lineHeight: 1.5, fontSize: '14px'}}>Gabriel Academics selects the most qualified consultant from our vetted panel. You never deal with them directly.</p>
            </div>
            <div className="card-box" style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '32px', textAlign: 'center'}}>
              <div style={{width: '64px', height: '64px', background: 'rgba(16,185,129,0.1)', color: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, margin: '0 auto 24px'}}>3</div>
              <h3 style={{fontSize: '20px', marginBottom: '12px'}}>Quality Review</h3>
              <p style={{color: 'var(--muted)', lineHeight: 1.5, fontSize: '14px'}}>Every submission passes our internal quality check before it reaches you. No shortcuts.</p>
            </div>
            <div className="card-box" style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '32px', textAlign: 'center'}}>
              <div style={{width: '64px', height: '64px', background: 'rgba(139,92,246,0.1)', color: 'var(--purple)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, margin: '0 auto 24px'}}>4</div>
              <h3 style={{fontSize: '20px', marginBottom: '12px'}}>Secure Delivery</h3>
              <p style={{color: 'var(--muted)', lineHeight: 1.5, fontSize: '14px'}}>You receive your completed work from Gabriel Academics. Rate the service and request revisions if needed.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Who We Serve */}
      <div style={{padding: '100px 24px'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto'}}>
          <div style={{textAlign: 'center', marginBottom: '64px'}}>
            <h2 style={{fontSize: '42px', fontWeight: 700, marginBottom: '16px'}}>Who We Serve</h2>
            <p style={{color: 'var(--muted)', fontSize: '20px', maxWidth: '600px', margin: '0 auto'}}>Every Level. Every Subject. From primary school homework to doctoral dissertations — our verified consultants cover every academic stage and discipline.</p>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '48px'}}>
            {['🏫 Primary School', '🎒 Secondary School', '🎓 Undergraduate', '📜 Postgraduate'].map((level, idx) => (
              <div key={idx} style={{background: idx === 0 ? 'var(--blue)' : 'var(--surface)', border: '1px solid var(--border)', padding: '16px', textAlign: 'center', borderRadius: '8px', fontWeight: 600}}>
                {level}
              </div>
            ))}
          </div>

          {/* Primary School Deep Dive */}
          <div style={{background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px'}}>
              <div style={{fontSize: '48px'}}>🏫</div>
              <div>
                <h3 style={{fontSize: '28px', fontWeight: 700, marginBottom: '4px'}}>Primary School</h3>
                <div style={{color: 'var(--muted)'}}>Grade R – Grade 7 · Ages 5–13</div>
              </div>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px'}}>
              <div>
                <div style={{fontSize: '20px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>✏️ English & Literacy</div>
                <div style={{color: 'var(--muted)', fontSize: '14px'}}>Reading · Writing · Comprehension · Creative Writing</div>
              </div>
              <div>
                <div style={{fontSize: '20px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>🔢 Mathematics</div>
                <div style={{color: 'var(--muted)', fontSize: '14px'}}>Numeracy · Problem Solving · Mental Maths</div>
              </div>
              <div>
                <div style={{fontSize: '20px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>🌍 Life Skills</div>
                <div style={{color: 'var(--muted)', fontSize: '14px'}}>Social Studies · Environment · Health</div>
              </div>
              <div>
                <div style={{fontSize: '20px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>🔬 Natural Sciences</div>
                <div style={{color: 'var(--muted)', fontSize: '14px'}}>Basic Science · Technology · Discovery</div>
              </div>
              <div>
                <div style={{fontSize: '20px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>🗣️ Home Language</div>
                <div style={{color: 'var(--muted)', fontSize: '14px'}}>Zulu · Afrikaans · Sotho · Xhosa + more</div>
              </div>
              <div>
                <div style={{fontSize: '20px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>🎨 Arts & Crafts</div>
                <div style={{color: 'var(--muted)', fontSize: '14px'}}>Creative projects · School assignments · Portfolios</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Our Promise */}
      <div style={{background: 'var(--surface)', padding: '100px 24px', borderTop: '1px solid var(--border)'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto'}}>
          <div style={{textAlign: 'center', marginBottom: '64px'}}>
            <h2 style={{fontSize: '42px', fontWeight: 700, marginBottom: '16px'}}>The Gabriel Guarantee</h2>
            <p style={{color: 'var(--muted)', fontSize: '20px'}}>Three non-negotiables we built this platform on.</p>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto'}}>
            <div style={{display: 'flex', gap: '24px', alignItems: 'flex-start', background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)'}}>
              <div style={{fontSize: '32px'}}>🔒</div>
              <div>
                <h3 style={{fontSize: '20px', fontWeight: 700, marginBottom: '8px'}}>Complete Confidentiality</h3>
                <p style={{color: 'var(--muted)', lineHeight: 1.6}}>Your identity is never shared with any consultant. You are known only by a reference code. All work flows through Gabriel Academics.</p>
              </div>
            </div>
            <div style={{display: 'flex', gap: '24px', alignItems: 'flex-start', background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)'}}>
              <div style={{fontSize: '32px'}}>🎓</div>
              <div>
                <h3 style={{fontSize: '20px', fontWeight: 700, marginBottom: '8px'}}>Verified Experts</h3>
                <p style={{color: 'var(--muted)', lineHeight: 1.6}}>Every consultant is personally vetted — qualifications verified, background checked, performance monitored. No exceptions.</p>
              </div>
            </div>
            <div style={{display: 'flex', gap: '24px', alignItems: 'flex-start', background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)'}}>
              <div style={{fontSize: '32px'}}>✅</div>
              <div>
                <h3 style={{fontSize: '20px', fontWeight: 700, marginBottom: '8px'}}>Quality Before Delivery</h3>
                <p style={{color: 'var(--muted)', lineHeight: 1.6}}>Nothing reaches you without passing our internal QA review. If it falls short, it goes back for revision first.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{padding: '100px 24px', textAlign: 'center', background: 'linear-gradient(180deg, var(--bg) 0%, rgba(245,158,11,0.05) 100%)'}}>
        <h2 style={{fontSize: '42px', fontWeight: 700, marginBottom: '16px'}}>Ready to get started?</h2>
        <p style={{color: 'var(--muted)', fontSize: '20px', marginBottom: '40px'}}>Create your free account in under 2 minutes. No payment until we confirm your quote.</p>
        <button className="btn btn-gold" style={{padding: '16px 32px', fontSize: '18px'}} onClick={() => navigate('/auth/client')}>Create Free Account</button>
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
            <span style={{cursor: 'pointer'}} onClick={() => navigate('/careers')}>Become a Consultant</span>
            <span style={{cursor: 'pointer', color: 'var(--gold)'}} onClick={() => navigate('/auth/client')}>Client Login</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
