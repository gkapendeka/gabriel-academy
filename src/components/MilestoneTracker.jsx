import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MILESTONES = [
  { id: 'requested', label: 'Requested', statuses: ['new', 'pending'] },
  { id: 'sourcing', label: 'Sourcing Consultant', statuses: ['posted'] },
  { id: 'in_progress', label: 'In Progress', statuses: ['active', 'qa_failed'] },
  { id: 'review', label: 'Under Review', statuses: ['submitted', 'qa_review'] },
  { id: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { id: 'completed', label: 'Completed', statuses: ['completed'] }
];

const STATUS_TO_STEP = {
  'new': 0, 'pending': 0,
  'posted': 1,
  'active': 2, 'qa_failed': 2,
  'submitted': 3, 'qa_review': 3,
  'delivered': 4,
  'completed': 5
};

export function MilestoneTracker({ job }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!job || !job.id) return;
    
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('messages')
        .select('body, created_at')
        .eq('job_id', job.id)
        .eq('is_internal', true)
        .like('body', '[MILESTONE]:%')
        .order('created_at', { ascending: true });
        
      if (data) {
        setHistory(data);
      }
    };
    
    fetchHistory();
  }, [job]);

  if (!job) return null;

  const currentStepIndex = STATUS_TO_STEP[job.status] ?? -1;
  const isCancelled = job.status === 'cancelled';
  const isDisputed = job.status === 'disputed';

  // Build timestamps map
  const timestamps = { 0: job.created_at }; // Step 0 is always job creation
  
  history.forEach(msg => {
    const status = msg.body.replace('[MILESTONE]: ', '').trim();
    const stepIdx = STATUS_TO_STEP[status];
    if (stepIdx !== undefined && !timestamps[stepIdx]) {
      timestamps[stepIdx] = msg.created_at;
    }
  });

  if (isCancelled) {
    return (
      <div style={{padding: '24px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px', textAlign: 'center'}}>
        <div style={{width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px'}}>
          ✖
        </div>
        <div style={{fontWeight: 600, fontSize: '18px', color: 'var(--red)', marginBottom: '8px'}}>Job Cancelled</div>
        <div style={{color: 'var(--muted)', fontSize: '14px'}}>This job has been cancelled and is no longer active.</div>
      </div>
    );
  }

  if (isDisputed) {
    return (
      <div style={{padding: '24px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px', textAlign: 'center'}}>
        <div style={{width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px'}}>
          ⚠
        </div>
        <div style={{fontWeight: 600, fontSize: '18px', color: 'var(--gold)', marginBottom: '8px'}}>Job Disputed</div>
        <div style={{color: 'var(--muted)', fontSize: '14px'}}>This job is currently under dispute resolution.</div>
      </div>
    );
  }

  return (
    <div style={{padding: '32px 24px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px', overflowX: 'auto'}}>
      <div style={{fontWeight: 600, fontSize: '16px', marginBottom: '32px', color: 'var(--text)'}}>Digital Footprint Tracker</div>
      
      <div style={{display: 'flex', justifyContent: 'space-between', position: 'relative', minWidth: '600px', margin: '0 auto'}}>
        {/* Background Line */}
        <div style={{position: 'absolute', top: '16px', left: '40px', right: '40px', height: '3px', background: 'var(--border)', zIndex: 0}} />
        
        {/* Active Line */}
        <div style={{
          position: 'absolute', top: '16px', left: '40px', 
          width: currentStepIndex > 0 ? `calc(${(currentStepIndex / (MILESTONES.length - 1)) * 100}% - 80px)` : '0%', 
          height: '3px', background: 'var(--green)', zIndex: 1,
          transition: 'width 0.5s ease'
        }} />

        {MILESTONES.map((milestone, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;
          const isFuture = idx > currentStepIndex;
          
          let circleColor = 'var(--bg)';
          let borderColor = 'var(--border)';
          let textColor = 'var(--muted)';
          
          if (isCompleted) {
            circleColor = 'var(--green)';
            borderColor = 'var(--green)';
            textColor = 'var(--text)';
          } else if (isActive) {
            circleColor = 'var(--card)';
            borderColor = 'var(--blue)';
            textColor = 'var(--blue)';
          }

          return (
            <div key={milestone.id} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '100px', flexShrink: 0}}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', 
                background: circleColor, border: `3px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isCompleted ? '#000' : (isActive ? 'var(--blue)' : 'var(--muted)'),
                fontWeight: 700, fontSize: '14px', marginBottom: '12px',
                boxShadow: isActive ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                {isCompleted ? '✓' : (idx + 1)}
              </div>
              
              <div style={{fontWeight: isActive ? 600 : 500, fontSize: '12px', color: textColor, textAlign: 'center', marginBottom: '4px'}}>
                {milestone.label}
              </div>
              
              <div style={{fontSize: '10px', color: 'var(--dim)', textAlign: 'center', minHeight: '14px'}}>
                {timestamps[idx] ? new Date(timestamps[idx]).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : (isFuture ? 'Pending' : '')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
