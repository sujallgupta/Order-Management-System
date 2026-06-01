import React from 'react';
import { Loader2, Info } from 'lucide-react';

export default function LoadingState({ message = 'Loading data...' }) {
  return (
    <div className="loading-container">
      <Loader2 size={24} className="spinner" />
      <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
        {message}
      </span>
      <div className="loading-note">
        <Info size={14} className="loading-note-icon" />
        <span style={{ textAlign: 'left' }}>
          <strong>Render Free-Tier Notice:</strong> The backend is hosted on Render's free tier, which sleeps after inactivity. The first API request can take up to <strong>50–60 seconds</strong> to wake it up. Thank you for your patience!
        </span>
      </div>
    </div>
  );
}
