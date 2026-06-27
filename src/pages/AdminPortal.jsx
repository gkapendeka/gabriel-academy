import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, logMilestone } from '../lib/supabase';
import { MilestoneTracker } from '../components/MilestoneTracker';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useProfile } from '../lib/useProfile';
import { useJobs } from '../lib/useJobs';
import { useMessages } from '../lib/useMessages';
import { sendEmail, EmailTemplates } from '../lib/emailService';
import toast from 'react-hot-toast';
import { useNotifications } from '../lib/useNotifications';
import { NotificationBell } from '../components/NotificationBell';

export const formatStatus = (s) => {
  const map = {
    new: 'New Request',
    paid: 'Awaiting Consultant',
    posted: 'Posted to Consultants',
    pending: 'Awaiting Consultant',
    active: 'Attended to by Consultant',
    submitted: 'Submitted for QA',
    qa_review: 'Under QA Review',
    qa_failed: 'QA Failed (Revising)',
    delivered: 'Delivered to Client',
    disputed: 'Disputed',
    cancelled: 'Cancelled'
  };
  return map[s] || (s ? s.toUpperCase() : '');
};

function getProfileName(profile) {
  if (!profile) return null;
  if (Array.isArray(profile)) {
    return profile[0]?.display_name || profile[0]?.email;
  }
  return profile.display_name || profile.email;
}

function AdminJobDetail({ job, profile, onBack, onPost, onPassQA, onFailQA, onUpdateStatus, onWithdraw }) {
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
  const [payments, setPayments] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('EFT');
  const [payComment, setPayComment] = useState('');
  const [payTarget, setPayTarget] = useState('job');
  const [paymentVerified, setPaymentVerified] = useState(job.payment_verified || false);

  const loadFinancials = async () => {
    if (!job.client_id) return;
    const { data: pData } = await supabase.from('payments').select('*').eq('client_id', job.client_id).order('created_at', { ascending: false });
    if (pData) setPayments(pData);
    const { data: cData } = await supabase.from('profiles').select('wallet_balance').eq('id', job.client_id).single();
    if (cData) setWalletBalance(cData.wallet_balance || 0);
  };

  useEffect(() => {
    if (job.status === 'delivered') {
      supabase.from('reviews').select('*').eq('job_id', job.id).single().then(({data}) => {
        if (data) setReview(data);
      });
    }
    
    // Set default consultant deadline to 24h before client deadline
    if (job.deadline && !consultantDeadline) {
      const d = new Date(job.deadline);
      if (!isNaN(d.getTime())) {
        d.setHours(d.getHours() - 24);
        // format for datetime-local input
        setConsultantDeadline(d.toISOString().slice(0, 16));
      }
    }
    loadFinancials();
  }, [job.id, job.status, job.deadline, job.client_id]);

  const handleLogPayment = async () => {
    if (!payAmount || isNaN(payAmount) || Number(payAmount) <= 0) return alert('Enter valid amount');
    if (payTarget === 'job' && payMethod === 'Wallet' && walletBalance < Number(payAmount)) {
      return alert('Insufficient wallet balance');
    }
    try {
      const { error } = await supabase.rpc('admin_log_payment', {
        p_client_id: job.client_id,
        p_job_id: payTarget === 'job' ? job.id : null,
        p_amount: Number(payAmount),
        p_method: payMethod,
        p_comment: payComment
      });
      if (error) throw error;
      toast.success('Payment logged successfully');
      setPayAmount('');
      setPayComment('');
      loadFinancials();
    } catch (err) {
      toast.error('Error logging payment: ' + err.message);
    }
  };

  const handleToggleVerified = async (e) => {
    const val = e.target.checked;
    try {
      const { error } = await supabase.from('jobs').update({ payment_verified: val }).eq('id', job.id);
      if (error) throw error;
      setPaymentVerified(val);
      job.payment_verified = val;
    } catch (err) {
      toast.error('Error updating verified status: ' + err.message);
    }
  };

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

  const clientMessages = (messages || []).filter(m => m.sender_id === job.client_id || m.recipient_id === job.client_id);
  const consultantMessages = (messages || []).filter(m => m.sender_id === job.consultant_id || m.recipient_id === job.consultant_id);
  const activeMessages = msgTarget === 'client' ? clientMessages : consultantMessages;

  return (
    <div style={{padding: '24px', flex: 1, overflowY: 'auto'}}>
      <div style={{maxWidth: '1200px', margin: '0 auto'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px'}}>
          <button className="btn btn-ghost" onClick={onBack}>← Back to Pipeline</button>
          <div className="page-title" style={{margin: 0}}>Admin Review: {job.job_ref}</div>
        </div>
        
        <MilestoneTracker job={job} />
        
        <div style={{display: 'flex', gap: '24px', alignItems: 'flex-start'}}>
          
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
                    <span className={`badge badge-${job.status}`}>{formatStatus(job.status)}</span>
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
                <div style={{fontSize: '16px', marginBottom: '4px'}}>{"⭐".repeat(review.rating || 0)}</div>
                <div style={{fontSize: '13px'}}>{review.comment}</div>
              </div>
            )}

            {/* Financials & Payments */}
            <div className="card-box" style={{borderColor: 'var(--green)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                <div style={{fontWeight: 600, color: 'var(--green)'}}>Financials & Payments</div>
                <div style={{fontSize: '13px'}}>Client Wallet Balance: <strong style={{color: 'var(--text)'}}>R{walletBalance.toFixed(2)}</strong></div>
              </div>
              
              <div style={{display: 'flex', gap: '8px', marginBottom: '16px', background: 'var(--bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', flexWrap: 'wrap'}}>
                <input type="number" className="form-input" style={{flex: 1, minWidth: '100px'}} placeholder="Amount (R)" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                <select className="form-input" style={{width: '120px'}} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="EFT">EFT</option>
                  <option value="Card">Card</option>
                  <option value="SnapScan">SnapScan</option>
                  <option value="PayFast">PayFast</option>
                  <option value="Wallet">Wallet</option>
                </select>
                <select className="form-input" style={{width: '120px'}} value={payTarget} onChange={e => setPayTarget(e.target.value)}>
                  <option value="job">Pay to Job</option>
                  <option value="wallet">Add to Wallet</option>
                </select>
                <input type="text" className="form-input" style={{flex: 2, minWidth: '150px'}} placeholder="Comment (e.g. 50% Deposit)" value={payComment} onChange={e => setPayComment(e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={handleLogPayment}>Log Payment</button>
              </div>

              {payments.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px'}}>
                  {payments.map(p => (
                    <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', background: 'var(--bg)', padding: '8px 12px', borderRadius: '4px'}}>
                      <div>
                        <div style={{fontWeight: 600}}>R{p.amount} <span style={{color: 'var(--muted)', fontWeight: 400}}>via {p.method}</span></div>
                        <div style={{color: 'var(--muted)'}}>{new Date(p.paid_at).toLocaleDateString()} {p.job_id ? '' : '(Added to Wallet)'} {p.comment ? `- ${p.comment}` : ''}</div>
                      </div>
                      <span className={`badge badge-${p.status}`} style={{fontSize: '9px', padding: '2px 4px'}}>{p.status ? p.status.toUpperCase() : ''}</span>
                    </div>
                  ))}
                  <div style={{textAlign: 'right', fontSize: '13px', fontWeight: 600, marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '16px'}}>
                    <span>Total Paid: <span style={{color: 'var(--green)'}}>R{payments.filter(p => p.job_id).reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}</span></span>
                    <span>Remaining Balance: <span style={{color: (job.client_budget - payments.filter(p => p.job_id).reduce((sum, p) => sum + Number(p.amount), 0)) > 0 ? 'var(--red)' : 'var(--muted)'}}>R{Math.max(0, job.client_budget - payments.filter(p => p.job_id).reduce((sum, p) => sum + Number(p.amount), 0)).toFixed(2)}</span></span>
                  </div>
                </div>
              ) : (
                <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '12px'}}>No payments logged yet.</div>
              )}
              
              <div style={{borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px'}}>
                <label style={{display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer'}}>
                  <input type="checkbox" checked={paymentVerified} onChange={handleToggleVerified} />
                  <span style={{fontSize: '13px', fontWeight: 600, color: paymentVerified ? 'var(--green)' : 'var(--text)'}}>Payment Arrangements Verified (Manual Lift)</span>
                </label>
              </div>
            </div>

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
        <div style={{marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px'}}>
          <button className="btn btn-ghost" onClick={onBack}>Back to Pipeline</button>
          {(job.status === 'posted' || job.status === 'active') && (
            <button className="btn btn-ghost" style={{color: 'var(--red)'}} onClick={() => onWithdraw(job)}>Withdraw Job</button>
          )}
          {(job.status === 'new' || job.status === 'paid') && (
            <button 
              className="btn btn-primary" 
              disabled={!postChecks?.deadline || !postChecks?.moderation || !postChecks?.profit || !paymentVerified}
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
  
  // Scope Approval State
  const [scopeDecisions, setScopeDecisions] = useState({});

  useEffect(() => {
    if (user.scope_requests) {
      const items = [];
      if (user.scope_requests.levels) {
         user.scope_requests.levels.split(',').forEach(l => {
           if (l.trim()) items.push(`Level: ${l.trim()}`);
         });
      }
      if (user.scope_requests.subjects) {
         user.scope_requests.subjects.split(',').forEach(s => {
           if (s.trim()) items.push(`Subject: ${s.trim()}`);
         });
      }
      const initial = {};
      items.forEach(item => {
        initial[item] = { decision: 'approve', reason: 'Qualifications Verified', comments: '' };
      });
      setScopeDecisions(initial);
    }
  }, [user.scope_requests]);

  useEffect(() => {
    fetchUserData();
  }, [user.id]);

  const fetchUserData = async () => {
    setLoading(true);
    let jobsData = [];
    
    if (user.is_manual) {
      const { data } = await supabase.from('jobs').select('*').eq('manual_client_name', user.display_name).order('created_at', { ascending: false });
      jobsData = data;
    } else {
      const roleCol = user.role === 'client' ? 'client_id' : 'consultant_id';
      const { data } = await supabase.from('jobs').select('*').eq(roleCol, user.id).order('created_at', { ascending: false });
      jobsData = data;
    }
    
    let msgs = [];
    let jobPaymentsMap = {};
    if (jobsData && jobsData.length > 0) {
      const jobIds = jobsData.map(j => j.id);
      
      const { data: payData } = await supabase.from('payments').select('*').in('job_id', jobIds);
      if (payData) {
        payData.forEach(p => {
          jobPaymentsMap[p.job_id] = (jobPaymentsMap[p.job_id] || 0) + Number(p.amount);
        });
      }

      if (!user.is_manual) {
        // Fetch messages from these jobs where sender is this user
        const { data: msgData } = await supabase.from('messages')
          .select('*, jobs(title, job_ref)')
          .eq('sender_id', user.id)
          .in('job_id', jobIds)
          .order('created_at', { ascending: false });
        if (msgData) msgs = msgData;
      }
      
      setJobs(jobsData.map(j => ({...j, total_paid: jobPaymentsMap[j.id] || 0})));
    } else {
      setJobs([]);
    }
    setMessages(msgs);
    setLoading(false);
  };

  const handleScopeDecisionSubmit = async () => {
    if (!user.scope_requests) return;
    try {
      const newLevelsSet = new Set(user.approved_levels || []);
      const newSubjectsSet = new Set(user.approved_subjects || []);
      const approvedItems = [];
      const rejectedItems = [];

      Object.entries(scopeDecisions).forEach(([item, data]) => {
        if (data.decision === 'approve') {
          approvedItems.push(item);
          if (item.startsWith('Level: ')) {
            newLevelsSet.add(item.replace('Level: ', ''));
          } else if (item.startsWith('Subject: ')) {
            newSubjectsSet.add(item.replace('Subject: ', ''));
          }
        } else {
          rejectedItems.push({ item, reason: data.reason, comments: data.comments });
        }
      });

      const { error } = await supabase.from('profiles').update({
        approved_levels: Array.from(newLevelsSet),
        approved_subjects: Array.from(newSubjectsSet),
        scope_requests: null
      }).eq('id', user.id);

      if (error) throw error;
      toast.success('Scope requests processed successfully!');

      // Send summary message
      let msgBody = `Scope Request Processed.\n`;
      if (approvedItems.length > 0) {
        msgBody += `Approved: ${approvedItems.join(', ')}\n`;
      }
      if (rejectedItems.length > 0) {
        msgBody += `Rejected:\n`;
        rejectedItems.forEach(r => {
          msgBody += `- ${r.item} (Reason: ${r.reason}${r.comments ? ' - ' + r.comments : ''})\n`;
        });
      }

      await supabase.from('messages').insert([{
        job_id: null,
        sender_id: adminProfile?.id,
        recipient_id: user.id, // Fixed from receiver_id
        body: msgBody, // Fixed from message
        is_internal: true
      }]);

      const updatedUser = {
        ...user,
        approved_levels: Array.from(newLevelsSet),
        approved_subjects: Array.from(newSubjectsSet),
        scope_requests: null
      };
      
      onUpdate(updatedUser);
    } catch (err) {
      toast.error('Failed to process scope request: ' + err.message);
    }
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
    ? jobs.reduce((sum, j) => sum + Number(j.client_budget || 0), 0)
    : jobs.reduce((sum, j) => sum + Number(j.consultant_payout || 0), 0);

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

          {user.role === 'consultant' && (
            <div style={{display: 'flex', gap: '24px', marginBottom: '24px'}}>
              <div className="card-box" style={{flex: 1}}>
                <div style={{fontWeight: 600, fontSize: '16px', marginBottom: '16px', color: 'var(--blue)'}}>Academic Scope</div>
                <div style={{display: 'flex', gap: '24px'}}>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase'}}>Approved Levels</div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                      {Array.isArray(user.approved_levels) && user.approved_levels.length > 0 ? user.approved_levels.map(l => (
                        <span key={l} className="badge badge-delivered">{l}</span>
                      )) : <span style={{fontSize: '13px', color: 'var(--muted)'}}>{typeof user.approved_levels === 'string' ? user.approved_levels : 'None'}</span>}
                    </div>
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase'}}>Approved Subjects</div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                      {Array.isArray(user.approved_subjects) && user.approved_subjects.length > 0 ? user.approved_subjects.map(s => (
                        <span key={s} className="badge badge-active" style={{background: 'var(--blue)', color: 'white'}}>{s}</span>
                      )) : <span style={{fontSize: '13px', color: 'var(--muted)'}}>{typeof user.approved_subjects === 'string' ? user.approved_subjects : 'None'}</span>}
                    </div>
                  </div>
                </div>

                {user.scope_requests && (
                  <div style={{marginTop: '24px', padding: '16px', background: 'rgba(245,158,11,0.1)', border: '1px solid var(--gold)', borderRadius: '8px'}}>
                    <div style={{fontWeight: 600, fontSize: '14px', color: 'var(--gold)', marginBottom: '16px'}}>Pending Scope Request Adjudication</div>
                    
                    {Object.entries(scopeDecisions).map(([item, data]) => (
                      <div key={item} style={{background: 'var(--bg)', padding: '12px', borderRadius: '4px', marginBottom: '16px', border: '1px solid var(--border)'}}>
                        <div style={{fontWeight: 600, fontSize: '14px', marginBottom: '12px'}}>{item}</div>
                        <div style={{display: 'flex', gap: '16px'}}>
                          <div className="form-group" style={{flex: 1}}>
                            <label className="form-label">Decision</label>
                            <select className="form-input" value={data.decision} onChange={e => setScopeDecisions({...scopeDecisions, [item]: {...data, decision: e.target.value}})}>
                              <option value="approve">Approve</option>
                              <option value="reject">Reject</option>
                            </select>
                          </div>
                          <div className="form-group" style={{flex: 1}}>
                            <label className="form-label">Reasoning</label>
                            <select className="form-input" value={data.reason} onChange={e => setScopeDecisions({...scopeDecisions, [item]: {...data, reason: e.target.value}})}>
                              {data.decision === 'approve' ? (
                                <>
                                  <option>Qualifications Verified</option>
                                  <option>Interview Passed</option>
                                  <option>Exceptional Track Record</option>
                                  <option>Other</option>
                                </>
                              ) : (
                                <>
                                  <option>Incomplete Qualifications</option>
                                  <option>Failed Verification</option>
                                  <option>Not Hiring for this Level</option>
                                  <option>Interview Required</option>
                                  <option>Other</option>
                                </>
                              )}
                            </select>
                          </div>
                        </div>
                        <div className="form-group" style={{marginBottom: 0}}>
                          <label className="form-label">Internal Comments</label>
                          <input type="text" className="form-input" value={data.comments} onChange={e => setScopeDecisions({...scopeDecisions, [item]: {...data, comments: e.target.value}})} placeholder="Notes on this decision..." />
                        </div>
                      </div>
                    ))}

                    {Object.keys(scopeDecisions).length > 0 && (
                      <button className="btn btn-sm" style={{background: 'var(--gold)', color: 'black'}} onClick={handleScopeDecisionSubmit}>
                        Submit All Decisions
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="card-box" style={{width: '350px'}}>
                <div style={{fontWeight: 600, fontSize: '16px', marginBottom: '16px'}}>Private Details</div>
                
                <div style={{marginBottom: '16px'}}>
                  <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase'}}>Bank Details</div>
                  {user.bank_details ? (
                    <div style={{fontSize: '13px', lineHeight: '1.6'}}>
                      <div><strong>Bank:</strong> {user.bank_details.bank_name}</div>
                      <div><strong>Account:</strong> {user.bank_details.account_number} ({user.bank_details.account_type})</div>
                      <div><strong>Branch Code:</strong> {user.bank_details.branch_code}</div>
                    </div>
                  ) : <div style={{fontSize: '13px', color: 'var(--muted)'}}>Not provided</div>}
                </div>

                <div>
                  <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase'}}>Qualifications</div>
                  {user.qualifications_url ? (
                    <a href={supabase.storage.from('credentials').getPublicUrl(user.qualifications_url).data.publicUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" style={{display: 'inline-block', color: 'var(--blue)'}}>
                      View Credential Document →
                    </a>
                  ) : <div style={{fontSize: '13px', color: 'var(--muted)'}}>No document uploaded</div>}
                </div>
              </div>
            </div>
          )}

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
                      {user.role === 'client' && <th style={{padding: '12px 16px', color: 'var(--muted)', textAlign: 'right'}}>Paid</th>}
                      {user.role === 'client' && <th style={{padding: '12px 16px', color: 'var(--muted)', textAlign: 'right'}}>Outstanding</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id} style={{borderBottom: '1px solid var(--border)'}}>
                        <td style={{padding: '12px 16px', fontFamily: 'monospace'}}>{j.job_ref}</td>
                        <td style={{padding: '12px 16px', fontWeight: 600}}>{j.title}</td>
                        <td style={{padding: '12px 16px'}}>
                          <span className={`badge badge-${j.status}`}>{formatStatus(j.status)}</span>
                        </td>
                        <td style={{padding: '12px 16px', textAlign: 'right', color: 'var(--green)'}}>
                          R{user.role === 'client' ? j.client_budget : (j.consultant_payout || 0)}
                        </td>
                        {user.role === 'client' && (
                          <td style={{padding: '12px 16px', textAlign: 'right', fontWeight: 600}}>
                            R{Number(j.total_paid || 0).toFixed(2)}
                          </td>
                        )}
                        {user.role === 'client' && (
                          <td style={{padding: '12px 16px', textAlign: 'right', color: (j.client_budget - (j.total_paid || 0)) > 0 ? 'var(--red)' : 'var(--muted)', fontWeight: (j.client_budget - (j.total_paid || 0)) > 0 ? 600 : 400}}>
                            R{Math.max(0, j.client_budget - (j.total_paid || 0)).toFixed(2)}
                          </td>
                        )}
                      </tr>
                    ))}
                    {jobs.length === 0 && <tr><td colSpan={user.role === 'client' ? 6 : 4} style={{padding: '24px', textAlign: 'center', color: 'var(--muted)'}}>No jobs found.</td></tr>}
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
                You are about to <strong>{formatStatus(actionModal.action)}</strong> the account for {user.display_name}.
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

  const [verifyingUser, setVerifyingUser] = useState(null);
  
  // Verification Checklist State
  const [checklist, setChecklist] = useState({
    id_verified: false,
    qualifications_verified: false,
    experience_linkedin_checked: false,
    rules_agreed: false
  });
  const [verificationNotes, setVerificationNotes] = useState('');
  const [approvedSubjects, setApprovedSubjects] = useState('');
  const [approvedLevels, setApprovedLevels] = useState('');

  const openVerifyModal = (user) => {
    setVerifyingUser(user);
    setChecklist({ id_verified: false, qualifications_verified: false, experience_linkedin_checked: false, rules_agreed: false });
    setVerificationNotes('');
    setApprovedSubjects(user.subjects || '');
    setApprovedLevels(user.academic_level || '');
  };

  const handleVerify = async (user) => {
    // Convert comma-separated string to array for subjects
    const subjectsArray = approvedSubjects.split(',').map(s => s.trim()).filter(Boolean);
    const levelsArray = approvedLevels.split(',').map(l => l.trim()).filter(Boolean);
    
    const verificationData = {
      ...checklist,
      internal_notes: verificationNotes
    };

    const { error } = await supabase.from('profiles').update({ 
      is_verified: true,
      verification_data: verificationData,
      approved_subjects: subjectsArray,
      approved_levels: levelsArray
    }).eq('id', user.id);
    
    if (!error) {
      setUsers(users.map(u => u.id === user.id ? { ...u, is_verified: true, verification_data: verificationData, approved_subjects: subjectsArray, approved_levels: levelsArray } : u));
      sendEmail(user.email, 'Welcome to Gabriel Academics!', EmailTemplates.consultantVerified(user.display_name));
      
      // Also send a platform notification
      await supabase.from('notifications').insert([{
        user_id: user.id,
        title: 'Welcome to Gabriel Academics!',
        body: 'Your consultant application has been verified. Check your dashboard for details on your approved levels and subjects.',
        type: 'alert',
        link: '/consultant'
      }]);
      
      setVerifyingUser(null);
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
      setUsers([{ id: data.user.id, email: formData.email, role: formData.role, display_name: formData.display_name, is_verified: true, is_active: true, created_at: new Date().toISOString() }, ...users]);
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
                     <span className="badge badge-cancelled" style={{fontSize: '10px'}}>{role === 'consultant' ? 'Pending Verification' : 'Suspended'}</span>
                  )}
                </td>
                <td style={{padding: '12px 16px', textAlign: 'right'}}>
                  <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                    {!user.is_active ? null : !user.is_verified && role === 'consultant' && (
                      <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); openVerifyModal(user); }}>Review & Verify</button>
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
                <label className="form-label">Role</label>
                <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="client">Client</option>
                  <option value="consultant">Consultant</option>
                  <option value="admin">Admin</option>
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

      {/* VERIFY CONSULTANT MODAL */}
      {verifyingUser && (
        <div className="modal-bg" onClick={(e) => { if(e.target===e.currentTarget) setVerifyingUser(null); }}>
          <div className="modal" style={{maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'}}>
            <div className="modal-head">
              <div className="modal-title">Verify Consultant Application</div>
              <button className="close-btn" onClick={() => setVerifyingUser(null)}>×</button>
            </div>
            
            <div className="modal-body" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              
              <div style={{background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)'}}>
                <div style={{fontSize: '14px', fontWeight: 600, color: 'var(--blue)', marginBottom: '8px'}}>Applicant Details</div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px'}}>
                  <div><span style={{color: 'var(--muted)'}}>Name:</span> {verifyingUser.display_name}</div>
                  <div><span style={{color: 'var(--muted)'}}>Email:</span> {verifyingUser.email}</div>
                  <div><span style={{color: 'var(--muted)'}}>Phone:</span> {verifyingUser.phone || 'N/A'}</div>
                  <div><span style={{color: 'var(--muted)'}}>Requested Levels:</span> {verifyingUser.academic_level || 'N/A'}</div>
                  <div style={{gridColumn: '1 / -1'}}><span style={{color: 'var(--muted)'}}>Requested Subjects:</span> {verifyingUser.subjects || 'N/A'}</div>
                  <div style={{gridColumn: '1 / -1'}}><span style={{color: 'var(--muted)'}}>Qualifications:</span> {verifyingUser.qualification || 'N/A'}</div>
                  <div style={{gridColumn: '1 / -1'}}><span style={{color: 'var(--muted)'}}>LinkedIn:</span> {verifyingUser.linkedin_url ? <a href={verifyingUser.linkedin_url} target="_blank" rel="noreferrer" style={{color: 'var(--blue)'}}>{verifyingUser.linkedin_url}</a> : 'N/A'}</div>
                  <div style={{gridColumn: '1 / -1'}}><span style={{color: 'var(--muted)'}}>Experience:</span> {verifyingUser.years_experience} years</div>
                </div>
              </div>

              <div>
                <div style={{fontSize: '14px', fontWeight: 600, marginBottom: '8px'}}>Counter-Offer / Approved Specializations</div>
                <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '12px'}}>Adjust the levels and subjects if you want to restrict them to specific areas only. Comma-separated.</div>
                <div className="form-group">
                  <label className="form-label">Approved Levels</label>
                  <input type="text" className="form-input" value={approvedLevels} onChange={e => setApprovedLevels(e.target.value)} placeholder="e.g. Undergraduate, Master's" />
                </div>
                <div className="form-group">
                  <label className="form-label">Approved Subjects</label>
                  <input type="text" className="form-input" value={approvedSubjects} onChange={e => setApprovedSubjects(e.target.value)} placeholder="e.g. Mathematics, Economics" />
                </div>
              </div>

              <div>
                <div style={{fontSize: '14px', fontWeight: 600, marginBottom: '8px'}}>Verification Checklist</div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type="checkbox" checked={checklist.id_verified} onChange={e => setChecklist({...checklist, id_verified: e.target.checked})} />
                    Identity & Contact Details Verified
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type="checkbox" checked={checklist.qualifications_verified} onChange={e => setChecklist({...checklist, qualifications_verified: e.target.checked})} />
                    Academic Qualifications & Degrees Verified
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type="checkbox" checked={checklist.experience_linkedin_checked} onChange={e => setChecklist({...checklist, experience_linkedin_checked: e.target.checked})} />
                    Professional Experience & LinkedIn Profile Checked
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type="checkbox" checked={checklist.rules_agreed} onChange={e => setChecklist({...checklist, rules_agreed: e.target.checked})} />
                    Platform Rules & Plagiarism Policies Understood
                  </label>
                </div>
              </div>

              <div>
                <div style={{fontSize: '14px', fontWeight: 600, marginBottom: '8px'}}>Internal Review Notes</div>
                <textarea className="form-input" rows="3" placeholder="Add any internal notes about this verification... (Visible only to admins)" value={verificationNotes} onChange={e => setVerificationNotes(e.target.value)}></textarea>
              </div>

            </div>
            
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setVerifyingUser(null)}>Cancel</button>
              <button className="btn btn-primary" style={{background: 'var(--green)'}} onClick={() => handleVerify(verifyingUser)} disabled={!checklist.id_verified || !checklist.qualifications_verified || !checklist.experience_linkedin_checked || !checklist.rules_agreed}>
                Approve & Verify Consultant
              </button>
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
  const [clientFilter, setClientFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: jobsData } = await supabase.from('jobs').select('*, profiles!client_id(display_name)');
    const { data: profsData } = await supabase.from('profiles').select('*').eq('role', 'consultant');
    const { data: payData } = await supabase.from('payments').select('*');
    
    let jobPaymentsMap = {};
    if (payData) {
      payData.forEach(p => {
        if (p.job_id) {
          jobPaymentsMap[p.job_id] = (jobPaymentsMap[p.job_id] || 0) + Number(p.amount);
        }
      });
    }

    if (jobsData) {
      setJobs(jobsData.map(j => ({
        ...j,
        total_paid: jobPaymentsMap[j.id] || 0,
        client_name: j.manual_client_name || (j.profiles ? j.profiles.display_name : 'Unknown')
      })));
    }
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

  const totalRevenue = jobs.reduce((sum, j) => sum + Number(j.client_budget || 0), 0);
  const totalPayouts = jobs.reduce((sum, j) => sum + Number(j.consultant_payout || 0), 0);
  const totalMargin = jobs.reduce((sum, j) => sum + Number(j.gabriel_margin || 0), 0);
  
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
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <div className="section-title">Financial Ledger (Jobs)</div>
            <select className="form-input" style={{width: '200px'}} value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
              <option value="">All Clients</option>
              {Array.from(new Set(jobs.map(j => j.client_name))).sort().map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="card-box" style={{padding: 0, overflow: 'hidden'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left'}}>
              <thead>
                <tr style={{background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)'}}>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Ref</th>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Client</th>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Status</th>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Revenue</th>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Paid</th>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Outstanding</th>
                  <th style={{padding: '12px 16px', color: 'var(--muted)'}}>Payout</th>
                  <th style={{padding: '12px 16px', color: 'var(--green)'}}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {jobs.filter(j => !clientFilter || j.client_name === clientFilter).map(job => (
                  <tr key={job.id} style={{borderBottom: '1px solid var(--border)'}}>
                    <td style={{padding: '12px 16px', fontFamily: 'monospace'}}>{job.job_ref}</td>
                    <td style={{padding: '12px 16px', fontWeight: 500}}>{job.client_name}</td>
                    <td style={{padding: '12px 16px'}}>
                      <span className={`badge badge-${job.status}`}>{formatStatus(job.status)}</span>
                    </td>
                    <td style={{padding: '12px 16px', fontWeight: 600}}>R{job.client_budget}</td>
                    <td style={{padding: '12px 16px', fontWeight: 600}}>R{Number(job.total_paid || 0).toFixed(2)}</td>
                    <td style={{padding: '12px 16px', color: (job.client_budget - (job.total_paid || 0)) > 0 ? 'var(--red)' : 'var(--muted)', fontWeight: (job.client_budget - (job.total_paid || 0)) > 0 ? 600 : 400}}>R{Math.max(0, job.client_budget - (job.total_paid || 0)).toFixed(2)}</td>
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { jobs, loading: jobsLoading } = useJobs(profile?.role, profile?.id);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline', 'users', 'finances'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [settings, setSettings] = useState({ default_deadline_buffer_hours: 24, max_cancellation_window_hours: 12, academic_taxonomy: [] });

  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      const { data: profiles, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      
      const { data: manualJobs } = await supabase.from('jobs').select('manual_client_name, created_at').not('manual_client_name', 'is', null);
      
      let allUsers = profiles || [];
      if (manualJobs) {
        const manualClients = [];
        const seenNames = new Set();
        manualJobs.forEach(j => {
          if (!seenNames.has(j.manual_client_name)) {
            seenNames.add(j.manual_client_name);
            manualClients.push({
              id: 'manual_' + j.manual_client_name,
              role: 'client',
              display_name: j.manual_client_name,
              email: 'Offline / Manual Entry',
              is_active: true,
              is_verified: true,
              is_manual: true,
              created_at: j.created_at
            });
          }
        });
        allUsers = [...allUsers, ...manualClients];
      }

      setUsers(allUsers);
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
  const [liveFeed, setLiveFeed] = useState([]);
  const [liveFeedLoading, setLiveFeedLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'live_feed') {
      const fetchFeed = async () => {
        setLiveFeedLoading(true);
        const { data: jobsData } = await supabase.from('jobs').select('id, job_ref, title, status, created_at, client:client_id(display_name)').order('created_at', { ascending: false }).limit(20);
        const { data: messagesData } = await supabase.from('messages').select('id, job_id, body, created_at, sender:sender_id(display_name)').eq('is_internal', true).order('created_at', { ascending: false }).limit(30);
        const { data: profilesData } = await supabase.from('profiles').select('id, display_name, role, created_at').order('created_at', { ascending: false }).limit(20);
        
        let events = [];
        if (jobsData) {
          jobsData.forEach(j => events.push({ id: `job-${j.id}`, type: 'job', title: 'New Job Created', body: `${j.job_ref}: ${j.title} was created by ${j.client?.display_name || 'Client'}.`, created_at: j.created_at, link: '/admin' }));
        }
        if (messagesData) {
          messagesData.forEach(m => {
            if (m.body.startsWith('STATUS_UPDATE:')) {
              events.push({ id: `msg-${m.id}`, type: 'status', title: 'Job Status Updated', body: `Job status changed to ${m.body.split(':')[1].toUpperCase()} by ${m.sender?.display_name || 'System'}.`, created_at: m.created_at, link: '/admin' });
            } else {
              events.push({ id: `msg-${m.id}`, type: 'message', title: 'Internal Note / Action', body: `${m.sender?.display_name || 'System'}: ${m.body}`, created_at: m.created_at, link: '/admin' });
            }
          });
        }
        if (profilesData) {
          profilesData.forEach(p => events.push({ id: `user-${p.id}`, type: 'user', title: 'New User Registered', body: `${p.display_name} registered as a ${p.role}.`, created_at: p.created_at, link: '/admin' }));
        }
        
        events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setLiveFeed(events.slice(0, 50));
        setLiveFeedLoading(false);
      };
      fetchFeed();
    }
  }, [activeTab]);

  const [clientsList, setClientsList] = useState([]);
  const [newJobData, setNewJobData] = useState({ client_id: '', manual_client_name: '', client_reference: '', title: '', subject: '', academic_level: 'Undergraduate', pages: '', reference_style: 'Harvard', description: '', budget: '', deadline: '' });
  const [manualJobFile, setManualJobFile] = useState(null);
  const [manualJobUploading, setManualJobUploading] = useState(false);

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
      setManualJobUploading(true);
      let uploadedUrl = null;
      if (manualJobFile) {
        const fileExt = manualJobFile.name.split('.').pop();
        const fileName = `manual-jobs/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage.from('job-attachments').upload(fileName, manualJobFile);
        if (uploadError) throw uploadError;
        uploadedUrl = data.path;
      }

      const { data: jobRefData, error: rpcError } = await supabase.rpc('generate_job_ref');
      let jobRef = jobRefData || `GA-${Math.floor(1000 + Math.random() * 9000)}`;

      let fullInstructions = newJobData.description;
      if (newJobData.client_reference) {
        fullInstructions = `**Client Reference:** ${newJobData.client_reference}\n\n${fullInstructions}`;
      }

      const { error } = await supabase.from('jobs').insert({
        client_id: newJobData.client_id === 'manual' ? null : newJobData.client_id,
        manual_client_name: newJobData.client_id === 'manual' ? newJobData.manual_client_name : null,
        job_ref: jobRef,
        title: newJobData.title,
        subject: newJobData.subject,
        level: newJobData.academic_level,
        pages: parseInt(newJobData.pages) || 0,
        reference_style: newJobData.reference_style,
        attachment_url: uploadedUrl,
        instructions: fullInstructions,
        client_budget: parseFloat(newJobData.budget),
        deadline: new Date(newJobData.deadline).toISOString(),
        status: 'new' // Set to new so admin can log payment
      });

      if (error) throw error;
      setShowCreateJobModal(false);
      setNewJobData({ client_id: '', manual_client_name: '', client_reference: '', title: '', subject: '', academic_level: 'Undergraduate', pages: '', reference_style: 'Harvard', description: '', budget: '', deadline: '' });
      setManualJobFile(null);
      // Force a reload of jobs (usually handled by real-time or we can just alert)
      toast.success('Job created successfully! It may take a moment to appear.');
    } catch (err) {
      toast.error('Error creating job: ' + err.message);
    } finally {
      setManualJobUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAddTaxonomyLevel = () => {
    const newTax = [...(settings.academic_taxonomy || []), { level: 'New Level', subjects: [] }];
    setSettings({...settings, academic_taxonomy: newTax});
  };

  const handleUpdateTaxonomyLevelName = (idx, name) => {
    const newTax = [...(settings.academic_taxonomy || [])];
    newTax[idx].level = name;
    setSettings({...settings, academic_taxonomy: newTax});
  };

  const handleRemoveTaxonomyLevel = (idx) => {
    const newTax = [...(settings.academic_taxonomy || [])];
    newTax.splice(idx, 1);
    setSettings({...settings, academic_taxonomy: newTax});
  };

  const handleAddTaxonomySubject = (idx) => {
    const newTax = [...(settings.academic_taxonomy || [])];
    newTax[idx].subjects.push('New Subject');
    setSettings({...settings, academic_taxonomy: newTax});
  };

  const handleUpdateTaxonomySubject = (idx, sIdx, val) => {
    const newTax = [...(settings.academic_taxonomy || [])];
    newTax[idx].subjects[sIdx] = val;
    setSettings({...settings, academic_taxonomy: newTax});
  };

  const handleRemoveTaxonomySubject = (idx, sIdx) => {
    const newTax = [...(settings.academic_taxonomy || [])];
    newTax[idx].subjects.splice(sIdx, 1);
    setSettings({...settings, academic_taxonomy: newTax});
  };

  const handleSaveSettings = async () => {
    try {
      const updates = [
        { setting_key: 'default_deadline_buffer_hours', setting_value: settings.default_deadline_buffer_hours },
        { setting_key: 'max_cancellation_window_hours', setting_value: settings.max_cancellation_window_hours },
        { setting_key: 'academic_taxonomy', setting_value: settings.academic_taxonomy }
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
      logMilestone(job.id, 'posted');
      setSelectedJob(null);
      setActiveTab('pipeline');
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
      setActiveTab('pipeline');
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
      toast.success("Work delivered to client!");
      logMilestone(job.id, 'delivered');
      setSelectedJob(null);
      setActiveTab('pipeline');

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
      toast.success('Feedback sent to consultant! Job moved to Revisions.');
      logMilestone(job.id, 'qa_failed');
      setSelectedJob(null);
      setActiveTab('pipeline');

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
    ((j.title || '').toString().toLowerCase().includes((searchQuery || '').toLowerCase()) || 
     (j.job_ref || '').toString().toLowerCase().includes((searchQuery || '').toLowerCase()))
  );

  // Finances
  const totalGabrielMargin = jobs.filter(j => j.status === 'delivered').reduce((sum, j) => sum + Number(j.gabriel_margin || 0), 0);

  return (
    <ErrorBoundary>
      <div id="app-shell">
      <div className="topbar">
        <div className="brand" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} style={{background:'none',border:'none',color:'var(--text)',alignItems:'center',cursor:'pointer',padding:0}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
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
        {isMobileMenuOpen && <div className="mobile-menu-overlay open" onClick={() => setIsMobileMenuOpen(false)}></div>}
        <div className={"sidebar " + (isMobileMenuOpen ? "open" : "")}>
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
            
            <div className="nav-label" style={{marginTop: '24px'}}>Activity</div>
            <div className={`nav-item ${activeTab === 'live_feed' ? 'active' : ''}`} onClick={() => { setActiveTab('live_feed'); markAllAsRead(); }} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              Live Feed
              {unreadCount > 0 && <span className="badge" style={{background: 'var(--blue)', color: 'white', padding: '2px 6px', fontSize: '10px'}}>{unreadCount}</span>}
            </div>
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
                <div key={job.id} className="pipe-card" onClick={() => { setSelectedJob(job); setActiveTab('job_detail'); }}>
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
                <div key={job.id} className="pipe-card" onClick={() => { setSelectedJob(job); setActiveTab('job_detail'); }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div className="pipe-ref">{job.job_ref}</div>
                    <span className={`badge badge-${job.status}`} style={{fontSize: '9px', padding: '2px 4px'}}>{formatStatus(job.status)}</span>
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
                <div key={job.id} className="pipe-card" style={{borderColor: 'var(--purple)'}} onClick={() => { setSelectedJob(job); setActiveTab('job_detail'); }}>
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
                <div key={job.id} className="pipe-card" onClick={() => { setSelectedJob(job); setActiveTab('job_detail'); }}>
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
          {activeTab === 'live_feed' && (
            <div style={{padding: '24px', flex: 1, overflowY: 'auto'}}>
              <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div className="page-title">Live Feed</div>
                  <div className="page-sub">Real-time log of all platform activities.</div>
                </div>
                {unreadCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={markAllAsRead}>Mark All as Read</button>
                )}
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px'}}>
                {liveFeedLoading ? (
                  <div className="card-box empty" style={{padding: '32px', textAlign: 'center', color: 'var(--muted)'}}>Loading live feed...</div>
                ) : liveFeed.length === 0 ? (
                  <div className="card-box empty" style={{padding: '32px', textAlign: 'center', color: 'var(--muted)'}}>No activities to display.</div>
                ) : (
                  liveFeed.map(notif => (
                    <div key={notif.id} className="card-box" style={{display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px', borderLeft: '3px solid var(--blue)'}}>
                      <div style={{width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0}}>
                        {notif.type === 'job' ? '📄' : notif.type === 'status' ? '🔄' : notif.type === 'user' ? '👤' : '💬'}
                      </div>
                      <div style={{flex: 1}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                          <div style={{fontWeight: 600, fontSize: '14px', color: 'var(--blue)'}}>{notif.title}</div>
                          <div style={{fontSize: '11px', color: 'var(--muted)'}}>{new Date(notif.created_at).toLocaleString()}</div>
                        </div>
                        <div style={{fontSize: '13px', color: 'var(--text)', lineHeight: '1.5', marginBottom: notif.link ? '8px' : '0'}}>{notif.body}</div>
                        {notif.link && (
                          <div style={{fontSize: '12px', color: 'var(--blue)', cursor: 'pointer', fontWeight: 500}} onClick={() => setActiveTab('pipeline')}>View Details →</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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

                <div style={{marginTop: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border)'}}>
                  <button className="btn btn-primary" onClick={handleSaveSettings}>Save Configuration</button>
                </div>

                <div style={{fontWeight: 600, fontSize: '16px', marginBottom: '16px', marginTop: '24px'}}>Academic Taxonomy (Levels & Subjects)</div>
                <div className="form-note" style={{marginBottom: '16px'}}>Manage the dropdown choices consultants see when applying for subjects.</div>
                
                {(settings.academic_taxonomy || []).map((tax, idx) => (
                  <div key={idx} style={{marginBottom: '20px', padding: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px'}}>
                    <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                      <input className="form-input" style={{flex: 1, fontWeight: 600}} value={tax.level} onChange={e => handleUpdateTaxonomyLevelName(idx, e.target.value)} placeholder="Level Name (e.g. Primary School)" />
                      <button className="btn btn-sm" style={{background: 'var(--red)', color: 'white'}} onClick={() => handleRemoveTaxonomyLevel(idx)}>Remove Level</button>
                    </div>
                    
                    <div style={{paddingLeft: '16px', borderLeft: '2px solid var(--border)'}}>
                      <div style={{fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--muted)'}}>Subjects under this Level</div>
                      {(tax.subjects || []).map((sub, sIdx) => (
                        <div key={sIdx} style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                          <input className="form-input" style={{flex: 1}} value={sub} onChange={e => handleUpdateTaxonomySubject(idx, sIdx, e.target.value)} placeholder="Subject Name" />
                          <button className="btn btn-sm" style={{color: 'var(--red)', background: 'transparent', border: '1px solid var(--border)'}} onClick={() => handleRemoveTaxonomySubject(idx, sIdx)}>X</button>
                        </div>
                      ))}
                      <button className="btn btn-sm" style={{background: 'transparent', border: '1px dashed var(--gold)', color: 'var(--gold)', marginTop: '8px'}} onClick={() => handleAddTaxonomySubject(idx)}>+ Add Subject</button>
                    </div>
                  </div>
                ))}
                
                <button className="btn btn-sm" style={{background: 'var(--blue)', color: 'white'}} onClick={handleAddTaxonomyLevel}>+ Add New Academic Level</button>
                
                <div style={{marginTop: '24px'}}>
                  <button className="btn btn-primary" onClick={handleSaveSettings}>Save Taxonomy Changes</button>
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
                      <tr key={job.id} style={{borderBottom: '1px solid var(--border)', cursor: 'pointer'}} onClick={() => { setSelectedJob(job); setActiveTab('job_detail'); }} className="hover-row">
                        <td style={{padding: '12px 16px', fontFamily: 'monospace', color: 'var(--gold)'}}>{job.job_ref}</td>
                        <td style={{padding: '12px 16px', fontWeight: 500}}>{job.title}</td>
                        <td style={{padding: '12px 16px'}}><span className={`badge badge-${job.status}`} style={{fontSize: '10px', padding: '2px 4px'}}>{formatStatus(job.status)}</span></td>
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
          
          {activeTab === 'job_detail' && selectedJob && (
            <AdminJobDetail 
              job={selectedJob} 
              profile={profile} 
              onBack={() => { setSelectedJob(null); setActiveTab('pipeline'); }} 
              onPost={handlePostJob} 
              onPassQA={handlePassQA} 
              onFailQA={handleFailQA} 
              onWithdraw={handleWithdrawJob}
              onUpdateStatus={async (jobId, newStatus) => {
                const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId);
                if (error) toast.error('Error updating status: ' + error.message);
                else {
                  // Log the status change internally
                  await supabase.from('messages').insert({
                    job_id: jobId,
                    sender_id: profile.id,
                    recipient_id: selectedJob.client_id, // keep it client facing so they see order progress, or we can use is_internal
                    body: `STATUS_UPDATE:${newStatus}`,
                    is_internal: true
                  });
                  toast.success(`Status updated to ${newStatus}`);
                  logMilestone(jobId, newStatus);
                  setSelectedJob(null);
                  setActiveTab('pipeline');
                }
              }}
            />
          )}
        </div>
      </div>

      {actionModal.isOpen && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Confirm Action</div>
              <button className="close-btn" onClick={() => setActionModal({ isOpen: false, action: null })}>×</button>
            </div>
            <div className="modal-body">
              <div style={{marginBottom: '16px'}}>
                You are about to <strong>{formatStatus(actionModal.action)}</strong> the account for {user.display_name}.
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
                <div style={{display: 'flex', gap: '16px'}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label className="form-label">Manual Client Name</label>
                    <input type="text" className="form-input" placeholder="e.g. John Doe (Offline)" value={newJobData.manual_client_name} onChange={e => setNewJobData({...newJobData, manual_client_name: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label className="form-label">Client Reference (Optional)</label>
                    <input type="text" className="form-input" placeholder="e.g. REF-1234" value={newJobData.client_reference} onChange={e => setNewJobData({...newJobData, client_reference: e.target.value})} />
                  </div>
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

              <div style={{display: 'flex', gap: '16px'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label className="form-label">Word Count / Pages</label>
                  <input type="number" className="form-input" placeholder="e.g. 5" value={newJobData.pages} onChange={e => setNewJobData({...newJobData, pages: e.target.value})} />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label className="form-label">Referencing Style</label>
                  <select className="form-input" value={newJobData.reference_style} onChange={e => setNewJobData({...newJobData, reference_style: e.target.value})}>
                    <option value="Harvard">Harvard</option>
                    <option value="APA">APA 7th</option>
                    <option value="MLA">MLA</option>
                    <option value="Chicago">Chicago / Turabian</option>
                    <option value="OSCOLA">OSCOLA</option>
                    <option value="None">None required</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Job Attachment (Optional)</label>
                <input type="file" className="form-input" onChange={e => setManualJobFile(e.target.files[0])} />
                <div className="form-note">Upload the assignment brief or related documents.</div>
              </div>

              <div className="form-group">
                <label className="form-label">Instructions / Description</label>
                <textarea className="form-input" rows="4" placeholder="Provide detailed instructions for the consultant..." value={newJobData.description} onChange={e => setNewJobData({...newJobData, description: e.target.value})}></textarea>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowCreateJobModal(false)} disabled={manualJobUploading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateManualJob} disabled={manualJobUploading}>
                {manualJobUploading ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
