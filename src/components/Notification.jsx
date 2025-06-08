import React, { useEffect } from 'react';
import '../styles/notification.css';

const Notification = ({ 
  message, 
  type = 'info', // 'info', 'warning', 'error'
  isVisible, 
  onClose,
  autoCloseTime = 3000 // Auto close after 3 seconds by default
}) => {
  // Auto-close the notification after the specified time
  useEffect(() => {
    // if (isVisible && autoCloseTime > 0) { // Temporarily disable auto-close
    //   const timer = setTimeout(() => {
    //     onClose();
    //   }, autoCloseTime);
      
    //   // Clean up the timer
    //   return () => clearTimeout(timer);
    // }
  }, [isVisible, autoCloseTime, onClose]);

  if (!isVisible) return null;
  
  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        <p>{message}</p>
        <button className="notification-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification; 