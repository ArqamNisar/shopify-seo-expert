import React, { useEffect, useRef } from 'react';

export default function AgentLog({ logs = [] }) {
  const consoleEndRef = useRef(null);

  useEffect(() => {
    // Auto scroll to bottom when new logs arrive
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="glass-card agent-console-card">
      <div className="console-header">
        <div className="console-title">
          <span className="agent-pulse"></span>
          Agent Thought Console
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Active System Logging
        </div>
      </div>
      <div className="console-body">
        {logs.length === 0 ? (
          <div className="console-line system">
            &gt; Waiting for agent execution... Select a product to run an SEO Audit.
          </div>
        ) : (
          logs.map((log, index) => {
            let className = "console-line";
            if (log.type === 'agent') className += " agent";
            if (log.type === 'system') className += " system";
            if (log.type === 'success') className += " success";
            
            return (
              <div key={index} className={className}>
                {log.text.startsWith('>') ? '' : '> '}{log.text}
              </div>
            );
          })
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
