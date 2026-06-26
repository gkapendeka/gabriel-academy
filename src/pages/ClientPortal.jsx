import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/useProfile';
import { useJobs } from '../lib/useJobs';
import { useMessages } from '../lib/useMessages';
import { useNotifications } from '../lib/useNotifications';
import { NotificationBell } from '../components/NotificationBell';

// Icons mapping based on HTML app
const icon = (name) => {
  const icons = {
    dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    newjob: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    myjobs: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    payments: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    messages: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    profile: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
    send: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
  };
  return icons[name] || null;
};

// Utilities
const fmt = (n) => 'R' + parseFloat(n || 0).toLocaleString('en-ZA', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const fmtDate = (d) => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-ZA', {day:'2-digit',month:'short',year:'numeric'}); };
const daysLeft = (d) => { if (!d) return '—'; const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24)); return diff <= 0 ? 'Overdue!' : diff + ' day' + (diff === 1 ? '' : 's'); };
const daysLeftColor = (d) => { if (!d) return 'var(--muted)'; const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24)); return diff <= 2 ? 'var(--red)' : diff <= 5 ? 'var(--gold)' : 'var(--muted)'; };
const statusLabel = (s) => { const m = {new:'New',posted:'Posted',pending:'Awaiting Consultant',active:'In Progress',submitted:'Submitted',qa_review:'QA Review',qa_failed:'QA Failed',delivered:'Delivered',disputed:'Disputed',cancelled:'Cancelled'}; return m[s] || s; };

function StatusBadge({ status }) {
  const isGreen = status === 'delivered';
  const isBlue = status === 'active';
  const isPurple = status === 'qa_review' || status === 'submitted';
  const isRed = status === 'qa_failed' || status === 'new';
  const isGold = !isGreen && !isBlue && !isPurple && !isRed;
  
  const dotClass = `dot dot-${isGreen ? 'green' : isBlue ? 'blue' : isPurple ? 'purple' : isRed ? 'red' : 'gold'}`;
  return (
    <span className={`badge badge-${status}`}>
      <span className={dotClass}></span>{statusLabel(status)}
    </span>
  );
}

// Modals
function JobModal({ job, profile, onClose }) {
  const { messages, sendMessage } = useMessages(job.id, profile.id);
  const [msgText, setMsgText] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const handleSend = () => {
    if (!msgText.trim()) return;
    sendMessage(msgText, null);
    setMsgText('');
  };

  const handleDownloadWork = async (e) => {
    e.stopPropagation();
    try {
      const { data, error } = await supabase.storage.from('work_submissions').createSignedUrl(job.submission_url, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      alert('Error downloading file: ' + err.message);
    }
  };

  const handleReview = async () => {
    try {
      const { error } = await supabase.from('reviews').insert([{
        job_id: job.id,
        client_id: profile.id,
        rating,
        comment
      }]);
      if (error) throw error;
      setReviewSubmitted(true);
    } catch (err) {
      alert('Error submitting review: ' + err.message);
    }
  };

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{maxWidth: '800px'}}>
        <div className="modal-head">
          <div className="modal-title">Order Details: <span className="mono" style={{color:'var(--blue)'}}>{job.job_ref}</span></div>
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
                  <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>Status</div>
                  <div style={{fontSize: '13px'}}>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card-box" style={{marginTop: '16px'}}>
              <div className="card-box-title" style={{fontSize: '14px', marginBottom: '16px'}}>Order Progress</div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative'}}>
                {/* Visual Line */}
                <div style={{position: 'absolute', left: '11px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border)'}}></div>
                
                <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative'}}>
                  <div style={{width: '24px', height: '24px', borderRadius: '50%', background: 'var(--green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', zIndex: 1}}>✓</div>
                  <div>
                    <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text)'}}>Request Created</div>
                    <div style={{fontSize: '12px', color: 'var(--muted)'}}>You submitted the academic request.</div>
                  </div>
                </div>

                {job.status !== 'new' && (
                  <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative'}}>
                    <div style={{width: '24px', height: '24px', borderRadius: '50%', background: 'var(--green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', zIndex: 1}}>✓</div>
                    <div>
                      <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text)'}}>Payment Secured</div>
                      <div style={{fontSize: '12px', color: 'var(--muted)'}}>Funds have been allocated for this order.</div>
                    </div>
                  </div>
                )}

                {['active', 'submitted', 'qa_review', 'qa_failed', 'delivered', 'completed'].includes(job.status) && (
                  <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative'}}>
                    <div style={{width: '24px', height: '24px', borderRadius: '50%', background: 'var(--green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', zIndex: 1}}>✓</div>
                    <div>
                      <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text)'}}>Consultant Assigned</div>
                      <div style={{fontSize: '12px', color: 'var(--muted)'}}>An expert consultant is actively working on your request.</div>
                    </div>
                  </div>
                )}

                {['submitted', 'qa_review', 'qa_failed', 'delivered', 'completed'].includes(job.status) && (
                  <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative'}}>
                    <div style={{width: '24px', height: '24px', borderRadius: '50%', background: ['delivered', 'completed'].includes(job.status) ? 'var(--green)' : 'var(--blue)', color: ['delivered', 'completed'].includes(job.status) ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', zIndex: 1}}>
                      {['delivered', 'completed'].includes(job.status) ? '✓' : '●'}
                    </div>
                    <div>
                      <div style={{fontWeight: 600, fontSize: '13px', color: ['delivered', 'completed'].includes(job.status) ? 'var(--text)' : 'var(--blue)'}}>QA Review & Follow-up</div>
                      <div style={{fontSize: '12px', color: 'var(--muted)'}}>
                        {job.status === 'qa_failed' ? 'Our QA team requested revisions from the consultant to ensure top quality.' : 
                         job.status === 'delivered' || job.status === 'completed' ? 'Work passed quality assurance checks.' :
                         'The consultant submitted the work. Our Academic Team is currently reviewing it for quality.'}
                      </div>
                    </div>
                  </div>
                )}

                {['delivered', 'completed'].includes(job.status) && (
                  <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative'}}>
                    <div style={{width: '24px', height: '24px', borderRadius: '50%', background: 'var(--green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', zIndex: 1}}>✓</div>
                    <div>
                      <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--green)'}}>Order Delivered</div>
                      <div style={{fontSize: '12px', color: 'var(--muted)'}}>Your final work is ready to download!</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {job.status === 'delivered' && job.submission_url && (
              <div className="card-box" style={{borderColor: 'var(--green)', background: 'rgba(16,185,129,0.05)'}}>
                <div className="card-box-title" style={{color: 'var(--green)'}}>Work Delivered!</div>
                <div style={{fontSize: '13px', marginBottom: '12px'}}>Your academic request has been completed and passed our QA checks.</div>
                <button onClick={handleDownloadWork} className="btn btn-primary" style={{background: 'var(--green)', marginBottom: '16px'}}>{icon('download')} Download Final Work</button>
                
                {!reviewSubmitted && (
                  <div style={{borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px'}}>
                    <div style={{fontWeight: 600, marginBottom: '8px'}}>Leave a Review</div>
                    <div className="form-group">
                      <select className="form-input" value={rating} onChange={e => setRating(parseInt(e.target.value))}>
                        <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                        <option value="4">⭐⭐⭐⭐ Good</option>
                        <option value="3">⭐⭐⭐ Average</option>
                        <option value="2">⭐⭐ Poor</option>
                        <option value="1">⭐ Terrible</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <textarea className="form-input" placeholder="Any comments?" value={comment} onChange={e => setComment(e.target.value)}></textarea>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleReview}>Submit Review</button>
                  </div>
                )}
                {reviewSubmitted && (
                  <div style={{color: 'var(--green)', marginTop: '8px', fontSize: '13px'}}>✓ Review submitted. Thank you!</div>
                )}
              </div>
            )}
          </div>

          <div style={{flex: 1, border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '400px'}}>
            <div style={{padding: '12px', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--card)'}}>Messages with Support</div>
            <div style={{flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {messages.filter(m => !m.is_internal && m.sender?.role !== 'consultant').length === 0 ? (
                <div style={{color: 'var(--muted)', fontSize: '12px', textAlign: 'center', marginTop: '20px'}}>No messages yet. Send a message to Gabriel Support.</div>
              ) : (
                messages.filter(m => !m.is_internal && m.sender?.role !== 'consultant').map(m => (
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
        </div>
      </div>
    </div>
  );
}

function MockCheckoutModal({ job, onClose, onSuccess }) {
  const [processing, setProcessing] = useState(false);

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      onSuccess(job);
    }, 1500);
  };

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget && !processing) onClose(); }}>
      <div className="modal" style={{maxWidth: '400px', textAlign: 'center'}}>
        <div style={{fontSize: '24px', marginBottom: '16px'}}>🔒 Secure Checkout</div>
        <div style={{fontSize: '14px', color: 'var(--muted)', marginBottom: '24px'}}>
          You are paying for request: <strong className="mono">{job.job_ref}</strong>
        </div>
        <div style={{fontSize: '32px', fontWeight: 700, color: 'var(--green)', marginBottom: '24px'}}>
          {fmt(job.client_budget)}
        </div>
        
        <div style={{background: 'var(--bg)', padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'left'}}>
          <div className="form-group">
            <label className="form-label">Card Number (Demo Mode)</label>
            <input type="text" className="form-input" defaultValue="4242 4242 4242 4242" disabled />
          </div>
          <div style={{display: 'flex', gap: '12px', marginBottom: 0}}>
            <div className="form-group" style={{flex: 1, marginBottom: 0}}>
              <label className="form-label">Expiry</label>
              <input type="text" className="form-input" defaultValue="12/26" disabled />
            </div>
            <div className="form-group" style={{flex: 1, marginBottom: 0}}>
              <label className="form-label">CVC</label>
              <input type="text" className="form-input" defaultValue="123" disabled />
            </div>
          </div>
        </div>

        <div style={{display: 'flex', gap: '12px'}}>
          <button className="btn btn-ghost" onClick={onClose} style={{flex: 1}} disabled={processing}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePay} style={{flex: 2, background: 'var(--green)'}} disabled={processing}>
            {processing ? 'Processing...' : `Pay ${fmt(job.client_budget)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientPortal() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { jobs, loading: jobsLoading } = useJobs(profile?.role, profile?.id);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotif, setShowNotif] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(profile?.id);
  
  const [selectedJob, setSelectedJob] = useState(null);
  const [checkoutJob, setCheckoutJob] = useState(null);
  
  // Forms and other data
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  
  // Custom Alerts & Confirms
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const [formData, setFormData] = useState({
    title: '', subject: '', custom_subject: '', level: '', pages: 1, deadline: '', client_budget: 0, instructions: '', reference_style: 'APA 7th', files: []
  });
  const [uploading, setUploading] = useState(false);
  
  const [profileForm, setProfileForm] = useState({ display_name: '', phone: '' });

  useEffect(() => {
    if (profile) setProfileForm({ display_name: profile.display_name || '', phone: profile.phone || '' });
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'payments' && profile?.id) {
      fetchPayments();
    }
  }, [activeTab, profile]);

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    const { data } = await supabase.from('payments').select('*,jobs(job_ref,title)').eq('client_id', profile.id).order('created_at', { ascending: false });
    if (data) setPayments(data);
    setPaymentsLoading(false);
  };

  const handlePaymentSuccess = async (job) => {
    try {
      const { error } = await supabase.from('jobs').update({ status: 'paid' }).eq('id', job.id);
      if (error) throw error;
      
      // Also create payment record
      await supabase.from('payments').insert({
        client_id: profile.id,
        job_id: job.id,
        amount: job.client_budget,
        method: 'Card (Demo)',
        status: 'cleared',
        payment_ref: 'PAY-' + Math.floor(100000 + Math.random() * 900000)
      });
      
      setCheckoutJob(null);
      if (activeTab === 'payments') fetchPayments();
    } catch (err) {
      alert('Payment error: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDeleteRequest = async (jobId) => {
    setConfirmDialog({
      title: 'Delete Request',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('jobs').delete().eq('id', jobId);
          if (error) throw error;
          showToast('Request deleted successfully!', 'success');
          // Update local state without full reload
          window.location.reload(); 
        } catch (err) {
          showToast('Error deleting request: ' + err.message, 'error');
        }
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const submitNewRequest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!profile) return;
    setUploading(true);

    try {
      // Handle file uploads
      const uploadedAttachments = [];
      for (const file of formData.files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('job_attachments').upload(filePath, file);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('job_attachments').getPublicUrl(filePath);
        uploadedAttachments.push({ name: file.name, url: urlData.publicUrl });
      }

      const finalSubject = formData.subject === 'Other' ? formData.custom_subject : formData.subject;

      const { error } = await supabase.from('jobs').insert([{
        title: formData.title,
        subject: finalSubject,
        level: formData.level,
        pages: formData.pages,
        deadline: new Date(formData.deadline).toISOString(),
        client_confirmed_deadline: formData.confirmed_deadline ? new Date(formData.confirmed_deadline).toISOString() : new Date(formData.deadline).toISOString(),
        client_budget: formData.client_budget,
        instructions: formData.instructions,
        reference_style: formData.reference_style,
        attachments: uploadedAttachments,
        client_id: profile.id,
        source: 'client_self',
        status: 'new'
      }]);
      if (error) throw error;
      showToast('Request submitted successfully!', 'success');
      setActiveTab('myjobs');
      setFormData({ title: '', subject: '', custom_subject: '', level: '', pages: 1, deadline: '', client_budget: 0, instructions: '', reference_style: 'APA 7th', files: [] });
    } catch (err) {
      showToast('Error creating request: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('profiles').update({ display_name: profileForm.display_name, phone: profileForm.phone }).eq('id', profile.id);
      if (error) throw error;
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast('Error updating profile: ' + err.message, 'error');
    }
  };

  if (profileLoading || jobsLoading) return <div className="empty"><span className="spinner"></span></div>;

  return (
    <div id="app-shell">
      <div className="topbar">
        <div className="brand" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} style={{background:'none',border:'none',color:'var(--text)',alignItems:'center',cursor:'pointer',padding:0}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
          <div className="brand-mark" style={{background: 'rgba(59,130,246,.15)', color: 'var(--blue)'}}>GA</div>
          <div>
            <div className="brand-name">Gabriel Academics</div>
            <div className="brand-role">Client Portal</div>
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
            <div className="user-av" style={{background: 'rgba(59,130,246,.2)', color: 'var(--blue)'}}>{profile?.display_name?.charAt(0) || 'C'}</div>
            <div className="user-name">{profile?.display_name || 'Client'}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
      
      {/* Toast Notification */}
      {toast && (
        <div id="toast">
          <div className={`toast-item ${toast.type}`}>
            {toast.type === 'success' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            )}
            {toast.message}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="modal-bg" style={{zIndex: 9998, backdropFilter: 'blur(4px)'}} onClick={confirmDialog.onCancel}>
          <div className="modal" style={{maxWidth: '400px', overflow: 'hidden'}} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{padding: '32px 24px', textAlign: 'center'}}>
              <div style={{width: '56px', height: '56px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--red)'}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </div>
              <div style={{fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)'}}>{confirmDialog.title}</div>
              <div style={{fontSize: '14px', color: 'var(--muted)', lineHeight: '1.5'}}>{confirmDialog.message}</div>
            </div>
            <div className="modal-foot" style={{background: 'rgba(0,0,0,.2)', padding: '16px 24px', display: 'flex', gap: '12px', borderTop: '1px solid var(--border)'}}>
              <button className="btn btn-ghost" onClick={confirmDialog.onCancel} style={{flex: 1}}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDialog.onConfirm} style={{flex: 1, background: 'var(--red)', color: '#fff', borderColor: 'var(--red)'}}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
      
      {showNotif && (
        <div id="notif-panel" className="notif-panel" style={{display: 'block'}}>
          <div style={{padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontSize: '13px', fontWeight: 600}}>Notifications</span>
            <button className="btn btn-ghost btn-xs" onClick={markAllNotifRead}>Mark all read</button>
          </div>
          {notifications.length === 0 ? (
            <div style={{padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px'}}>No notifications</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`notif-item ${!n.read_at ? 'unread' : ''}`} onClick={() => markNotifRead(n.id)}>
                <div className="notif-title">{n.title}</div>
                <div className="notif-body">{n.body}</div>
                <div className="notif-time">{fmtDate(n.created_at)}</div>
              </div>
            ))
          )}
        </div>
      )}
      
      <div className="layout">
        {isMobileMenuOpen && <div className="mobile-menu-overlay open" onClick={() => setIsMobileMenuOpen(false)}></div>}
        <div className={"sidebar " + (isMobileMenuOpen ? "open" : "")}>
          <div className="nav-section">
            <div className="nav-label">My Portal</div>
            <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>{icon('dashboard')} Dashboard</div>
            <div className={`nav-item ${activeTab === 'newjob' ? 'active' : ''}`} onClick={() => setActiveTab('newjob')}>{icon('newjob')} New Request</div>
            <div className={`nav-item ${activeTab === 'myjobs' ? 'active' : ''}`} onClick={() => setActiveTab('myjobs')}>{icon('myjobs')} My Orders</div>
          </div>
          <div className="nav-section">
            <div className="nav-label">Account</div>
            <div className={`nav-item ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>{icon('payments')} My Payments</div>
            <div className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>{icon('messages')} Messages</div>
            <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>{icon('profile')} My Profile</div>
          </div>
        </div>
        
        <div className="main">
          {activeTab === 'dashboard' && <TabDashboard jobs={jobs} profile={profile} setActiveTab={setActiveTab} setCheckoutJob={setCheckoutJob} setSelectedJob={setSelectedJob} handleDeleteRequest={handleDeleteRequest} />}
          {activeTab === 'newjob' && <TabNewJob formData={formData} setFormData={setFormData} submitNewRequest={submitNewRequest} setActiveTab={setActiveTab} uploading={uploading} />}
          {activeTab === 'myjobs' && <TabMyJobs jobs={jobs} setSelectedJob={setSelectedJob} setCheckoutJob={setCheckoutJob} handleDeleteRequest={handleDeleteRequest} />}
          {activeTab === 'payments' && <TabPayments payments={payments} loading={paymentsLoading} />}
          {activeTab === 'messages' && <TabMessages jobs={jobs} profile={profile} />}
          {activeTab === 'profile' && <TabProfile profile={profile} profileForm={profileForm} setProfileForm={setProfileForm} updateProfile={updateProfile} />}
        </div>
      </div>

      {selectedJob && <JobModal job={selectedJob} profile={profile} onClose={() => setSelectedJob(null)} />}
      {checkoutJob && <MockCheckoutModal job={checkoutJob} onClose={() => setCheckoutJob(null)} onSuccess={handlePaymentSuccess} />}
    </div>
  );
}

function TabDashboard({ jobs, profile, setActiveTab, setCheckoutJob, setSelectedJob, handleDeleteRequest }) {
  const activeCount = jobs.filter(j => ['posted','pending','active','submitted','qa_review'].includes(j.status)).length;
  const doneCount = jobs.filter(j => j.status === 'delivered').length;
  const spent = jobs.reduce((s, j) => s + parseFloat(j.client_budget || 0), 0);
  const recentJobs = jobs.slice(0, 5);

  return (
    <>
      <div className="page-header"><div className="page-title">My Dashboard</div><div className="page-sub">Track your academic assistance orders</div></div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Active Orders</div><div className="stat-value" style={{color: 'var(--blue)'}}>{activeCount}</div></div>
        <div className="stat-card"><div className="stat-label">Delivered</div><div className="stat-value" style={{color: 'var(--green)'}}>{doneCount}</div></div>
        <div className="stat-card"><div className="stat-label">Total Invested</div><div className="stat-value" style={{color: 'var(--gold)'}}>{fmt(spent)}</div></div>
        <div className="stat-card"><div className="stat-label">My ID</div><div className="stat-value" style={{fontSize: '16px', color: 'var(--blue)'}}>{profile?.masked_id || '—'}</div></div>
      </div>
      
      <div className="shield-banner">
        {icon('shield')}
        <div><strong>Your Identity is Protected</strong>No consultant will ever see your name, email, or contact details. All communication flows through Gabriel Academics.</div>
      </div>
      
      <div className="section-header">
        <span className="section-title">Recent Orders</span>
        <button className="btn btn-gold btn-sm" onClick={() => setActiveTab('newjob')}>{icon('newjob')} New Request</button>
      </div>
      
      {recentJobs.length === 0 ? (
        <div className="empty"><div className="empty-icon">📋</div><div className="empty-text">No orders yet. Submit your first request.</div></div>
      ) : (
        recentJobs.map(j => (
          <div key={j.id} className="card-box" onClick={() => setSelectedJob(j)} style={{cursor: 'pointer'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                <div className="mono" style={{color: 'var(--blue)', fontSize: '11px', marginBottom: '4px'}}>{j.job_ref || '—'}</div>
                <div style={{fontSize: '14px', fontWeight: 600}}>{j.title}</div>
                <div style={{fontSize: '12px', color: 'var(--muted)', marginTop: '3px'}}>{j.level || ''} · {j.pages || '?'} pages · Due {daysLeft(j.deadline)}</div>
              </div>
              <div style={{textAlign: 'right'}}>
                <StatusBadge status={j.status} />
                <div style={{fontSize: '13px', color: 'var(--green)', fontWeight: 600, marginTop: '6px'}}>{fmt(j.client_budget)}</div>
              </div>
            </div>
            {j.status === 'new' && (
              <div style={{marginTop: '10px', display: 'flex', gap: '8px'}}>
                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setCheckoutJob(j); }} style={{background: 'var(--green)'}}>Pay Now</button>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(j.id); }} style={{color: 'var(--red)'}}>{icon('trash')} Delete</button>
              </div>
            )}
            {j.status === 'delivered' && (
              <div style={{marginTop: '10px', display: 'flex', gap: '8px'}}>
                <button className="btn btn-primary btn-xs" onClick={(e) => { e.stopPropagation(); setSelectedJob(j); }}>{icon('download')} Download & Rate</button>
              </div>
            )}
            {['posted','pending'].includes(j.status) && (
              <div style={{marginTop: '8px', fontSize: '12px', color: 'var(--gold)'}}>Gabriel Academics is finding the best consultant for your assignment...</div>
            )}
          </div>
        ))
      )}
    </>
  );
}

function TabNewJob({ formData, setFormData, submitNewRequest, setActiveTab, uploading }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [checks, setChecks] = useState({ accurate: false, nocost: false, tos: false, confirmed_deadline: '' });

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const allChecked = checks.accurate && checks.nocost && checks.tos && checks.confirmed_deadline === formData.deadline;

  return (
    <>
      <div className="page-header"><div className="page-title">New Academic Request</div><div className="page-sub">Tell us exactly what you need — we handle everything else</div></div>
      <div className="card-box">
        <div className="shield-banner">{icon('shield')}<div><strong>Your identity is fully protected</strong>You will never be contacted by or identified to any consultant.</div></div>
        <form onSubmit={handleInitialSubmit}>
          <div className="form-group"><label className="form-label">Assignment Title / Topic *</label><input required className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Research Proposal on AI in South African Banking" /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Subject / Discipline *</label>
              <select required className="form-input" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                <option value="">Select subject...</option>
                <option>Mathematics</option>
                <option>Physics</option>
                <option>Computer Science</option>
                <option>Business</option>
                <option>Economics</option>
                <option>English Literature</option>
                <option>Other</option>
              </select>
              {formData.subject === 'Other' && (
                <input required type="text" className="form-input" style={{marginTop: '8px'}} placeholder="Please specify subject..." value={formData.custom_subject} onChange={e => setFormData({...formData, custom_subject: e.target.value})} />
              )}
            </div>
            <div className="form-group"><label className="form-label">Academic Level *</label>
              <select required className="form-input" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}>
                <option value="">Select level...</option>
                <option>Primary School</option>
                <option>Secondary School</option>
                <option>Undergraduate</option>
                <option>Postgraduate (Honours)</option>
                <option>Postgraduate (Masters/PhD)</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Number of Pages *</label><input required type="number" min="1" className="form-input" value={formData.pages} onChange={e => setFormData({...formData, pages: parseInt(e.target.value)})} placeholder="e.g. 8" /></div>
            <div className="form-group"><label className="form-label">Deadline *</label><input required type="date" className="form-input" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="form-label">Assignment Instructions *</label><textarea required className="form-input" rows="5" value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})} placeholder="Paste your full assignment brief, rubric, or specific instructions here."></textarea></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Reference Style</label>
              <select className="form-input" value={formData.reference_style} onChange={e => setFormData({...formData, reference_style: e.target.value})}>
                <option>APA 7th</option><option>Harvard</option><option>MLA</option><option>Chicago</option><option>Vancouver</option><option>None specified</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Budget (R) *</label><input required type="number" min="100" className="form-input" value={formData.client_budget} onChange={e => setFormData({...formData, client_budget: parseFloat(e.target.value)})} placeholder="e.g. 1500" /><div className="form-note">A quote will be confirmed before payment</div></div>
          </div>
          <div className="form-group">
            <label className="form-label">Attachments</label>
            <input type="file" multiple className="form-input" style={{padding: '8px'}} onChange={e => setFormData({...formData, files: Array.from(e.target.files)})} />
            <div className="form-note">Upload rubrics, readings, or past examples (optional)</div>
          </div>
          <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px'}}>
            <button type="button" className="btn btn-ghost" onClick={() => setActiveTab('myjobs')} disabled={uploading}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={uploading}>{uploading ? 'Submitting...' : <>{icon('send')} Continue</>}</button>
          </div>
        </form>
      </div>

      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h2>Confirm Submission</h2>
              <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <p style={{fontSize: '13px', color: 'var(--muted)'}}>Please confirm the following details before submitting your request. This ensures a smooth process.</p>
              
              <label style={{display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer'}}>
                <input type="checkbox" style={{marginTop: '4px'}} checked={checks.accurate} onChange={e => setChecks({...checks, accurate: e.target.checked})} />
                <span style={{fontSize: '13px'}}>I confirm that all instructions, rubrics, and requirements provided are complete and accurate to the best of my knowledge.</span>
              </label>

              <label style={{display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer'}}>
                <input type="checkbox" style={{marginTop: '4px'}} checked={checks.nocost} onChange={e => setChecks({...checks, nocost: e.target.checked})} />
                <span style={{fontSize: '13px'}}>I understand that significantly changing the instructions after the consultant begins work may incur additional costs or delays.</span>
              </label>

              <label style={{display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer'}}>
                <input type="checkbox" style={{marginTop: '4px'}} checked={checks.tos} onChange={e => setChecks({...checks, tos: e.target.checked})} />
                <span style={{fontSize: '13px'}}>I agree to the <a href="/tos" target="_blank" style={{color: 'var(--blue)'}}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{color: 'var(--blue)'}}>Privacy Policy</a>.</span>
              </label>

              <div style={{marginTop: '8px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px'}}>
                <label className="form-label" style={{marginBottom: '4px'}}>Please re-enter your requested deadline to confirm:</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={checks.confirmed_deadline} 
                  onChange={e => setChecks({...checks, confirmed_deadline: e.target.value})} 
                  style={{borderColor: checks.confirmed_deadline ? (checks.confirmed_deadline === formData.deadline ? 'var(--green)' : 'var(--red)') : 'var(--border)'}}
                />
                {checks.confirmed_deadline && checks.confirmed_deadline !== formData.deadline && (
                  <div style={{color: 'var(--red)', fontSize: '11px', marginTop: '4px'}}>Dates do not match. Original deadline was {formData.deadline}</div>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{marginTop: '24px'}}>
              <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)} disabled={uploading}>Cancel</button>
              <button 
                className="btn btn-gold" 
                disabled={!allChecked || uploading} 
                onClick={() => {
                  setShowConfirmModal(false);
                  // Pass the confirmed deadline to the form data for submitNewRequest
                  setFormData(prev => ({...prev, confirmed_deadline: checks.confirmed_deadline}));
                  setTimeout(() => submitNewRequest(), 0);
                }}
              >
                {uploading ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabMyJobs({ jobs, setSelectedJob, setCheckoutJob, handleDeleteRequest }) {
  return (
    <>
      <div className="page-header"><div className="page-title">My Orders</div><div className="page-sub">{jobs.length} total orders</div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Order ID</th><th>Assignment</th><th>Level</th><th>Deadline</th><th>Paid / Budget</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {jobs.length === 0 ? <tr><td colSpan="7" style={{textAlign: 'center', padding: '30px', color: 'var(--muted)'}}>No orders yet</td></tr> : jobs.map(j => (
              <tr key={j.id} onClick={() => setSelectedJob(j)} style={{cursor: 'pointer'}}>
                <td className="mono" style={{color: 'var(--blue)'}}>{j.job_ref || '—'}</td>
                <td style={{maxWidth: '180px', fontSize: '12px'}}>{j.title}</td>
                <td style={{fontSize: '12px', color: 'var(--muted)'}}>{j.level || '—'}</td>
                <td style={{fontSize: '12px', color: daysLeftColor(j.deadline)}}>{daysLeft(j.deadline)}</td>
                <td style={{color: 'var(--green)', fontWeight: 600}}>{fmt(j.client_budget)}</td>
                <td><StatusBadge status={j.status} /></td>
                <td style={{textAlign: 'right'}}>
                  {j.status === 'new' && (
                    <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                      <button className="btn btn-xs btn-primary" onClick={(e) => { e.stopPropagation(); setCheckoutJob(j); }} style={{background: 'var(--green)'}}>Pay Now</button>
                      <button className="btn btn-xs btn-ghost" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(j.id); }} style={{color: 'var(--red)', padding: '0 4px'}}>{icon('trash')}</button>
                    </div>
                  )}
                  {j.status === 'delivered' && <button className="btn btn-xs btn-primary">{icon('download')} Download</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TabPayments({ payments, loading }) {
  if (loading) return <div className="empty"><span className="spinner"></span></div>;
  return (
    <>
      <div className="page-header"><div className="page-title">My Payments</div><div className="page-sub">Payment history and invoices</div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Ref</th><th>Order</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {payments.length === 0 ? <tr><td colSpan="5" style={{textAlign: 'center', padding: '30px', color: 'var(--muted)'}}>No payments yet</td></tr> : payments.map(p => (
              <tr key={p.id}>
                <td className="mono" style={{color: 'var(--blue)'}}>{p.payment_ref || '—'}</td>
                <td className="mono" style={{fontSize: '12px'}}>{p.jobs?.job_ref || '—'}</td>
                <td style={{fontWeight: 600, color: 'var(--green)'}}>{fmt(p.amount)}</td>
                <td style={{fontSize: '12px', color: 'var(--muted)'}}>{fmtDate(p.created_at)}</td>
                <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TabMessages({ jobs, profile }) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || null);
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const { messages, sendMessage } = useMessages(selectedJobId, profile?.id);
  const [msgText, setMsgText] = useState('');

  const handleSend = () => {
    if (!msgText.trim() || !selectedJobId) return;
    sendMessage(msgText, null);
    setMsgText('');
  };

  return (
    <>
      <div className="page-header"><div className="page-title">Messages</div><div className="page-sub">Communicate with Gabriel Support</div></div>
      <div className="two-col">
        <div style={{background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden'}}>
          <div style={{padding: '12px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontWeight: 600}}>Your Orders</div>
          <div>
            {jobs.length === 0 ? <div style={{padding: '20px', color: 'var(--muted)', fontSize: '13px', textAlign: 'center'}}>No orders to message about</div> : jobs.map(j => (
              <div key={j.id} onClick={() => setSelectedJobId(j.id)} style={{padding: '12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedJobId === j.id ? 'rgba(59,130,246,0.1)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div className="mono" style={{fontSize: '11px', color: 'var(--blue)'}}>{j.job_ref}</div>
                  <div style={{fontSize: '13px', fontWeight: 500, marginTop: '4px'}}>{j.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', height: '60vh'}}>
          <div style={{padding: '12px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontWeight: 600}}>
            {selectedJob ? `Support Chat: ${selectedJob.job_ref}` : 'Select an order'}
          </div>
          <div style={{flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {!selectedJobId ? <div style={{margin: 'auto', color: 'var(--muted)'}}>Select an order to view messages</div> : messages.filter(m => !m.is_internal && m.sender?.role !== 'consultant').length === 0 ? (
              <div style={{margin: 'auto', color: 'var(--muted)', textAlign: 'center', fontSize: '13px'}}>No messages yet. Send a message to Support.</div>
            ) : (
              messages.filter(m => !m.is_internal && m.sender?.role !== 'consultant').map(m => (
                <div key={m.id} style={{alignSelf: m.sender_id === profile.id ? 'flex-end' : 'flex-start', background: m.sender_id === profile.id ? 'var(--blue)' : 'var(--bg)', padding: '8px 12px', borderRadius: '8px', maxWidth: '80%', fontSize: '13px', border: m.sender_id !== profile.id ? '1px solid var(--border)' : 'none'}}>
                  <div style={{fontSize: '10px', opacity: 0.7, marginBottom: '4px'}}>{m.sender?.role === 'admin' ? 'Gabriel Support' : 'You'}</div>
                  {m.body}
                </div>
              ))
            )}
          </div>
          <div style={{padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px'}}>
            <input type="text" className="form-input" placeholder="Type a message..." value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={!selectedJobId} />
            <button className="btn btn-primary" onClick={handleSend} disabled={!selectedJobId}>{icon('send')} Send</button>
          </div>
        </div>
      </div>
    </>
  );
}

function TabProfile({ profile, profileForm, setProfileForm, updateProfile }) {
  return (
    <>
      <div className="page-header"><div className="page-title">My Profile</div><div className="page-sub">Manage your account details</div></div>
      <div className="card-box" style={{maxWidth: '500px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px'}}>
          <div className="user-av" style={{width: '60px', height: '60px', fontSize: '24px', background: 'rgba(59,130,246,.2)', color: 'var(--blue)'}}>{profile?.display_name?.charAt(0) || 'C'}</div>
          <div>
            <div style={{fontSize: '18px', fontWeight: 600}}>{profile?.display_name || 'Client'}</div>
            <div className="mono" style={{fontSize: '12px', color: 'var(--muted)', marginTop: '4px'}}>ID: {profile?.masked_id}</div>
          </div>
        </div>
        <form onSubmit={updateProfile}>
          <div className="form-group">
            <label className="form-label">Email Address (Cannot be changed)</label>
            <input type="email" className="form-input" value={profile?.email || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input type="text" className="form-input" required value={profileForm.display_name} onChange={e => setProfileForm({...profileForm, display_name: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="e.g. +27 82 123 4567" />
          </div>
          <button type="submit" className="btn btn-primary">Save Changes</button>
        </form>
      </div>
    </>
  );
}
