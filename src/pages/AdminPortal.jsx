import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/useProfile';
import { useJobs } from '../lib/useJobs';
import { useMessages } from '../lib/useMessages';
import { sendEmail, EmailTemplates } from '../lib/emailService';
import toast from 'react-hot-toast';
import { useNotifications } from '../lib/useNotifications';
import { NotificationBell } from '../components/NotificationBell';

function getProfileName(profile) {
  if (!profile) return null;
  if (Array.isArray(profile)) {
    return profile[0]?.display_name || profile[0]?.email;
  }
  return profile.display_name || profile.email;
}

function AdminJobModal({ job, profile, onClose, onPost, onPassQA, onFailQA, onUpdateStatus, onWithdraw }) {
  const { messages, sendMessage } = useMessages(job.id, profile.id);
  const [msgText, setMsgText] = useState('');
  const [msgTarget, setMsgTarget] = useState('client'); // 'client' or 'consultant'
  const [payoutRate, setPayoutRate] = useState(70);
  const [consultantDeadline, setConsultantDeadline] = useState('');
  const [qaNotes, setQaNotes] = useState('');
  const [review, setReview] = useState(null);
  const [editBudget, setEditBudget] = useState(job.client_budget || 0);
  const [moderatedInstructions, setModeratedInstructions] = useState(job.instructions || '');
  const [postChecks, setPostChecks] = useState({ deadline: false, moderation: false, profit: false });

  useEffect(() => {
    if (job.status === 'delivered') {
      supabase.from('reviews').select('*').eq('job_id', job.id).single().then(({data}) => {
        if (data) setReview(data);
      });
    }
    
    // Set default consultant deadline to 24h before client deadline
    if (job.deadline && !consultantDeadline) {
      const d = new Date(job.deadline);
      d.setHours(d.getHours() - 24);
      // format for datetime-local input
      setConsultantDeadline(d.toISOString().slice(0, 16));
    }
  }, [job.id, job.status, job.deadline]);

  const handleSend = () => {
    if (!msgText.trim()) return;
    const recipientId = msgTarget === 'client' ? job.client_id : job.consultant_id;
    if (!recipientId) return alert('No user assigned to this role yet.');
    sendMessage(msgText, recipientId);
    setMsgText('');
  };

  const handleDownloadWork = async () => {
    try {
      const { data, error } = await supabase.storage.from('work_submissions').createSignedUrl(job.submission_url, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      alert('Error downloading file: ' + err.message);
    }
  };

  const handleCounterOffer = async () => {
    if (editBudget === job.client_budget) return alert('Budget has not changed.');
    try {
      const { error } = await supabase.from('jobs').update({ client_budget: editBudget }).eq('id', job.id);
      if (error) throw error;
      
      // Send message to client
      const msg = `We have reviewed your request and made a counter-offer. The updated budget is R${editBudget}. Please review and proceed to payment if you agree.`;
      await sendMessage(msg, job.client_id);
      
      toast.success('Counter offer sent!');
      // Update local job state if needed, or rely on parent reload
      job.client_budget = editBudget;
    } catch (err) {
      toast.error('Error sending counter offer: ' + err.message);
    }
  };

  const clientMessages = messages.filter(m => m.sender_id === job.client_id || m.recipient_id === job.client_id);
  const consultantMessages = messages.filter(m => m.sender_id === job.consultant_id || m.recipient_id === job.consultant_id);
  const activeMessages = msgTarget === 'client' ? clientMessages : consultantMessages;

  return (
    <div className="modal-bg">
      <div className="modal" style={{maxWidth: '900px'}}>
        <div className="modal-head">
          <div className="modal-title">Admin Review: {job.job_ref}</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{display: 'flex', gap: '20px', alignItems: 'flex-start'}}>
          
          <div style={{flex: 1}}>
            <div className="card-box">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px'}}>
                <div className="card-box-title" style={{marginBottom: 0}}>{job.title}</div>
                <div style={{textAlign: 'right', fontSize: '12px', color: 'var(--muted)'}}>
                  <div>Client: <strong style={{color: 'var(--text)'}}>{getProfileName(job.client) || 'Unknown Client'}</strong></div>
                  {job.consultant_id && <div>Consultant: <strong style={{color: 'var(--text)'}}>{getProfileName(job.consultant) || 'Unknown Consultant'}</strong></div>}
                </div>
              </div>
              <div className="two-col" style={{marginBottom: 0}}>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Client Original Deadline</div>
                  <div style={{fontSize: '13px', fontWeight: 600}}>{new Date(job.deadline).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Client Confirmed Deadline</div>
                  <div style={{fontSize: '13px', fontWeight: 600, color: 'var(--green)'}}>
                    {job.client_confirmed_deadline ? new Date(job.client_confirmed_deadline).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="two-col" style={{marginBottom: 0, marginTop: '16px'}}>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Pages</div>
                  <div style={{fontSize: '13px'}}>{job.pages}</div>
                </div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Status</div>
                  <div style={{fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span className={`badge badge-${job.status}`}>{job.status.toUpperCase()}</span>
                    <select 
                      className="form-input" 
                      style={{padding: '4px 8px', fontSize: '11px', height: 'auto', width: 'auto'}}
                      value={job.status}
                      onChange={(e) => onUpdateStatus(job.id, e.target.value)}
                    >
                      <option value="new">Set NEW</option>
                      <option value="paid">Set PAID</option>
                      <option value="posted">Set POSTED</option>
                      <option value="active">Set ACTIVE</option>
                      <option value="pending">Set PENDING</option>
                      <option value="submitted">Set SUBMITTED</option>
                      <option value="qa_failed">Set QA FAILED</option>
                      <option value="delivered">Set DELIVERED</option>
                      <option value="completed">Set COMPLETED</option>
                      <option value="cancelled">Set CANCELLED</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Client Budget</div>
                  {job.status === 'new' ? (
                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                      <div style={{display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden'}}>
                        <span style={{padding: '4px 8px', background: 'var(--card)', color: 'var(--muted)', fontSize: '12px', borderRight: '1px solid var(--border)'}}>R</span>
                        <input 
                          type="number" 
                          style={{border: 'none', background: 'transparent', width: '80px', padding: '4px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', outline: 'none'}} 
                          value={editBudget} 
                          onChange={e => setEditBudget(parseFloat(e.target.value) || 0)} 
                        />
                      </div>
                      <button className="btn btn-ghost btn-xs" onClick={handleCounterOffer}>Counter</button>
                    </div>
                  ) : (
                    <div style={{fontSize: '13px', fontWeight: 600}}>R{job.client_budget}</div>
                  )}
                </div>
              </div>
              <div style={{fontSize: '12px', marginTop: '12px', background: 'var(--bg)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)'}}>
                <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Client Original Instructions</div>
                {job.instructions}
              </div>
            </div>

            {review && (
              <div className="card-box" style={{borderColor: 'var(--gold)', background: 'rgba(245,158,11,.05)'}}>
                <div className="card-box-title" style={{color: 'var(--gold)'}}>Client Review</div>
                <div style={{fontSize: '16px', marginBottom: '4px'}}>{"⭐".repeat(review.rating)}</div>
                <div style={{fontSize: '13px'}}>{review.comment}</div>
              </div>
            )}

            {(job.status === 'new' || job.status === 'paid') && (
              <div className="card-box">
                <div style={{fontWeight: 600, marginBottom: '12px'}}>Post to Consultants</div>
                {job.status === 'paid' && (
                  <div style={{color: 'var(--green)', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <span style={{fontSize: '18px'}}>✅</span> Client has paid for this request. It is safe to post.
                  </div>
                )}
                {job.status === 'new' && (
                  <div style={{color: 'var(--gold)', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <span style={{fontSize: '18px'}}>⚠️</span> Client has not paid yet. You can post, but wait for payment before delivering.
                  </div>
                )}
                <div className="two-col" style={{marginTop: '12px'}}>
                  <div className="form-group">
                    <label className="form-label">Consultant Payout Percentage (%)</label>
                    <input type="number" min="10" max="90" className="form-input" value={payoutRate} onChange={e => setPayoutRate(e.target.value)} />
                    <div className="form-note">Gabriel Margin: {100 - payoutRate}%</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consultant Strict Deadline</label>
                    <input type="datetime-local" className="form-input" value={consultantDeadline} onChange={e => setConsultantDeadline(e.target.value)} />
                    <div className="form-note">Must submit before this date.</div>
                  </div>
                </div>
                <div className="two-col">
                  <div className="stat-card">
                    <div className="stat-label">Consultant Gets</div>
                    <div className="stat-val">R{(job.client_budget * (payoutRate/100)).toFixed(2)}</div>
                  </div>
                  <div className="stat-card" style={{background: 'rgba(16,185,129,0.1)', color: 'var(--green)'}}>
                    <div className="stat-label" style={{color: 'var(--green)'}}>Gabriel Profit</div>
                    <div className="stat-val" style={{color: 'var(--green)'}}>R{(job.client_budget * ((100 - payoutRate)/100)).toFixed(2)}</div>
                  </div>
                </div>

                <div style={{marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                  <div style={{fontSize: '11px', color: 'var(--gold)', fontWeight: 600}}>Admin Moderated Instructions (Shown to Consultant)</div>
                  <textarea 
                    className="form-input" 
                    style={{minHeight: '80px', fontSize: '12px', borderColor: 'var(--gold)'}} 
                    value={moderatedInstructions} 
                    onChange={e => setModeratedInstructions(e.target.value)}
                  ></textarea>
                </div>
                
                <div style={{marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px'}}>
                  <div style={{fontSize: '11px', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '4px'}}>Pre-flight Checklist</div>
                  <label style={{display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer'}}>
                    <input type="checkbox" style={{marginTop: '2px'}} checked={postChecks.deadline} onChange={e => setPostChecks({...postChecks, deadline: e.target.checked})} />
                    <span style={{fontSize: '12px'}}>I confirm the strict deadline has been set accurately with sufficient buffer.</span>
                  </label>
                  <label style={{display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer'}}>
                    <input type="checkbox" style={{marginTop: '2px'}} checked={postChecks.moderation} onChange={e => setPostChecks({...postChecks, moderation: e.target.checked})} />
                    <span style={{fontSize: '12px'}}>I have reviewed and moderated the client instructions for clarity and appropriateness.</span>
                  </label>
                  <label style={{display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer'}}>
                    <input type="checkbox" style={{marginTop: '2px'}} checked={postChecks.profit} onChange={e => setPostChecks({...postChecks, profit: e.target.checked})} />
                    <span style={{fontSize: '12px'}}>I confirm the payout percentage and resulting profitability margin are acceptable.</span>
                  </label>
                </div>
              </div>
            )}

            {(job.status === 'submitted' || job.status === 'qa_failed') && (
              <div className="card-box" style={{borderColor: 'var(--purple)'}}>
                <div style={{fontWeight: 600, marginBottom: '12px', color: 'var(--purple)'}}>QA Review</div>
                <div style={{marginBottom: '12px'}}>
                  <button onClick={handleDownloadWork} className="btn btn-primary btn-sm" style={{background: 'var(--purple)'}}>Download Submitted Work</button>
                </div>
                <div className="form-group">
                  <label className="form-label">QA Notes / Rejection Feedback</label>
                  <textarea className="form-input" value={qaNotes} onChange={e => setQaNotes(e.target.value)} placeholder="If failing QA, provide reasons here..."></textarea>
                </div>
              </div>
            )}
          </div>

          <div style={{flex: 1, border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '500px'}}>
            <div style={{display: 'flex', borderBottom: '1px solid var(--border)'}}>
              <div style={{flex: 1, padding: '12px', textAlign: 'center', cursor: 'pointer', fontWeight: 600, background: msgTarget === 'client' ? 'var(--card)' : 'transparent', borderBottom: msgTarget === 'client' ? '2px solid var(--blue)' : 'none'}} onClick={() => setMsgTarget('client')}>Chat with Client</div>
              <div style={{flex: 1, padding: '12px', textAlign: 'center', cursor: 'pointer', fontWeight: 600, background: msgTarget === 'consultant' ? 'var(--card)' : 'transparent', borderBottom: msgTarget === 'consultant' ? '2px solid var(--blue)' : 'none'}} onClick={() => setMsgTarget('consultant')}>Chat with Consultant</div>
            </div>
            
            <div style={{flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {msgTarget === 'consultant' && !job.consultant_id ? (
                <div style={{color: 'var(--muted)', fontSize: '12px', textAlign: 'center', marginTop: '20px'}}>No consultant assigned yet.</div>
              ) : activeMessages.length === 0 ? (
                <div style={{color: 'var(--muted)', fontSize: '12px', textAlign: 'center', marginTop: '20px'}}>No messages yet.</div>
              ) : (
                activeMessages.map(m => {
                  let senderName = m.sender_id === profile.id ? 'You' : (msgTarget === 'client' ? (getProfileName(job.client) || 'Client') : (getProfileName(job.consultant) || 'Consultant'));
                  return (
                  <div key={m.id} style={{alignSelf: m.sender_id === profile.id ? 'flex-end' : 'flex-start', background: m.sender_id === profile.id ? 'var(--blue)' : 'var(--card)', padding: '8px 12px', borderRadius: '8px', maxWidth: '80%', fontSize: '13px'}}>
                    <div style={{fontSize: '10px', opacity: 0.7, marginBottom: '4px'}}>{senderName}</div>
                    {m.body}
                  </div>
                )})
              )}
            </div>
            <div style={{padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px'}}>
              <input type="text" className="form-input" placeholder="Type a reply..." value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={msgTarget === 'consultant' && !job.consultant_id} />
              <button className="btn btn-primary" onClick={handleSend} disabled={msgTarget === 'consultant' && !job.consultant_id}>Send</button>
            </div>
          </div>

        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {(job.status === 'posted' || job.status === 'active') && (
            <button className="btn btn-ghost" style={{color: 'var(--red)'}} onClick={() => onWithdraw(job)}>Withdraw Job</button>
          )}
          {(job.status === 'new' || job.status === 'paid') && (
            <button 
              className="btn btn-primary" 
              disabled={!postChecks.deadline || !postChecks.moderation || !postChecks.profit}
              onClick={() => onPost(job, payoutRate, consultantDeadline, moderatedInstructions)}
            >
              Post Job to Mission Board
            </button>
          )}
          {(job.status === 'submitted' || job.status === 'qa_failed') && (
            <>
              <button className="btn btn-ghost" style={{color: 'var(--red)'}} onClick={() => onFailQA(job, qaNotes)}>Fail QA (Return to Consultant)</button>
              <button className="btn btn-primary" style={{background: 'var(--green)'}} onClick={() => onPassQA(job)}>Pass QA & Deliver</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UserProfileView({ user, onClose, onUpdate, adminProfile }) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // Action Modal State
  const [actionModal, setActionModal] = useState({ isOpen: false, action: null });
  const [actionReason, setActionReason] = useState('');
  const [actionComments, setActionComments] = useState('');

  useEffect(() => {
    fetchUserData();
  }, [user.id]);

  const fetchUserData = async () => {
    setLoading(true);
    // Fetch Jobs
    const roleCol = user.role === 'client' ? 'client_id' : 'consultant_id';
    const { data: jobsData } = await supabase.from('jobs').select('*').eq(roleCol, user.id).order('created_at', { ascending: false });
    
    let msgs = [];
    if (jobsData && jobsData.length > 0) {
      setJobs(jobsData);
      const jobIds = jobsData.map(j => j.id);
      // Fetch messages from these jobs where sender is this user
      const { data: msgData } = await supabase.from('messages')
        .select('*, jobs(title, job_ref)')
        .eq('sender_id', user.id)
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });
      if (msgData) msgs = msgData;
    } else {
      setJobs([]);
    }
    setMessages(msgs);
    setLoading(false);
  };

  const handleActionSubmit = async () => {
    if (!actionReason) return alert('Please select a reason.');
    
    const action = actionModal.action;
    
    // Log the action first
    await supabase.from('admin_logs').insert({
      admin_id: adminProfile?.id,
      target_user_id: user.id,
      action: action,
      reason: actionReason,
      comments: actionComments
    });

    if (action === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) alert('Error: ' + error.message);
      else alert('Password reset email sent to ' + user.email);
    } 
    else if (action === 'suspend' || action === 'activate') {
      const newStatus = action === 'activate';
      const { error } = await supabase.from('profiles').update({ is_verified: newStatus }).eq('id', user.id);
      if (!error) onUpdate({ ...user, is_verified: newStatus });
      else alert('Error: ' + error.message);
    }
    else if (action === 'archive') {
      const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', user.id);
      if (!error) {
        alert('Account Archived.');
        onUpdate({ ...user, is_active: false });
        onClose(); // return to list
        return; // prevent modal close logic below since we unmounted
      } else {
        alert('Error: ' + error.message);
      }
    }
    
    setActionModal({ isOpen: false, action: null });
    setActionReason('');
    setActionComments('');
  };

  const totalValue = user.role === 'client' 
    ? jobs.reduce((sum, j) => sum + (j.client_budget || 0), 0)
    : jobs.reduce((sum, j) => sum + (j.consultant_payout || 0), 0);

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '24px', flex: 1}}>
      <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
        <button className="btn btn-ghost" onClick={onClose}>← Back</button>
        <div>
          <div style={{fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px'}}>
            {user.display_name} 
            {!user.is_active ? <span className="badge badge-cancelled">ARCHIVED</span> : 
              (user.is_verified ? <span className="badge badge-delivered">ACTIVE</span> : <span className="badge badge-cancelled">SUSPENDED</span>)}
          </div>
          <div style={{color: 'var(--muted)'}}>{user.email} • Joined {new Date(user.created_at).toLocaleDateString()}</div>
        </div>
        <div style={{flex: 1}}></div>
        <div style={{display: 'flex', gap: '8px'}}>
          <button className="btn btn-ghost" onClick={() => setActionModal({ isOpen: true, action: 'reset' })}>Reset Password</button>
          <button className="btn btn-ghost" style={{color: user.is_verified ? 'var(--gold)' : 'var(--green)'}} onClick={() => setActionModal({ isOpen: true, action: user.is_verified ? 'suspend' : 'activate' })}>
            {user.is_verified ? 'Suspend Account' : 'Activate Account'}
          </button>
          <button className="btn btn-ghost" style={{color: 'var(--red)'}} onClick={() => setActionModal({ isOpen: true, action: 'archive' })}>Archive</button>
        </div>
      </div>

      {loading ? <div className="empty"><span className="spinner"></span></div> : (
        <>
          {/* FINANCIAL OVERVIEW */}
          <div style={{display: 'flex', gap: '16px'}}>
            <div className="card-box" style={{flex: 1}}>
              <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase'}}>Total Jobs</div>
              <div style={{fontSize: '28px', fontWeight: 700}}>{jobs.length}</div>
            </div>
            <div className="card-box" style={{flex: 1}}>
              <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase'}}>
                {user.role === 'client' ? 'Lifetime Value' : 'Lifetime Earnings'}
              </div>
              <div style={{fontSize: '28px', fontWeight: 700, color: 'var(--green)'}}>R{totalValue.toFixed(2)}</div>
            </div>
            {user.role === 'consultant' && (
              <div className="card-box" style={{flex: 1, borderColor: 'var(--gold)'}}>
                <div style={{fontSize: '12px', color: 'var(--gold)', marginBottom: '4px', textTransform: 'uppercase'}}>Wallet Balance</div>
                <div style={{fontSize: '28px', fontWeight: 700, color: 'var(--gold)'}}>R{user.wallet_balance || 0}</div>
              </div>
            )}
          </div>

          <div style={{display: 'flex', gap: '24px'}}>
            {/* JOB HISTORY */}
            <div style={{flex: 1}}>
              <div className="section-title" style={{marginBottom: '16px'}}>Job History</div>
              <div className="card-box" style={{padding: 0, overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left'}}>
                  <thead>
                    <tr style={{background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)'}}>
                      <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Ref</th>
                      <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Title</th>
                      <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Status</th>
                      <th style={{padding: '12px 16px', color: 'var(--muted)', textAlign: 'right'}}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id} style={{borderBottom: '1px solid var(--border)'}}>
                        <td style={{padding: '12px 16px', fontFamily: 'monospace'}}>{j.job_ref}</td>
                        <td style={{padding: '12px 16px', fontWeight: 600}}>{j.title}</td>
                        <td style={{padding: '12px 16px'}}>
                          <span className={`badge badge-${j.status}`}>{j.status.toUpperCase()}</span>
                        </td>
                        <td style={{padding: '12px 16px', textAlign: 'right', color: 'var(--green)'}}>
                          R{user.role === 'client' ? j.client_budget : (j.consultant_payout || 0)}
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && <tr><td colSpan="4" style={{padding: '24px', textAlign: 'center', color: 'var(--muted)'}}>No jobs found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CHAT LOGS */}
            <div style={{width: '400px'}}>
              <div className="section-title" style={{marginBottom: '16px'}}>Communication Logs</div>
              <div className="card-box" style={{maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {messages.length === 0 ? <div style={{color: 'var(--muted)', textAlign: 'center'}}>No messages sent by this user.</div> : 
                  messages.map(m => (
                    <div key={m.id} style={{background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px'}}>
                        <span style={{color: 'var(--blue)', fontWeight: 600}}>{m.jobs?.job_ref} - {m.jobs?.title}</span>
                        <span style={{color: 'var(--muted)'}}>{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{fontSize: '13px', lineHeight: '1.5'}}>{m.content}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </>
      )}

      {actionModal.isOpen && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Confirm Action</div>
              <button className="close-btn" onClick={() => setActionModal({ isOpen: false, action: null })}>×</button>
            </div>
            <div className="modal-body">
              <div style={{marginBottom: '16px'}}>
                You are about to <strong>{actionModal.action.toUpperCase()}</strong> the account for {user.display_name}.
                Please provide a reason and any relevant comments for the audit log.
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <select className="form-input" value={actionReason} onChange={e => setActionReason(e.target.value)}>
                  <option value="">-- Select Reason --</option>
                  {actionModal.action === 'reset' && (
                    <>
                      <option value="User Request">User Request</option>
                      <option value="Security Breach / Suspicious Activity">Security Breach / Suspicious Activity</option>
                      <option value="Routine Credential Rotation">Routine Credential Rotation</option>
                    </>
                  )}
                  {actionModal.action === 'suspend' && (
                    <>
                      <option value="Policy Violation">Policy Violation</option>
                      <option value="Payment Dispute">Payment Dispute</option>
                      <option value="Poor QA Performance">Poor QA Performance</option>
                      <option value="Temporary Hold">Temporary Hold</option>
                    </>
                  )}
                  {actionModal.action === 'activate' && (
                    <>
                      <option value="Identity Verified">Identity Verified</option>
                      <option value="Suspension Lifted">Suspension Lifted</option>
                      <option value="Dispute Resolved">Dispute Resolved</option>
                    </>
                  )}
                  {actionModal.action === 'archive' && (
                    <>
                      <option value="User Requested Deletion">User Requested Deletion</option>
                      <option value="Inactive Account Cleanup">Inactive Account Cleanup</option>
                      <option value="Permanent Ban">Permanent Ban</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Additional Comments</label>
                <textarea className="form-input" value={actionComments} onChange={e => setActionComments(e.target.value)} placeholder="Provide more details..."></textarea>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setActionModal({ isOpen: false, action: null })}>Cancel</button>
              <button className="btn btn-primary" onClick={handleActionSubmit}>Confirm & Execute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersTab({ adminProfile, users, setUsers, role }) {
  
  const [selectedUserView, setSelectedUserView] = useState(null); // The user object for full view

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'client', display_name: '' });

  const handleVerify = async (userId, userEmail, userName) => {
    const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('id', userId);
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_verified: true } : u));
      sendEmail(userEmail, 'Your Account is Verified!', EmailTemplates.consultantVerified(userName));
    } else {
      alert('Error verifying user: ' + error.message);
    }
  };
  
  const handleToggleSuspend = async (user) => {
    const newStatus = !user.is_verified;
    const { error } = await supabase.from('profiles').update({ is_verified: newStatus }).eq('id', user.id);
    if (!error) {
      setUsers(users.map(u => u.id === user.id ? { ...u, is_verified: newStatus } : u));
    }
  };

  const handleUpdateUserInList = (updatedUser) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (selectedUserView && selectedUserView.id === updatedUser.id) {
      setSelectedUserView(updatedUser);
    }
  };

  const handleCreateUser = async () => {
    if(!formData.email || !formData.password || !formData.display_name) return alert('Fill all fields');
    
    const { createClient } = await import('@supabase/supabase-js');
    const tempClient = createClient('https://vgxjikgmttwflqxezbxd.supabase.co', 'sb_publishable__O9Bj0JC-l3KTo0QBF10YQ_ZP-DBVMd', {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    
    const { data, error } = await tempClient.auth.signUp({
      email: formData.email,
      password: formData.password,
    });
    
    if(error) return alert(error.message);
    
    if(data.user) {
      await supabase.from('profiles').update({ 
        role: formData.role, 
        display_name: formData.display_name,
        is_verified: true 
      }).eq('id', data.user.id);
      setShowCreateModal(false);
      setFormData({ email: '', password: '', role: 'client', display_name: '' });
      fetchUsers();
    }
  };

  const handleEditUser = async () => {
    if(!selectedUser) return;
    const { error } = await supabase.from('profiles').update({ 
      display_name: formData.display_name,
      role: formData.role 
    }).eq('id', selectedUser.id);
    
    if(error) return alert(error.message);
    setShowEditModal(false);
    // In a real app we'd trigger a refetch, but here we can just update local state if needed.
    // For simplicity, we just update the user list directly.
    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, display_name: formData.display_name, role: formData.role } : u));
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setFormData({ email: user.email, display_name: user.display_name || '', role: user.role, password: '' });
    setShowEditModal(true);
  };

  if (selectedUserView) {
    return <UserProfileView user={selectedUserView} onClose={() => setSelectedUserView(null)} onUpdate={handleUpdateUserInList} adminProfile={adminProfile} />;
  }

  // Filter out hard deleted / archived users for active views, though we can still show them if needed.
  // We will show is_active = false users at the bottom of the list visually.
  const displayUsers = users.filter(u => u.role === role);

  return (
    <div style={{padding: '24px', flex: 1}}>
      
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <div className="page-title">{role === 'client' ? 'Clients' : 'Consultants'}</div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Create Account</button>
      </div>

      <div className="card-box" style={{padding: 0, overflow: 'hidden'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left'}}>
          <thead>
            <tr style={{background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)'}}>
              <th style={{padding: '12px 16px', color: 'var(--muted)', fontWeight: 500}}>User</th>
              <th style={{padding: '12px 16px', color: 'var(--muted)', fontWeight: 500}}>Email</th>
              <th style={{padding: '12px 16px', color: 'var(--muted)', fontWeight: 500}}>Joined</th>
              <th style={{padding: '12px 16px', color: 'var(--muted)', fontWeight: 500}}>Status</th>
              <th style={{padding: '12px 16px', textAlign: 'right', color: 'var(--muted)', fontWeight: 500}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayUsers.map(user => (
              <tr key={user.id} style={{borderBottom: '1px solid var(--border)', opacity: user.is_active ? 1 : 0.5, cursor: 'pointer'}} onClick={() => setSelectedUserView(user)}>
                <td style={{padding: '12px 16px', fontWeight: 600}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{width: '24px', height: '24px', borderRadius: '4px', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'}}>{user.display_name?.charAt(0) || user.role.charAt(0).toUpperCase()}</div>
                    {user.display_name || 'Unnamed'}
                  </div>
                </td>
                <td style={{padding: '12px 16px', color: 'var(--dim)'}}>{user.email || 'N/A'}</td>
                <td style={{padding: '12px 16px', color: 'var(--dim)'}}>{new Date(user.created_at).toLocaleDateString()}</td>
                <td style={{padding: '12px 16px'}}>
                  {!user.is_active ? <span className="badge badge-cancelled" style={{fontSize: '10px'}}>Archived</span> :
                   user.is_verified ? (
                     <span className="badge badge-delivered" style={{fontSize: '10px'}}>Active</span>
                  ) : (
                     <span className="badge badge-cancelled" style={{fontSize: '10px'}}>{activeTab === 'consultants' ? 'Pending Verification' : 'Suspended'}</span>
                  )}
                </td>
                <td style={{padding: '12px 16px', textAlign: 'right'}}>
                  <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                    {!user.is_active ? null : !user.is_verified && activeTab === 'consultants' && (
                      <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleVerify(user.id, user.email, user.display_name); }}>Verify</button>
                    )}
                    {user.is_active && (
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(user); }}>Edit</button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedUserView(user); }}>View Full Profile →</button>
                  </div>
                </td>
              </tr>
            ))}
            {displayUsers.length === 0 && (
              <tr><td colSpan="5" style={{padding: '24px', textAlign: 'center', color: 'var(--muted)'}}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal-bg">
          <div className="modal" style={{maxWidth: '400px'}}>
            <div className="modal-head">
              <div className="modal-title">Create New Account</div>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="client">Client</option>
                  <option value="consultant">Consultant</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input type="text" className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateUser}>Create Account</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal-bg">
          <div className="modal" style={{maxWidth: '400px'}}>
            <div className="modal-head">
              <div className="modal-title">Edit Account</div>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Email Address (Cannot change)</label>
                <input type="email" className="form-input" value={formData.email} disabled style={{opacity: 0.5}} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="client">Client</option>
                  <option value="consultant">Consultant</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditUser}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function FinancesTab() {
  const [jobs, setJobs] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: jobsData } = await supabase.from('jobs').select('*').in('status', ['paid', 'delivered', 'completed']);
    const { data: profsData } = await supabase.from('profiles').select('*').eq('role', 'consultant');
    
    if (jobsData) setJobs(jobsData);
    if (profsData) setConsultants(profsData);
    setLoading(false);
  };

  const handleApprovePayout = async (consultantId, currentBalance) => {
    // Zero out the wallet balance
    const { error } = await supabase.from('profiles').update({ wallet_balance: 0 }).eq('id', consultantId);
    if (error) {
      alert('Error approving payout: ' + error.message);
    } else {
      setConsultants(consultants.map(c => c.id === consultantId ? { ...c, wallet_balance: 0 } : c));
      alert('Payout Approved! Wallet balance cleared.');
    }
  };

  if (loading) return <div className="empty"><span className="spinner"></span></div>;

  const totalRevenue = jobs.reduce((sum, j) => sum + (j.client_budget || 0), 0);
  const totalPayouts = jobs.reduce((sum, j) => sum + (j.consultant_payout || 0), 0);
  const totalMargin = jobs.reduce((sum, j) => sum + (j.gabriel_margin || 0), 0);
  
  const pendingPayouts = consultants.filter(c => c.wallet_balance > 0);

  return (
    <div style={{padding: '24px', flex: 1}}>
      
      <div style={{display: 'flex', gap: '16px', marginBottom: '32px'}}>
        <div className="card-box" style={{flex: 1}}>
          <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px'}}>Total System Revenue</div>
          <div style={{fontSize: '28px', fontWeight: 700}}>R{totalRevenue.toFixed(2)}</div>
        </div>
        <div className="card-box" style={{flex: 1}}>
          <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px'}}>Total Cons. Payouts</div>
          <div style={{fontSize: '28px', fontWeight: 700, color: 'var(--red)'}}>- R{totalPayouts.toFixed(2)}</div>
        </div>
        <div className="card-box" style={{flex: 1, background: 'rgba(16,185,129,0.05)', borderColor: 'var(--green)'}}>
          <div style={{fontSize: '12px', color: 'var(--green)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px'}}>Net Gabriel Profit</div>
          <div style={{fontSize: '28px', fontWeight: 700, color: 'var(--green)'}}>R{totalMargin.toFixed(2)}</div>
        </div>
      </div>

      <div style={{display: 'flex', gap: '24px'}}>
        <div style={{flex: 1}}>
          <div className="section-title" style={{marginBottom: '16px'}}>Financial Ledger (Jobs)</div>
          <div className="card-box" style={{padding: 0, overflow: 'hidden'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left'}}>
              <thead>
                <tr style={{background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)'}}>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Ref</th>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Status</th>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Revenue</th>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Payout</th>
                  <th style={{padding: '12px 16px', color: 'var(--green)'}}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} style={{borderBottom: '1px solid var(--border)'}}>
                    <td style={{padding: '12px 16px', fontFamily: 'monospace'}}>{job.job_ref}</td>
                    <td style={{padding: '12px 16px'}}>
                      <span className={`badge badge-${job.status}`}>{job.status.toUpperCase()}</span>
                    </td>
                    <td style={{padding: '12px 16px', fontWeight: 600}}>R{job.client_budget}</td>
                    <td style={{padding: '12px 16px', color: 'var(--red)'}}>- R{job.consultant_payout || 0}</td>
                    <td style={{padding: '12px 16px', color: 'var(--green)', fontWeight: 600}}>R{job.gabriel_margin || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div style={{width: '350px'}}>
          <div className="section-title" style={{color: 'var(--gold)', marginBottom: '16px'}}>Pending Payouts Queue</div>
          {pendingPayouts.length === 0 ? (
            <div className="card-box" style={{color: 'var(--muted)', textAlign: 'center'}}>No pending payouts.</div>
          ) : (
            pendingPayouts.map(c => (
              <div key={c.id} className="card-box" style={{borderColor: 'var(--gold)', marginBottom: '12px'}}>
                <div style={{fontWeight: 600, fontSize: '14px', marginBottom: '4px'}}>{c.display_name}</div>
                <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '12px'}}>{c.email}</div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245,158,11,0.1)', padding: '10px', borderRadius: '6px', marginBottom: '12px'}}>
                  <span style={{fontSize: '12px', color: 'var(--gold)'}}>Wallet Balance</span>
                  <span style={{fontSize: '18px', fontWeight: 700, color: 'var(--gold)'}}>R{c.wallet_balance}</span>
                </div>
                <button className="btn btn-primary" style={{width: '100%', background: 'var(--gold)', color: '#000'}} onClick={() => handleApprovePayout(c.id, c.wallet_balance)}>Approve & Clear Payout</button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

export default function AdminPortal() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { jobs, loading: jobsLoading } = useJobs(profile?.role, profile?.id);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline', 'users', 'finances'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [settings, setSettings] = useState({ default_deadline_buffer_hours: 24, max_cancellation_window_hours: 12 });

  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) setUsers(data);
      setUsersLoading(false);
    };
    
    const fetchSettings = async () => {
      const { data } = await supabase.from('system_settings').select('*');
      if (data) {
        const s = {};
        data.forEach(d => { s[d.setting_key] = d.setting_value });
        setSettings(s);
      }
    };
    
    fetchUsers();
    fetchSettings();
  }, []);
  
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(profile?.id);
  const [clientsList, setClientsList] = useState([]);
  const [newJobData, setNewJobData] = useState({ client_id: '', manual_client_name: '', title: '', subject: '', academic_level: 'Undergraduate', description: '', budget: '', deadline: '' });

  const fetchClientsForManualJob = async () => {
    const { data } = await supabase.from('profiles').select('id, display_name, email').eq('role', 'client').order('created_at', { ascending: false });
    if (data) setClientsList(data);
  };

  const handleCreateManualJob = async () => {
    if (!newJobData.client_id || (!newJobData.title) || !newJobData.budget || !newJobData.deadline) {
      return toast.error('Please fill in Client, Title, Budget, and Deadline.');
    }
    if (newJobData.client_id === 'manual' && !newJobData.manual_client_name) {
      return toast.error('Please enter the manual client name.');
    }
    try {
      const { data: jobRefData, error: rpcError } = await supabase.rpc('generate_job_ref');
      let jobRef = jobRefData || `GA-${Math.floor(1000 + Math.random() * 9000)}`;

      const { error } = await supabase.from('jobs').insert({
        client_id: newJobData.client_id === 'manual' ? null : newJobData.client_id,
        manual_client_name: newJobData.client_id === 'manual' ? newJobData.manual_client_name : null,
        job_ref: jobRef,
        title: newJobData.title,
        subject: newJobData.subject,
        level: newJobData.academic_level,
        instructions: newJobData.description,
        client_budget: parseFloat(newJobData.budget),
        deadline: new Date(newJobData.deadline).toISOString(),
        status: 'paid' // Automatically bypass payment for manual admin jobs
      });

      if (error) throw error;
      setShowCreateJobModal(false);
      setNewJobData({ client_id: '', manual_client_name: '', title: '', subject: '', academic_level: 'Undergraduate', description: '', budget: '', deadline: '' });
      // Force a reload of jobs (usually handled by real-time or we can just alert)
      toast.success('Job created successfully! It may take a moment to appear.');
    } catch (err) {
      toast.error('Error creating job: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSaveSettings = async () => {
    try {
      const updates = [
        { setting_key: 'default_deadline_buffer_hours', setting_value: settings.default_deadline_buffer_hours },
        { setting_key: 'max_cancellation_window_hours', setting_value: settings.max_cancellation_window_hours }
      ];
      const { error } = await supabase.from('system_settings').upsert(updates, { onConflict: 'setting_key' });
      if (error) throw error;
      toast.success('System settings saved successfully!');
    } catch (err) {
      toast.error('Error saving settings: ' + err.message);
    }
  };

  const handlePostJob = async (job, payoutRate, cDeadline, modInstructions) => {
    try {
      if (!cDeadline) {
        return toast.error("Please set a consultant deadline.");
      }

      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'posted',
          consultant_rate: payoutRate,
          consultant_deadline: new Date(cDeadline).toISOString(),
          instructions: modInstructions
        })
        .eq('id', job.id);
      
      if (error) throw error;
      toast.success("Job posted to the Mission Board!");
      setSelectedJob(null);
    } catch (err) {
      toast.error('Error posting job: ' + err.message);
    }
  };

  const handleWithdrawJob = async (job) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'paid', // revert to paid
          consultant_id: null // remove consultant if any
        })
        .eq('id', job.id);
      
      if (error) throw error;
      toast.success("Job withdrawn from the Mission Board.");
      setSelectedJob(null);
    } catch (err) {
      toast.error('Error withdrawing job: ' + err.message);
    }
  };

  const handlePassQA = async (job) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'delivered'
        })
        .eq('id', job.id);
      
      if (error) throw error;
      setSelectedJob(null);

      // Fetch client profile to send delivery email
      const { data: clientProfile } = await supabase.from('profiles').select('email').eq('id', job.client_id).single();
      if (clientProfile && clientProfile.email) {
        sendEmail(clientProfile.email, 'Your Request is Complete!', EmailTemplates.workDelivered(job.job_ref));
      }

    } catch (err) {
      alert('Error passing QA: ' + err.message);
    }
  };

  const handleFailQA = async (job, notes) => {
    if (!notes) return alert('You must provide QA notes to fail a job.');
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'qa_failed',
          qa_notes: notes
        })
        .eq('id', job.id);
      
      if (error) throw error;
      setSelectedJob(null);

      // Fetch consultant profile to send revision email
      const { data: consultantProfile } = await supabase.from('profiles').select('email').eq('id', job.consultant_id).single();
      if (consultantProfile && consultantProfile.email) {
        sendEmail(consultantProfile.email, 'Revision Required', EmailTemplates.qaFailed(job.job_ref));
      }

    } catch (err) {
      alert('Error failing QA: ' + err.message);
    }
  };

  if (profileLoading || jobsLoading) return <div className="empty"><span className="spinner"></span></div>;

  const getCol = (statuses) => jobs.filter(j => 
    statuses.includes(j.status) &&
    (j.title?.toLowerCase().includes(searchQuery.toLowerCase()) || j.job_ref?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Finances
  const totalGabrielMargin = jobs.filter(j => j.status === 'delivered').reduce((sum, j) => sum + (j.gabriel_margin || 0), 0);

  return (
    <div id="app-shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">GA</div>
          <div>
            <div className="brand-name">Gabriel Academics</div>
            <div className="brand-role">Admin Command Centre</div>
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
            <div className="user-av" style={{background: 'var(--red)'}}>A</div>
            <div className="user-name">Administrator</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
      
      <div className="layout">
        <div className="sidebar">
          <div className="nav-section">
            <div className="nav-label">Management</div>
            <div className={`nav-item ${activeTab === 'pipeline' ? 'active' : ''}`} onClick={() => setActiveTab('pipeline')}>Job Pipeline</div>
            <div className={`nav-item ${activeTab === 'all_jobs' ? 'active' : ''}`} onClick={() => setActiveTab('all_jobs')}>All Jobs (History)</div>
            <div className={`nav-item ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setActiveTab('clients')} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              Clients
              {users.filter(u => u.role === 'client' && !u.is_verified).length > 0 && <span className="badge" style={{background: 'var(--red)', color: 'white', padding: '2px 6px', fontSize: '10px'}}>{users.filter(u => u.role === 'client' && !u.is_verified).length}</span>}
            </div>
            <div className={`nav-item ${activeTab === 'consultants' ? 'active' : ''}`} onClick={() => setActiveTab('consultants')} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              Consultants
              {users.filter(u => u.role === 'consultant' && !u.is_verified).length > 0 && <span className="badge" style={{background: 'var(--red)', color: 'white', padding: '2px 6px', fontSize: '10px'}}>{users.filter(u => u.role === 'consultant' && !u.is_verified).length}</span>}
            </div>
            <div className={`nav-item ${activeTab === 'finances' ? 'active' : ''}`} onClick={() => setActiveTab('finances')}>Finances</div>
            <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>System Settings</div>
          </div>
        </div>
        
        <div className="main" style={{display: 'flex', flexDirection: 'column'}}>
          {activeTab === 'pipeline' && (
            <>
              <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div className="page-title">Operations Pipeline</div>
                  <div className="page-sub">Manage the flow of requests from clients to consultants.</div>
                </div>
                <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      fetchClientsForManualJob();
                      setShowCreateJobModal(true);
                    }}
                  >
                    + Post Job Manually
                  </button>
                  <div style={{position: 'relative'}}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Search jobs or ref..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{width: '250px'}}
                    />
                  </div>
                  <div style={{background: 'var(--card)', padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border)'}}>
                    <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Total Gross Margin (Delivered)</div>
                    <div style={{fontSize: '20px', color: 'var(--green)', fontWeight: 700}}>R{totalGabrielMargin.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <div className="pipeline">
            {/* COLUMN 1: NEW REQUESTS */}
            <div className="pipe-col">
              <div className="pipe-head">
                <div>New & Paid Requests</div>
                <div className="pipe-count">{getCol(['new', 'paid']).length}</div>
              </div>
              {getCol(['new', 'paid']).map(job => (
                <div key={job.id} className="pipe-card" onClick={() => setSelectedJob(job)}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div className="pipe-ref">{job.job_ref}</div>
                    {job.status === 'paid' && <span className="badge badge-delivered" style={{fontSize: '9px', padding: '2px 4px'}}>PAID</span>}
                  </div>
                  <div className="pipe-title">{job.title}</div>
                  <div className="pipe-meta">
                    <span>{job.subject || 'N/A'}</span>
                    <span style={{color: 'var(--green)'}}>R{job.client_budget}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* COLUMN 2: ACTIVE */}
            <div className="pipe-col">
              <div className="pipe-head">
                <div>Active / Posted</div>
                <div className="pipe-count">{getCol(['posted', 'active', 'pending', 'qa_failed']).length}</div>
              </div>
              {getCol(['posted', 'active', 'pending', 'qa_failed']).map(job => (
                <div key={job.id} className="pipe-card" onClick={() => setSelectedJob(job)}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div className="pipe-ref">{job.job_ref}</div>
                    <span className={`badge badge-${job.status}`} style={{fontSize: '9px', padding: '2px 4px'}}>{job.status.toUpperCase()}</span>
                  </div>
                  <div className="pipe-title">{job.title}</div>
                  <div className="pipe-meta">
                    <span>Due: {new Date(job.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* COLUMN 3: QA */}
            <div className="pipe-col" style={{background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.2)'}}>
              <div className="pipe-head" style={{borderBottomColor: 'rgba(139,92,246,0.2)'}}>
                <div style={{color: 'var(--purple)'}}>QA & Review</div>
                <div className="pipe-count" style={{background: 'var(--purple)', color: '#fff'}}>{getCol(['submitted']).length}</div>
              </div>
              {getCol(['submitted']).map(job => (
                <div key={job.id} className="pipe-card" style={{borderColor: 'var(--purple)'}} onClick={() => setSelectedJob(job)}>
                  <div className="pipe-ref" style={{color: 'var(--purple)'}}>{job.job_ref}</div>
                  <div className="pipe-title">{job.title}</div>
                  <div className="pipe-meta"><span>Submitted for review</span></div>
                </div>
              ))}
            </div>

            {/* COLUMN 4: DELIVERED */}
            <div className="pipe-col" style={{opacity: 0.8}}>
              <div className="pipe-head">
                <div>Delivered</div>
                <div className="pipe-count">{getCol(['delivered', 'completed', 'cancelled']).length}</div>
              </div>
              {getCol(['delivered', 'completed', 'cancelled']).map(job => (
                <div key={job.id} className="pipe-card" onClick={() => setSelectedJob(job)}>
                  <div className="pipe-ref">{job.job_ref}</div>
                  <div className="pipe-title">{job.title}</div>
                </div>
              ))}
            </div>

            </div>
          </>)}

          {activeTab === 'clients' && (
            <UsersTab adminProfile={profile} users={users} setUsers={setUsers} role="client" />
          )}

          {activeTab === 'consultants' && (
            <UsersTab adminProfile={profile} users={users} setUsers={setUsers} role="consultant" />
          )}

          {activeTab === 'finances' && (
            <FinancesTab />
          )}

          {activeTab === 'settings' && (
            <div style={{padding: '24px', flex: 1}}>
              <div className="page-header">
                <div className="page-title">System Settings</div>
                <div className="page-sub">Configure global platform rules and constraints.</div>
              </div>
              <div className="card-box" style={{maxWidth: '600px'}}>
                <div style={{fontWeight: 600, fontSize: '16px', marginBottom: '16px'}}>Operational Rules</div>
                
                <div className="form-group">
                  <label className="form-label">Default Consultant Deadline Buffer (Hours)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={settings.default_deadline_buffer_hours} 
                    onChange={e => setSettings({...settings, default_deadline_buffer_hours: parseInt(e.target.value) || 0})}
                  />
                  <div className="form-note">When posting a job, the consultant deadline will automatically be set this many hours before the client's actual deadline.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Maximum Cancellation Window (Hours)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={settings.max_cancellation_window_hours} 
                    onChange={e => setSettings({...settings, max_cancellation_window_hours: parseInt(e.target.value) || 0})}
                  />
                  <div className="form-note">Consultants cannot abandon a job if the deadline is within this many hours.</div>
                </div>

                <div style={{marginTop: '24px'}}>
                  <button className="btn btn-primary" onClick={handleSaveSettings}>Save Configuration</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'all_jobs' && (
            <div style={{padding: '24px', flex: 1, overflowY: 'auto'}}>
              <div className="page-header">
                <div className="page-title">All Jobs (History)</div>
                <div className="page-sub">Comprehensive historical list of all jobs in the system.</div>
              </div>
              
              <div style={{display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px'}}>
                {['All', 'Active/Posted', 'QA Review', 'Completed/Delivered', 'Cancelled'].map(filter => (
                  <button 
                    key={filter}
                    className="btn btn-sm" 
                    style={{
                      background: (filter === 'All' && !searchQuery) || (searchQuery === filter) ? 'var(--blue)' : 'transparent',
                      color: (filter === 'All' && !searchQuery) || (searchQuery === filter) ? '#fff' : 'var(--muted)',
                      border: '1px solid ' + ((filter === 'All' && !searchQuery) || (searchQuery === filter) ? 'var(--blue)' : 'var(--border)')
                    }}
                    onClick={() => setSearchQuery(filter === 'All' ? '' : filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="card-box" style={{padding: 0, overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                  <thead>
                    <tr style={{background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase'}}>
                      <th style={{padding: '12px 16px', fontWeight: 600}}>Ref</th>
                      <th style={{padding: '12px 16px', fontWeight: 600}}>Title</th>
                      <th style={{padding: '12px 16px', fontWeight: 600}}>Status</th>
                      <th style={{padding: '12px 16px', fontWeight: 600}}>Client</th>
                      <th style={{padding: '12px 16px', fontWeight: 600}}>Consultant</th>
                      <th style={{padding: '12px 16px', fontWeight: 600}}>Budget</th>
                      <th style={{padding: '12px 16px', fontWeight: 600}}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.filter(j => {
                      if (!searchQuery) return true;
                      if (searchQuery === 'Active/Posted') return ['posted', 'active', 'pending'].includes(j.status);
                      if (searchQuery === 'QA Review') return ['submitted', 'qa_failed'].includes(j.status);
                      if (searchQuery === 'Completed/Delivered') return ['delivered', 'completed'].includes(j.status);
                      if (searchQuery === 'Cancelled') return j.status === 'cancelled';
                      return true;
                    }).map(job => (
                      <tr key={job.id} style={{borderBottom: '1px solid var(--border)', cursor: 'pointer'}} onClick={() => setSelectedJob(job)} className="hover-row">
                        <td style={{padding: '12px 16px', fontFamily: 'monospace', color: 'var(--gold)'}}>{job.job_ref}</td>
                        <td style={{padding: '12px 16px', fontWeight: 500}}>{job.title}</td>
                        <td style={{padding: '12px 16px'}}><span className={`badge badge-${job.status}`} style={{fontSize: '10px', padding: '2px 4px'}}>{job.status.toUpperCase()}</span></td>
                        <td style={{padding: '12px 16px', color: 'var(--muted)'}}>{getProfileName(job.client) || 'Unassigned'}</td>
                        <td style={{padding: '12px 16px', color: 'var(--muted)'}}>{getProfileName(job.consultant) || 'Unassigned'}</td>
                        <td style={{padding: '12px 16px', color: 'var(--green)'}}>R{job.client_budget}</td>
                        <td style={{padding: '12px 16px', color: 'var(--dim)'}}>{new Date(job.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {jobs.length === 0 && (
                      <tr><td colSpan="7" style={{padding: '32px', textAlign: 'center', color: 'var(--muted)'}}>No jobs found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedJob && (
        <AdminJobModal 
          job={selectedJob} 
          profile={profile} 
          onClose={() => setSelectedJob(null)} 
          onPost={handlePostJob} 
          onPassQA={handlePassQA} 
          onFailQA={handleFailQA} 
          onWithdraw={handleWithdrawJob}
          onUpdateStatus={async (jobId, newStatus) => {
            const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId);
            if (error) toast.error('Error updating status: ' + error.message);
            else {
              toast.success(`Status updated to ${newStatus}`);
              setSelectedJob(null);
            }
          }}
        />
      )}

      {showCreateJobModal && (
        <div className="modal-bg">
          <div className="modal" style={{maxWidth: '500px'}}>
            <div className="modal-head">
              <div className="modal-title">Post Job Manually</div>
              <button className="close-btn" onClick={() => setShowCreateJobModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Client</label>
                <select className="form-input" value={newJobData.client_id} onChange={e => setNewJobData({...newJobData, client_id: e.target.value})}>
                  <option value="">Select a Client...</option>
                  <option value="manual" style={{fontWeight: 600}}>+ Enter Client Manually</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>{c.display_name || 'Unnamed Client'} ({c.email})</option>
                  ))}
                </select>
              </div>
              {newJobData.client_id === 'manual' && (
                <div className="form-group">
                  <label className="form-label">Manual Client Name</label>
                  <input type="text" className="form-input" placeholder="e.g. John Doe (Offline)" value={newJobData.manual_client_name} onChange={e => setNewJobData({...newJobData, manual_client_name: e.target.value})} />
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Job Title</label>
                <input type="text" className="form-input" placeholder="e.g. Masters Thesis Chapter 1" value={newJobData.title} onChange={e => setNewJobData({...newJobData, title: e.target.value})} />
              </div>
              
              <div style={{display: 'flex', gap: '16px'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label className="form-label">Subject Area</label>
                  <input type="text" className="form-input" placeholder="e.g. Economics" value={newJobData.subject} onChange={e => setNewJobData({...newJobData, subject: e.target.value})} />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label className="form-label">Academic Level</label>
                  <select className="form-input" value={newJobData.academic_level} onChange={e => setNewJobData({...newJobData, academic_level: e.target.value})}>
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Professional">Professional</option>
                  </select>
                </div>
              </div>
              
              <div style={{display: 'flex', gap: '16px'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label className="form-label">Deadline</label>
                  <input type="date" className="form-input" value={newJobData.deadline} onChange={e => setNewJobData({...newJobData, deadline: e.target.value})} />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label className="form-label">Client Budget (ZAR)</label>
                  <input type="number" className="form-input" placeholder="0.00" value={newJobData.budget} onChange={e => setNewJobData({...newJobData, budget: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Instructions / Description</label>
                <textarea className="form-input" rows="4" placeholder="Provide detailed instructions for the consultant..." value={newJobData.description} onChange={e => setNewJobData({...newJobData, description: e.target.value})}></textarea>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowCreateJobModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateManualJob}>Create Job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
