'use client';

import { useState, useEffect } from 'react';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'unconfigured'>('unconfigured');
  const [provider, setProvider] = useState<string>('');

  const updateStatus = () => {
    const connectionStatus = localStorage.getItem('connection-status') as 'connected' | 'disconnected' | 'unconfigured' | null;
    const connectionProvider = localStorage.getItem('connection-provider') || '';

    setStatus(connectionStatus || 'unconfigured');
    setProvider(connectionProvider);
  };

  useEffect(() => {
    // Initial load
    updateStatus();

    // Listen for changes
    const handleStatusChange = () => updateStatus();
    window.addEventListener('connection-status-changed', handleStatusChange);

    return () => {
      window.removeEventListener('connection-status-changed', handleStatusChange);
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'unconfigured':
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return `Connected to ${provider}`;
      case 'disconnected':
        return 'Connection failed';
      case 'unconfigured':
        return 'Not configured';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span>{getStatusText()}</span>
      </div>
    </div>
  );
}
