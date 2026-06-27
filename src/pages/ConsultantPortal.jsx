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

            {job.status === 'pending' && (
              <div className="card-box" style={{borderColor: 'var(--blue)', background: 'rgba(59,130,246,0.05)', marginTop: '20px'}}>
                <div style={{color: 'var(--blue)', fontWeight: 600, marginBottom: '4px'}}>Awaiting Admin Approval</div>
                <div style={{fontSize: '13px'}}>You have requested this job. It is currently awaiting scope approval from the administration team before you can begin work.</div>
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

            {['submitted', 'qa_failed', 'delivered', 'completed'].includes(job.status) && (
              <div style={{marginTop: '20px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card)'}}>
                <div style={{fontWeight: 600, marginBottom: '16px', color: 'var(--blue)'}}>Job Timeline</div>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div style={{display: 'flex', gap: '12px'}}>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                      <div style={{width: '10px', height: '10px', borderRadius: '50%', background: 'var(--blue)', zIndex: 2}}></div>
                      <div style={{width: '2px', flex: 1, background: 'var(--border)', minHeight: '30px', marginTop: '4px'}}></div>
                    </div>
                    <div style={{marginTop: '-3px'}}>
                      <div style={{fontSize: '12px', color: 'var(--muted)'}}>{new Date(job.created_at).toLocaleString()}</div>
                      <div style={{fontSize: '13px', fontWeight: 500}}>Job Posted</div>
                    </div>
                  </div>
                  
                  {job.submitted_at && (
                    <div style={{display: 'flex', gap: '12px'}}>
                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        <div style={{width: '10px', height: '10px', borderRadius: '50%', background: 'var(--gold)', zIndex: 2}}></div>
                        {(job.status === 'delivered' || job.status === 'completed') && (
                          <div style={{width: '2px', flex: 1, background: 'var(--border)', minHeight: '30px', marginTop: '4px'}}></div>
                        )}
                      </div>
                      <div style={{marginTop: '-3px'}}>
                        <div style={{fontSize: '12px', color: 'var(--muted)'}}>{new Date(job.submitted_at).toLocaleString()}</div>
                        <div style={{fontSize: '13px', fontWeight: 500}}>Work Submitted for QA</div>
                        {job.qa_notes && <div style={{fontSize: '12px', color: 'var(--muted)', marginTop: '4px'}}>Notes: {job.qa_notes}</div>}
                      </div>
                    </div>
                  )}

                  {job.status === 'delivered' && (
                    <div style={{display: 'flex', gap: '12px'}}>
                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        <div style={{width: '10px', height: '10px', borderRadius: '50%', background: 'var(--green)', zIndex: 2}}></div>
                      </div>
                      <div style={{marginTop: '-3px'}}>
                        <div style={{fontSize: '13px', fontWeight: 500, color: 'var(--green)'}}>QA Passed - Delivered to Client</div>
                      </div>
                    </div>
                  )}

                  {job.status === 'completed' && (
                    <div style={{display: 'flex', gap: '12px'}}>
                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        <div style={{width: '10px', height: '10px', borderRadius: '50%', background: 'var(--green)', zIndex: 2}}></div>
                      </div>
                      <div style={{marginTop: '-3px'}}>
                        <div style={{fontSize: '13px', fontWeight: 500, color: 'var(--green)'}}>Job Completed & Payout Approved</div>
                      </div>
                    </div>
                  )}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(profile?.id);
  const { jobs, loading: jobsLoading } = useJobs(profile?.role, profile?.id);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('board');
  const [profileForm, setProfileForm] = useState({ phone: '', display_name: '', linkedin_url: '' });
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', branch_code: '', account_type: 'Checking' });
  const [requestScopeLevel, setRequestScopeLevel] = useState('');
  const [requestScopeSubjects, setRequestScopeSubjects] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showScopeDetails, setShowScopeDetails] = useState(false);
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

  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        phone: profile.phone || '',
        display_name: profile.display_name || '',
        linkedin_url: profile.linkedin_url || ''
      });
      if (profile.bank_details) {
        setBankForm({
          bank_name: profile.bank_details.bank_name || '',
          account_number: profile.bank_details.account_number || '',
          branch_code: profile.bank_details.branch_code || '',
          account_type: profile.bank_details.account_type || 'Checking'
        });
      }
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.from('profiles').update({
        phone: profileForm.phone,
        display_name: profileForm.display_name,
        linkedin_url: profileForm.linkedin_url
      }).eq('id', profile.id);
      if (error) throw error;
      toast.success('Personal details saved!');
    } catch (err) {
      toast.error('Error saving profile: ' + err.message);
    }
  };

  const handleSaveBank = async () => {
    try {
      const { error } = await supabase.from('profiles').update({
        bank_details: bankForm
      }).eq('id', profile.id);
      if (error) throw error;
      toast.success('Banking details saved!');
    } catch (err) {
      toast.error('Error saving banking details: ' + err.message);
    }
  };

  const handleSendScopeRequest = async () => {
    if (!requestScopeLevel || requestScopeSubjects.length === 0) return toast.error('Please select a level and at least one subject.');
    try {
      const payload = {
        levels: requestScopeLevel,
        subjects: requestScopeSubjects.join(', '),
        requested_at: new Date().toISOString()
      };
      const { error } = await supabase.from('profiles').update({ scope_requests: payload }).eq('id', profile.id);
      if (error) throw error;
      
      // Notify Admin
      await supabase.rpc('notify_admins', {
        p_title: 'New Scope Request',
        p_body: `${profile.display_name} has requested new subjects/levels.`,
        p_link: '/admin'
      });
      
      toast.success('Request sent to Admin!');
      setRequestScopeLevel('');
      setRequestScopeSubjects([]);
      profile.scope_requests = payload;
    } catch (err) {
      toast.error('Error sending request: ' + err.message);
    }
  };

  const handleUploadQual = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}_qual_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('qualifications').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { error: updateError } = await supabase.from('profiles').update({
        qualifications_url: fileName
      }).eq('id', profile.id);
      if (updateError) throw updateError;
      
      toast.success('Qualification uploaded!');
      // Update local profile representation
      profile.qualifications_url = fileName;
    } catch (err) {
      toast.error('Error uploading file: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

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
      
      // Notify Admins
      await supabase.rpc('notify_admins', {
        p_title: 'Job Accepted',
        p_body: `${profile.display_name} has accepted the job ${job.job_ref}.`,
        p_link: '/admin'
      });

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
          <div className="brand" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} style={{background:'none',border:'none',color:'var(--text)',alignItems:'center',cursor:'pointer',padding:0}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
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
  const myActiveJobs = jobs.filter(j => j.status === 'pending' || j.status === 'active' || j.status === 'qa_failed' || j.status === 'submitted');
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
          <div className="user-chip" onClick={() => setActiveTab('profile')} style={{cursor: 'pointer'}}>
            <div className="user-av">{profile?.display_name?.charAt(0) || 'C'}</div>
            <div className="user-name">{profile?.display_name || 'Consultant'}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
      
      <div className="layout">
        {isMobileMenuOpen && <div className="mobile-menu-overlay open" onClick={() => setIsMobileMenuOpen(false)}></div>}
        <div className={"sidebar " + (isMobileMenuOpen ? "open" : "")}>
          <div className="nav-section">
            <div className="nav-label">Main Menu</div>
            <div className={`nav-item ${activeTab === 'board' ? 'active' : ''}`} onClick={() => setActiveTab('board')}>Available Jobs</div>
            <div className={`nav-item ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>My Active Jobs</div>
            <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Job History</div>
            <div className={`nav-item ${activeTab === 'earnings' ? 'active' : ''}`} onClick={() => setActiveTab('earnings')}>Earnings & Payouts</div>
            
            <div className="nav-label" style={{marginTop: '24px'}}>Settings</div>
            <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>My Profile</div>
          </div>
        </div>
        
        <div className="main">
          {profile?.is_verified && (
            <div style={{background: 'rgba(59,130,246,0.1)', border: '1px solid var(--blue)', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
              <div style={{fontSize: '16px', fontWeight: 700, color: 'var(--blue)', marginBottom: '8px'}}>Welcome to the Gabriel Academics Team, {profile.display_name}!</div>
              <div style={{fontSize: '13px', color: 'var(--text)', marginBottom: '12px'}}>Your consultant application has been verified. You are now cleared to accept jobs on the Mission Board.</div>
              <div style={{display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '12px'}}>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px'}}>Approved Levels</div>
                  <div style={{fontSize: '13px', fontWeight: 500}}>{profile.approved_levels?.join(', ') || profile.academic_level || 'General'}</div>
                </div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px'}}>Approved Subjects</div>
                  <div style={{fontSize: '13px', fontWeight: 500}}>{profile.approved_subjects?.join(', ') || profile.subjects || 'General'}</div>
                </div>
              </div>
              <div style={{background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{fontSize: '16px'}}>⚠️</span> 
                <span>Action Required: Please ensure your profile is fully up to date. You may still need to provide your Banking Details or verify your Qualifications.</span>
              </div>
            </div>
          )}

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

          {activeTab === 'profile' && (
            <>
              <div className="page-header">
                <div className="page-title">My Profile</div>
                <div className="page-sub">Manage your personal information, credentials, and settings.</div>
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start'}}>
                {/* Column 1 */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                  
                  {/* Personal Details */}
                  <div className="card-box">
                    <div style={{fontWeight: 600, fontSize: '16px', marginBottom: '16px', color: 'var(--gold)'}}>Personal Details</div>
                    <div className="form-group">
                      <label className="form-label">Display Name</label>
                      <input className="form-input" value={profileForm.display_name} onChange={e => setProfileForm({...profileForm, display_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input className="form-input" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">LinkedIn URL</label>
                      <input className="form-input" value={profileForm.linkedin_url} onChange={e => setProfileForm({...profileForm, linkedin_url: e.target.value})} />
                    </div>
                    <button className="btn btn-primary" onClick={handleSaveProfile}>Save Details</button>
                  </div>

                  {/* Academic Credentials */}
                  <div className="card-box">
                    <div style={{fontWeight: 600, fontSize: '16px', marginBottom: '16px', color: 'var(--gold)'}}>Academic Credentials</div>
                    <div style={{marginBottom: '16px'}}>
                      <div className="form-label">Current Qualification</div>
                      <div style={{fontWeight: 500}}>{profile.qualification || 'Not provided'}</div>
                    </div>
                    
                    {profile.qualifications_url && (
                      <div style={{marginBottom: '16px', padding: '12px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)'}}>
                        <div style={{fontSize: '13px', fontWeight: 600}}>Uploaded Document:</div>
                        <a href={`${supabase.storage.from('qualifications').getPublicUrl(profile.qualifications_url).data.publicUrl}`} target="_blank" rel="noreferrer" style={{color: 'var(--blue)', fontSize: '13px', wordBreak: 'break-all'}}>{profile.qualifications_url}</a>
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label className="form-label">Upload New Credential (PDF/IMG)</label>
                      <input type="file" className="form-input" onChange={handleUploadQual} disabled={isUploading} />
                      {isUploading && <div style={{fontSize: '12px', color: 'var(--blue)', marginTop: '4px'}}>Uploading...</div>}
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                  
                  {/* Subjects & Levels */}
                  <div className="card-box">
                    <div style={{fontWeight: 600, fontSize: '16px', marginBottom: '16px', color: 'var(--gold)'}}>Subjects & Levels</div>
                    
                    <div style={{marginBottom: '16px', padding: '12px', background: 'rgba(59,130,246,0.05)', border: '1px solid var(--blue)', borderRadius: '8px'}}>
                      <div style={{fontSize: '12px', color: 'var(--blue)', fontWeight: 600, marginBottom: '8px'}}>APPROVED LEVELS</div>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                        {Array.isArray(profile.approved_levels) && profile.approved_levels.length > 0 ? profile.approved_levels.map(s => (
                          <div key={s} className="badge" style={{background: 'var(--blue)', color: 'white'}}>{s}</div>
                        )) : <div style={{fontSize: '13px', color: 'var(--muted)'}}>{typeof profile.approved_levels === 'string' ? profile.approved_levels : 'None'}</div>}
                      </div>
                      
                      <div style={{fontSize: '12px', color: 'var(--blue)', fontWeight: 600, marginTop: '16px', marginBottom: '8px'}}>APPROVED SUBJECTS</div>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                        {Array.isArray(profile.approved_subjects) && profile.approved_subjects.length > 0 ? profile.approved_subjects.map(s => (
                          <div key={s} className="badge" style={{background: 'var(--blue)', color: 'white'}}>{s}</div>
                        )) : <div style={{fontSize: '13px', color: 'var(--muted)'}}>{typeof profile.approved_subjects === 'string' ? profile.approved_subjects : 'None'}</div>}
                      </div>
                    </div>
                    
                    <div style={{borderTop: '1px solid var(--border)', paddingTop: '16px'}}>
                      <div style={{fontWeight: 600, fontSize: '14px', marginBottom: '12px'}}>Apply for More Subjects/Levels</div>
                      <div className="form-note" style={{marginBottom: '12px'}}>Requests will be reviewed by the Administration team.</div>
                      
                      {profile.scope_requests && (
                        <div style={{marginBottom: '16px', padding: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid var(--gold)', borderRadius: '6px', fontSize: '13px', color: 'var(--gold)'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div>You have a pending request submitted on {new Date(profile.scope_requests.requested_at).toLocaleDateString()} at {new Date(profile.scope_requests.requested_at).toLocaleTimeString()}.</div>
                            <button className="btn btn-ghost btn-xs" onClick={() => setShowScopeDetails(!showScopeDetails)} style={{color: 'var(--gold)'}}>
                              {showScopeDetails ? 'Hide Details' : 'View Details'}
                            </button>
                          </div>
                          {showScopeDetails && (
                            <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(245,158,11,0.3)', color: 'var(--text)'}}>
                              <div style={{marginBottom: '8px'}}><strong>Levels Requested:</strong> {profile.scope_requests.levels}</div>
                              <div><strong>Subjects Requested:</strong> {profile.scope_requests.subjects}</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="form-group">
                        <label className="form-label">Select Academic Level</label>
                        <select className="form-input" value={requestScopeLevel} onChange={e => { setRequestScopeLevel(e.target.value); setRequestScopeSubjects([]); }}>
                          <option value="">-- Choose Level --</option>
                          {(settings.academic_taxonomy || []).map(tax => (
                            <option key={tax.level} value={tax.level}>{tax.level}</option>
                          ))}
                        </select>
                      </div>
                      
                      {requestScopeLevel && (
                        <div className="form-group">
                          <label className="form-label">Select Subjects</label>
                          <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)'}}>
                            {((settings.academic_taxonomy || []).find(t => t.level === requestScopeLevel)?.subjects || []).map(sub => {
                              const isSelected = requestScopeSubjects.includes(sub);
                              return (
                                <button 
                                  key={sub}
                                  className="btn btn-sm"
                                  style={{
                                    background: isSelected ? 'var(--blue)' : 'transparent',
                                    color: isSelected ? 'white' : 'var(--muted)',
                                    border: '1px solid ' + (isSelected ? 'var(--blue)' : 'var(--border)')
                                  }}
                                  onClick={() => {
                                    if (isSelected) setRequestScopeSubjects(requestScopeSubjects.filter(s => s !== sub));
                                    else setRequestScopeSubjects([...requestScopeSubjects, sub]);
                                  }}
                                >
                                  {sub}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <button className="btn btn-sm" style={{background: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)'}} onClick={handleSendScopeRequest} disabled={!requestScopeLevel || requestScopeSubjects.length === 0}>Submit Request</button>
                    </div>
                  </div>

                  {/* Banking Details */}
                  <div className="card-box">
                    <div style={{fontWeight: 600, fontSize: '16px', marginBottom: '16px', color: 'var(--gold)'}}>Banking Details</div>
                    <div className="form-group">
                      <label className="form-label">Bank Name</label>
                      <input className="form-input" value={bankForm.bank_name} onChange={e => setBankForm({...bankForm, bank_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Number</label>
                      <input className="form-input" value={bankForm.account_number} onChange={e => setBankForm({...bankForm, account_number: e.target.value})} />
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                      <div className="form-group">
                        <label className="form-label">Branch Code</label>
                        <input className="form-input" value={bankForm.branch_code} onChange={e => setBankForm({...bankForm, branch_code: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Account Type</label>
                        <select className="form-input" value={bankForm.account_type} onChange={e => setBankForm({...bankForm, account_type: e.target.value})}>
                          <option value="Checking">Checking / Cheque</option>
                          <option value="Savings">Savings</option>
                        </select>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSaveBank}>Securely Save Bank Details</button>
                  </div>
                  
                </div>
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
