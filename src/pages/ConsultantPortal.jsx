import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/useProfile';
import { useJobs } from '../lib/useJobs';
import { useMessages } from '../lib/useMessages';
import { useNotifications } from '../lib/useNotifications';
import { NotificationBell } from '../components/NotificationBell';
import { sendEmail, EmailTemplates } from '../lib/emailService';
import toast from 'react-hot-toast';

function JobModal({ job, profile, onClose, onAccept, onSubmitWork, onRequestScope, onCancel, settings }) {
  const { messages, sendMessage } = useMessages(job.id, profile.id);
  const [msgText, setMsgText] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  // Submission fields
  const [completeness, setCompleteness] = useState('');
  const [originality, setOriginality] = useState('');
  const [notes, setNotes] = useState('');

  // Acceptance fields
  const [academicCapacity, setAcademicCapacity] = useState('');
  const [timeFrame, setTimeFrame] = useState('');
  const [remuneration, setRemuneration] = useState('');

  const isOutOfScope = !profile.approved_subjects?.includes(job.subject) || !profile.approved_levels?.includes(job.level);
  const handleSend = () => {
    if (!msgText.trim()) return;
    sendMessage(msgText, null); // sending to admin
    setMsgText('');
  };

  const handleWorkSubmit = async () => {
    if (!file || !completeness || !originality) {
      return toast.error("Please fill out the confirmation checklist and attach a file.");
    }
    setUploading(true);
    await onSubmitWork(job, file, notes);
    setUploading(false);
  };

  const handleAcceptClick = () => {
    if (!academicCapacity || !timeFrame || !remuneration) {
      return toast.error("Please confirm all acceptance criteria.");
    }
    if (isOutOfScope) {
      toast.error("You are requesting a job outside your approved scope. It has been marked for Admin review.");
      onRequestScope(job);
      return;
    }
    onAccept(job);
  };

  return (
    <div className="modal-bg">
      <div className="modal" style={{maxWidth: job.status !== 'posted' ? '800px' : '500px'}}>
        <div className="modal-head">
          <div className="modal-title">Job Brief: {job.job_ref}</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{display: 'flex', gap: '20px', alignItems: 'flex-start'}}>
          
          <div style={{flex: 1}}>
            <div className="card-box">
              <div className="card-box-title">{job.title}</div>
              <div className="two-col" style={{marginBottom: 0}}>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Subject</div>
                  <div style={{fontSize: '13px'}}>{job.subject}</div>
                </div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Level</div>
                  <div style={{fontSize: '13px'}}>{job.level}</div>
                </div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Deadline</div>
                  <div style={{fontSize: '13px', color: 'var(--red)', fontWeight: 600}}>
                    {new Date(job.consultant_deadline || job.deadline).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Payout</div>
                  <div style={{fontSize: '14px', color: 'var(--gold)', fontWeight: 700}}>R{job.consultant_payout}</div>
                </div>
              </div>
            </div>
            
            <div style={{marginBottom: '20px'}}>
              <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '6px'}}>Client Instructions</div>
              <div style={{fontSize: '13px', background: 'var(--bg)', padding: '14px', borderRadius: '8px', lineHeight: 1.6, border: '1px solid var(--border)'}}>
                {job.instructions}
              </div>
            </div>

            {job.status === 'qa_failed' && (
              <div className="card-box" style={{borderColor: 'rgba(239,68,68,.3)', background: 'rgba(239,68,68,.05)'}}>
                <div className="card-box-title" style={{color: 'var(--red)'}}>Revision Required (QA Failed)</div>
                <div style={{fontSize: '13px', lineHeight: 1.5}}>{job.qa_notes}</div>
              </div>
            )}

            {job.status === 'posted' && (
              <div className="shield-banner">
                <span style={{fontSize: '20px'}}>🛡️</span>
                <div>
                  <strong>Confidentiality Agreement</strong>
                  By accepting this job, you agree to maintain complete confidentiality. You will not attempt to contact the client outside the platform.
                </div>
              </div>
            )}

            {job.status === 'posted' && !profile.is_verified && (
              <div className="card-box" style={{borderColor: 'var(--red)', background: 'rgba(239,68,68,0.05)', marginTop: '20px'}}>
                <div style={{color: 'var(--red)', fontWeight: 600, marginBottom: '4px'}}>Verification Pending</div>
                <div style={{fontSize: '13px'}}>Your account is currently under review by the administration team. You cannot accept missions until you are verified.</div>
              </div>
            )}

            {(job.status === 'active' || job.status === 'qa_failed') && (
              <div style={{marginTop: '20px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card)'}}>
                <div style={{fontWeight: 600, marginBottom: '12px'}}>Submission Checklist</div>
                
                <div className="form-group">
                  <label className="form-label">Are all instructions met?</label>
                  <select className="form-input" value={completeness} onChange={e => setCompleteness(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="yes">Yes, all instructions have been fully met</option>
                    <option value="partial">Mostly met (see notes)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Is the work 100% original?</label>
                  <select className="form-input" value={originality} onChange={e => setOriginality(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="yes">Yes, I guarantee this is my original work</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Optional Notes for QA</label>
                  <textarea className="form-input" rows="2" placeholder="Any comments for the QA team..." value={notes} onChange={e => setNotes(e.target.value)}></textarea>
                </div>

                <div className="form-group" style={{marginTop: '16px'}}>
                  <label className="form-label">Upload Completed Work</label>
                  <input type="file" className="form-input" onChange={e => setFile(e.target.files[0])} />
                  <div className="form-note">Supported formats: PDF, Word, Excel, ZIP (Max 50MB)</div>
                </div>
              </div>
            )}
            
            {job.status === 'posted' && profile.is_verified && (
              <div style={{marginTop: '20px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card)'}}>
                <div style={{fontWeight: 600, marginBottom: '12px'}}>Acceptance Checklist</div>
                
                {isOutOfScope && (
                  <div style={{padding: '12px', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 500}}>
                    ⚠️ This job is outside your pre-approved subject/level scope. You must request approval before you can start working on it.
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Academic Capacity</label>
                  <select className="form-input" value={academicCapacity} onChange={e => setAcademicCapacity(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="yes">I confirm I have the academic capacity to complete this</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Time Frame</label>
                  <select className="form-input" value={timeFrame} onChange={e => setTimeFrame(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="yes">I guarantee delivery before the deadline</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Remuneration</label>
                  <select className="form-input" value={remuneration} onChange={e => setRemuneration(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="yes">I accept the payout of R{job.consultant_payout}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {job.status !== 'posted' && (
            <div style={{flex: 1, border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '450px'}}>
              <div style={{padding: '12px', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--card)'}}>Messages with Support</div>
              <div style={{flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {messages.filter(m => !m.is_internal && m.sender?.role !== 'client').length === 0 ? (
                  <div style={{color: 'var(--muted)', fontSize: '12px', textAlign: 'center', marginTop: '20px'}}>No messages yet. Send a message to Gabriel Support if you need clarification on this brief.</div>
                ) : (
                  messages.filter(m => !m.is_internal && m.sender?.role !== 'client').map(m => (
                    <div key={m.id} style={{alignSelf: m.sender_id === profile.id ? 'flex-end' : 'flex-start', background: m.sender_id === profile.id ? 'var(--blue)' : 'var(--card)', padding: '8px 12px', borderRadius: '8px', maxWidth: '80%', fontSize: '13px'}}>
                      <div style={{fontSize: '10px', opacity: 0.7, marginBottom: '4px'}}>{m.sender?.role === 'admin' ? 'Gabriel Support' : 'You'}</div>
                      {m.body}
                    </div>
                  ))
                )}
              </div>
              <div style={{padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px'}}>
                <input type="text" className="form-input" placeholder="Type a message..." value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
                <button className="btn btn-primary" onClick={handleSend}>Send</button>
              </div>
            </div>
          )}
          
        </div>
        <div className="modal-foot" style={{justifyContent: 'space-between'}}>
          <div>
            {job.status === 'active' && (
              <button className="btn btn-ghost" style={{color: 'var(--red)'}} onClick={() => setShowCancelOptions(!showCancelOptions)}>
                Abandon Assignment
              </button>
            )}
          </div>
          <div style={{display: 'flex', gap: '8px'}}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            {job.status === 'posted' && (
              <button className={`btn ${isOutOfScope ? 'btn-secondary' : 'btn-primary'}`} onClick={handleAcceptClick} disabled={!profile.is_verified}>
                {isOutOfScope ? 'Request Pending Approval' : `Accept Job (R${job.consultant_payout})`}
              </button>
            )}
            {(job.status === 'active' || job.status === 'qa_failed') && (
              <button className="btn btn-primary" onClick={handleWorkSubmit} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Submit for QA'}
              </button>
            )}
          </div>
        </div>
        {showCancelOptions && (
          <div style={{padding: '16px', background: 'var(--bg)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <div style={{color: 'var(--red)', fontWeight: 600}}>Abandon Assignment</div>
            <div style={{fontSize: '13px'}}>Are you sure? You must provide a reason. Note: You cannot abandon a job if it is within {settings?.max_cancellation_window_hours || 12} hours of the deadline.</div>
            <select className="form-input" value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
              <option value="">-- Select Reason --</option>
              <option value="Personal Emergency">Personal Emergency</option>
              <option value="Underestimated Complexity">Underestimated Complexity</option>
              <option value="Technical Issues">Technical Issues</option>
              <option value="Other">Other</option>
            </select>
            <button 
              className="btn btn-primary" 
              style={{background: 'var(--red)', alignSelf: 'flex-start'}} 
              onClick={() => {
                const deadline = new Date(job.consultant_deadline || job.deadline);
                const windowHrs = settings?.max_cancellation_window_hours || 12;
                if ((deadline - new Date()) < windowHrs * 3600000) {
                  toast.error(`Cannot cancel within ${windowHrs} hours of deadline.`);
                  return;
                }
                if (!cancelReason) return toast.error("Please provide a reason.");
                onCancel(job, cancelReason);
              }}
            >
              Confirm Abandonment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConsultantPortal() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(profile?.id);
  const { jobs, loading: jobsLoading } = useJobs(profile?.role, profile?.id);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('board');
  const [settings, setSettings] = useState({});

  React.useEffect(() => {
    supabase.from('system_settings').select('*').then(({data}) => {
      if (data) {
        const s = {};
        data.forEach(d => { s[d.setting_key] = d.setting_value });
        setSettings(s);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAcceptJob = async (job) => {
    if (!profile) return;
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'active', consultant_id: profile.id })
        .eq('id', job.id);
      
      if (error) throw error;
      toast.success("Job accepted!");
      setSelectedJob(null);
    } catch (err) {
      toast.error('Error accepting job: ' + err.message);
    }
  };

  const handleCancelJob = async (job, reason) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'paid', consultant_id: null, cancellation_reason: reason })
        .eq('id', job.id);
      
      if (error) throw error;
      toast.success("Job assignment cancelled.");
      setSelectedJob(null);
    } catch (err) {
      toast.error('Error cancelling job: ' + err.message);
    }
  };

  const handleRequestScope = async (job) => {
    if (!profile) return;
    try {
      // Create a pending job request
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'pending', consultant_id: profile.id }) // pending means it's held for them pending admin approval
        .eq('id', job.id);
      
      if (error) throw error;
      toast.success("Job request sent to Admin for scope approval.");
      setSelectedJob(null);
    } catch (err) {
      toast.error('Error requesting job: ' + err.message);
    }
  };

  const handleSubmitWork = async (job, file, notes) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${job.job_ref}_submission_${Date.now()}.${fileExt}`;
      const filePath = `${job.job_ref}/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('work_submissions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // We append the consultant QA notes if provided, otherwise leave as is.
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'submitted', 
          submission_url: filePath, 
          submitted_at: new Date().toISOString(),
          qa_notes: notes ? `Consultant Note: ${notes}` : job.qa_notes 
        })
        .eq('id', job.id);
      
      if (error) throw error;
      toast.success("Work submitted successfully for QA!");
      setSelectedJob(null);

      // Send email to admin
      sendEmail('contact@gabriel.academy.co.za', 'Work Submitted for QA', EmailTemplates.workSubmitted(job.job_ref, profile.display_name));

    } catch (err) {
      toast.error('Error submitting work: ' + err.message);
    }
  };

  if (profileLoading || jobsLoading) return <div className="empty"><span className="spinner"></span></div>;

  if (profile && !profile.is_verified) {
    return (
      <div id="app-shell">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">GA</div>
            <div>
              <div className="brand-name">Gabriel Academics</div>
              <div className="brand-role">Consultant Portal</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="user-chip">
              <div className="user-av">{profile?.display_name?.charAt(0) || 'C'}</div>
              <div className="user-name">{profile?.display_name || 'Consultant'}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
        <div className="layout" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)'}}>
          <div className="card-box" style={{maxWidth: '500px', textAlign: 'center', padding: '48px 32px', margin: 'auto', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)'}}>
            <div style={{width: '64px', height: '64px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h2 style={{fontSize: '24px', marginBottom: '12px', fontWeight: 600}}>Verification Pending</h2>
            <p style={{color: 'var(--muted)', lineHeight: '1.6', fontSize: '15px'}}>
              Your account is currently under review by the Gabriel Academics administration team. 
              You will gain access to the mission board once your credentials have been verified.
            </p>
            <div style={{marginTop: '24px', padding: '12px', background: 'rgba(59,130,246,0.1)', color: 'var(--blue)', borderRadius: '8px', fontSize: '13px', fontWeight: 500}}>
              Please keep an eye on your inbox for your verification email.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const availableJobs = jobs.filter(j => j.status === 'posted');
  const myActiveJobs = jobs.filter(j => j.status === 'active' || j.status === 'pending' || j.status === 'qa_failed' || j.status === 'submitted');
  const historyJobs = jobs.filter(j => j.status === 'delivered' || j.status === 'completed');

  return (
    <div id="app-shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">GA</div>
          <div>
            <div className="brand-name">Gabriel Academics</div>
            <div className="brand-role">Consultant Portal</div>
          </div>
        </div>
        <div className="topbar-right">
          <NotificationBell 
            notifications={notifications} 
            unreadCount={unreadCount} 
            markAsRead={markAsRead} 
            markAllAsRead={markAllAsRead} 
          />
          <div className="user-chip">
            <div className="user-av">{profile?.display_name?.charAt(0) || 'C'}</div>
            <div className="user-name">{profile?.display_name || 'Consultant'}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
      
      <div className="layout">
        <div className="sidebar">
          <div className="nav-section">
            <div className="nav-label">Main Menu</div>
            <div className={`nav-item ${activeTab === 'board' ? 'active' : ''}`} onClick={() => setActiveTab('board')}>Available Jobs</div>
            <div className={`nav-item ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>My Active Jobs</div>
            <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Job History</div>
            <div className={`nav-item ${activeTab === 'earnings' ? 'active' : ''}`} onClick={() => setActiveTab('earnings')}>Earnings & Payouts</div>
          </div>
        </div>
        
        <div className="main">
          {activeTab === 'board' && (
            <>
              <div className="page-header">
                <div className="page-title">Mission Board</div>
                <div className="page-sub">Browse and accept available academic requests.</div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '24px'}}>
                <div>
                  {availableJobs.length === 0 ? (
                    <div className="card-box empty" style={{padding: '32px'}}>No new jobs available at the moment.</div>
                  ) : (
                    availableJobs.map(job => (
                      <div key={job.id} className="card-box" style={{cursor: 'pointer', transition: 'border 0.15s'}} onClick={() => setSelectedJob(job)}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                          <div className="badge badge-posted">POSTED</div>
                          <div style={{fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace'}}>{job.job_ref}</div>
                        </div>
                        <div style={{fontSize: '14px', fontWeight: 600, marginBottom: '6px'}}>{job.title}</div>
                        <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '12px'}}>{job.subject} · {job.level} · {job.pages} pages</div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px'}}>
                          <div style={{fontSize: '12px'}}>Due: <strong>{new Date(job.consultant_deadline || job.deadline).toLocaleDateString()}</strong></div>
                          <div style={{fontSize: '14px', fontWeight: 600, color: 'var(--gold)'}}>R{job.consultant_payout}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'active' && (
            <>
              <div className="page-header">
                <div className="page-title">My Active Jobs</div>
                <div className="page-sub">Jobs you are currently working on.</div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '24px'}}>
                <div>
                  {myActiveJobs.length === 0 ? (
                    <div className="card-box empty" style={{padding: '32px'}}>You have no active assignments.</div>
                  ) : (
                    myActiveJobs.map(job => (
                      <div key={job.id} className="card-box" style={{cursor: 'pointer', borderColor: job.status === 'qa_failed' ? 'var(--red)' : 'var(--blue)'}} onClick={() => setSelectedJob(job)}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                          <div className={`badge ${job.status === 'qa_failed' ? 'badge-qa_failed' : job.status === 'submitted' ? 'badge-submitted' : 'badge-active'}`}>
                            {job.status === 'qa_failed' ? 'QA FAILED - REVISION NEEDED' : job.status === 'submitted' ? 'SUBMITTED - QA PENDING' : 'IN PROGRESS'}
                          </div>
                          <div style={{fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace'}}>{job.job_ref}</div>
                        </div>
                        <div style={{fontSize: '14px', fontWeight: 600, marginBottom: '6px'}}>{job.title}</div>
                        <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '12px'}}>Due: {new Date(job.consultant_deadline || job.deadline).toLocaleString()}</div>
                        {(job.status !== 'qa_failed' && job.status !== 'submitted') && <div className="prog-wrap"><div className="prog-fill" style={{width: '30%'}}></div></div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <>
              <div className="page-header">
                <div className="page-title">Job History</div>
                <div className="page-sub">Jobs you have successfully completed.</div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '24px'}}>
                <div>
                  {historyJobs.length === 0 ? (
                    <div className="card-box empty" style={{padding: '32px'}}>You haven't completed any jobs yet.</div>
                  ) : (
                    historyJobs.map(job => (
                      <div key={job.id} className="card-box" style={{borderColor: 'var(--green)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                          <div className="badge badge-completed">COMPLETED</div>
                          <div style={{fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace'}}>{job.job_ref}</div>
                        </div>
                        <div style={{fontSize: '14px', fontWeight: 600, marginBottom: '6px'}}>{job.title}</div>
                        <div style={{fontSize: '12px', color: 'var(--muted)'}}>Earned: <span style={{color: 'var(--gold)', fontWeight: 600}}>R{job.consultant_payout}</span></div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'earnings' && (
            <>
              <div className="page-header">
                <div className="page-title">Earnings & Payouts</div>
                <div className="page-sub">Track your financial performance and wallet balance.</div>
              </div>
              <div className="card-box" style={{borderColor: 'var(--gold)'}}>
                <div style={{fontSize: '14px', color: 'var(--gold)', marginBottom: '4px'}}>Current Wallet Balance</div>
                <div style={{fontSize: '32px', fontWeight: 700, color: 'var(--gold)'}}>R{profile.wallet_balance || 0}</div>
                <div style={{fontSize: '12px', color: 'var(--muted)', marginTop: '8px'}}>Payouts are processed automatically when the admin approves them.</div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedJob && (
        <JobModal job={selectedJob} profile={profile} onClose={() => setSelectedJob(null)} onAccept={handleAcceptJob} onSubmitWork={handleSubmitWork} onRequestScope={handleRequestScope} onCancel={handleCancelJob} settings={settings} />
      )}
    </div>
  );
}
