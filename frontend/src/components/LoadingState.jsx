import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState() {
  return (
    <div className="loading-container">
      <Loader2 size={24} className="spinner" />
    </div>
  );
}
