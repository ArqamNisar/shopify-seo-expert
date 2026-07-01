import React, { useState } from 'react';

export default function ProductAudit({
  product,
  auditReport,
  onRunAudit,
  isAuditing,
  onStartOptimize,
  onBack
}) {
  // Score indicator colors
  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--seo-green)';
    if (score >= 50) return 'var(--seo-orange)';
    return 'var(--seo-red)';
  };

  const getScoreBgGlow = (score) => {
    if (score >= 80) return 'var(--seo-green-glow)';
    if (score >= 50) return 'var(--seo-orange-glow)';
    return 'var(--seo-red-glow)';
  };

  const circumference = 2 * Math.PI * 70; // r = 70
  const score = auditReport ? auditReport.overall_score : 0;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          ⬅ Back to Catalog
        </button>
        {auditReport && (
          <button className="btn btn-primary" onClick={onStartOptimize}>
            Go to Optimizer Agent 🤖
          </button>
        )}
      </div>

      <div className="audit-container">
        {/* Left Side: Product Summary and Score */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <img
            src={product.images && product.images.length > 0 ? product.images[0].src : 'https://placehold.co/300x200?text=No+Image'}
            alt={product.title}
            style={{ width: '120px', height: '120px', borderRadius: '12px', objectFit: 'cover', marginBottom: '1rem', border: '1px solid var(--border-color)' }}
          />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{product.title}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Product ID: {product.id}</p>

          {!auditReport ? (
            <div style={{ margin: '2rem 0', width: '100%' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                This product has not been audited yet. Trigger the SEO Expert Analyzer Agent to generate a detailed report.
              </p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={onRunAudit} disabled={isAuditing}>
                {isAuditing ? (
                  <>
                    <span className="spinner spinner-purple" style={{ width: '16px', height: '16px', borderWidth: '2px', display: 'inline-block', marginRight: '8px' }}></span>
                    Agent Analyzing...
                  </>
                ) : 'Run SEO Audit Agent 🔍'}
              </button>
            </div>
          ) : (
            <div style={{ width: '100%' }}>
              {/* Circular Progress Ring */}
              <div className="score-ring-container">
                <svg className="score-ring-svg">
                  <circle className="score-ring-bg" cx="80" cy="80" r="70" />
                  <circle
                    className="score-ring-bar"
                    cx="80"
                    cy="80"
                    r="70"
                    stroke={getScoreColor(score)}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="score-ring-text">
                  <span className="score-ring-number" style={{ color: getScoreColor(score) }}>{score}</span>
                  <span className="score-ring-label">SEO Score</span>
                </div>
              </div>

              {/* Mini Breakdown Cards */}
              <div className="scores-breakdown-grid">
                <div className="score-mini-card">
                  <label>Title</label>
                  <span style={{ color: getScoreColor(auditReport.scores.title_score) }}>
                    {auditReport.scores.title_score}
                  </span>
                </div>
                <div className="score-mini-card">
                  <label>Description</label>
                  <span style={{ color: getScoreColor(auditReport.scores.description_score) }}>
                    {auditReport.scores.description_score}
                  </span>
                </div>
                <div className="score-mini-card">
                  <label>Images</label>
                  <span style={{ color: getScoreColor(auditReport.scores.images_score) }}>
                    {auditReport.scores.images_score}
                  </span>
                </div>
                <div className="score-mini-card">
                  <label>Tags</label>
                  <span style={{ color: getScoreColor(auditReport.scores.tags_score) }}>
                    {auditReport.scores.tags_score}
                  </span>
                </div>
              </div>

              {/* Keywords Card */}
              {auditReport.keywords_detected && auditReport.keywords_detected.length > 0 && (
                <div style={{ marginTop: '1.5rem', textAlign: 'left', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Keywords Detected</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {auditReport.keywords_detected.map((kw, i) => (
                      <span key={i} style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        🔑 {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent Diagnosis Text */}
              <div style={{ marginTop: '1.5rem', textAlign: 'left', background: 'rgba(139, 92, 246, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.15)' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#c084fc', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', gap: '0.25rem' }}>
                  <span>🤖</span> Diagnostic Reasoning
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {auditReport.agent_reasoning}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Audit Issues Details */}
        <div className="glass-card">
          <h2>🕵️ SEO Audit Findings</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Actionable optimization tasks recommended by the SEO Agent.
          </p>

          {!auditReport ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-muted)' }}>
              <p>No audit details available.</p>
              <p style={{ fontSize: '0.8rem' }}>Trigger the audit agent above to start diagnosing.</p>
            </div>
          ) : auditReport.issues && auditReport.issues.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--seo-green)', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem' }}>🎉</span>
              <p style={{ fontWeight: 600, marginTop: '0.5rem' }}>Perfect SEO Health!</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No optimization warnings found for this product.</p>
            </div>
          ) : (
            <div className="issues-list">
              {auditReport.issues && auditReport.issues.map((issue, idx) => (
                <div key={idx} className={`issue-item ${issue.severity}`}>
                  <span className={`issue-badge ${issue.severity}`}>{issue.severity}</span>
                  <div className="issue-content">
                    <p>{issue.message}</p>
                    <div className="issue-type">Component: {issue.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
