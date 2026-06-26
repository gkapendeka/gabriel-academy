import React, { useState, useRef, useEffect } from 'react';

export function NotificationBell({ notifications, unreadCount, markAsRead, markAllAsRead }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ 
          cursor: 'pointer', 
          position: 'relative', 
          width: '36px', 
          height: '36px', 
          borderRadius: '50%', 
          background: 'rgba(255,255,255,0.1)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          transition: 'background 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
      >
        <span style={{ fontSize: '18px' }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: 'var(--red)',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 5px',
            borderRadius: '10px',
            minWidth: '16px',
            textAlign: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '48px',
          right: '0',
          width: '320px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Notifications</div>
            {unreadCount > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); markAllAsRead(); }} 
                style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '12px', cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => { if (!notif.is_read) markAsRead(notif.id); setIsOpen(false); }}
                  style={{ 
                    padding: '12px 16px', 
                    borderBottom: '1px solid var(--border)', 
                    background: notif.is_read ? 'transparent' : 'rgba(59,130,246,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: notif.is_read ? 500 : 600, fontSize: '13px', color: notif.is_read ? 'var(--text)' : 'var(--blue)' }}>
                      {notif.title}
                    </div>
                    {!notif.is_read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)', marginTop: '4px' }}></div>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.4' }}>{notif.message}</div>
                  <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '4px' }}>{new Date(notif.created_at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
