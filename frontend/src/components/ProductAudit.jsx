import React from 'react';

function SerpPreview({ title, description, shopifyUrl = '', handle = '' }) {
  const [device, setDevice] = React.useState('desktop');
  
  const cleanUrl = shopifyUrl ? shopifyUrl.replace('https://', '').replace('http://', '') : 'store.myshopify.com';
  
  // Truncate logic
  const displayTitle = title && title.length > 60 ? title.substring(0, 57) + '...' : title;
  const displayDesc = description && description.length > 160 ? description.substring(0, 157) + '...' : description;
  
  return (
    <div className={`serp-preview-container ${device}`} style={{ width: '100%', marginTop: '1.25rem' }}>
      <div className="serp-preview-header">
        <span>🔍 Search Snippet Preview</span>
        <div className="serp-device-toggles">
          <button 
            type="button"
            className={`serp-device-btn ${device === 'desktop' ? 'active' : ''}`}
            onClick={() => setDevice('desktop')}
          >
            🖥️ Desktop
          </button>
          <button 
            type="button"
            className={`serp-device-btn ${device === 'mobile' ? 'active' : ''}`}
            onClick={() => setDevice('mobile')}
          >
            📱 Mobile
          </button>
        </div>
      </div>
      
      <div className="serp-url-line">
        <span className="serp-favicon">🛍️</span>
        <span className="serp-breadcrumbs">
          {cleanUrl} › products › {handle || 'product-url'}
        </span>
      </div>
      
      <div className="serp-title">
        {displayTitle || 'Please enter title'}
      </div>
      
      <div className="serp-description">
        {displayDesc || 'Please enter meta description'}
      </div>
    </div>
  );
}

export default function ProductAudit({
  product,
  auditReport,
  shopifyUrl = '',
  targetKeyword = '',
  onTargetKeywordChange,
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

  const getMetafieldValue = (namespace, key) => {
    if (!product || !product.metafields_list) return null;
    const mf = product.metafields_list.find(
      m => m.namespace === namespace && m.key === key
    );
    return mf ? mf.value : null;
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const metaTitle = getMetafieldValue('global', 'title_tag') || product.title || '';
  const metaDescription = getMetafieldValue('global', 'description_tag') || stripHtml(product.body_html || product.description || '');

  const reportObj = Array.isArray(auditReport) ? auditReport[0] : auditReport;

  // Calculate the total score directly from the sum of the checks to guarantee consistency
  const calculateTotalScore = () => {
    if (!reportObj || !reportObj.checks) return 0;
    return reportObj.checks.reduce((sum, check) => {
      const val = Object.values(check)[0];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
  };

  const score = reportObj 
    ? (reportObj.checks ? calculateTotalScore() : (reportObj.seo_score !== undefined ? reportObj.seo_score : reportObj.overall_score)) 
    : 0;

  const circumference = 2 * Math.PI * 70; // r = 70
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getCheckScore = (key) => {
    if (!reportObj || !reportObj.checks) return 0;
    const checkItem = reportObj.checks.find(c => Object.keys(c)[0] === key);
    return checkItem ? Object.values(checkItem)[0] : 0;
  };

  const CHECK_METADATA = {
    keyword_in_title: { label: "Keyword in Title", max: 5, desc: "Check if the primary search keyword is present in the title." },
    product_name_in_handle: { label: "Product Name in Handle", max: 10, desc: "Verify if the URL handle contains the exact product name for SEO-friendly URLs." },
    meta_title_set: { label: "Meta Title Set", max: 10, desc: "Check if search engine listing page title (meta title) is configured." },
    product_type_relevant: { label: "Product Type Set & Relevant", max: 5, desc: "Ensure the product type categorizes the product correctly." },
    meta_title_length: { label: "Meta Title Length (30-60)", max: 10, desc: "Ideal meta title length is between 30 and 60 characters to avoid search result truncation." },
    content_quality: { label: "Content Quality & Length (>300 words)", max: 10, desc: "Description length should exceed 300 words with rich, informative content." },
    meta_description_set: { label: "Meta Description Set", max: 10, desc: "Check if search engine listing snippet (meta description) is configured." },
    meta_description_length: { label: "Meta Description Length (120-190)", max: 10, desc: "Meta description should be between 120 and 190 characters for ideal search layout." },
    internal_links: { label: "Internal Links", max: 5, desc: "At least one internal page/product/collection link (<a href>) should be present in description HTML." },
    image_count: { label: "Image Count (>= 3)", max: 5, desc: "Product should have at least 3 high-quality product images." },
    alt_text: { label: "Image Alt Texts", max: 5, desc: "Verify altText is present for all images to support image visual search." },
    relevant_tags: { label: "Relevant Tags (>= 2)", max: 5, desc: "Product should have at least 2 relevant product tags." },
    status_active: { label: "Status Active", max: 5, desc: "Product status must be ACTIVE so search engines can index it." },
    metafields: { label: "Custom Metafields (>= 1)", max: 5, desc: "At least one custom metafield should be defined on the product." }
  };

  // Re-calculate percentages for mini-scores breakdown
  const titleScorePercent = reportObj && reportObj.checks
    ? Math.round(((getCheckScore('keyword_in_title') + getCheckScore('product_name_in_handle') + getCheckScore('meta_title_set') + getCheckScore('meta_title_length')) / 35) * 100)
    : 0;

  const descScorePercent = reportObj && reportObj.checks
    ? Math.round(((getCheckScore('content_quality') + getCheckScore('meta_description_set') + getCheckScore('meta_description_length') + getCheckScore('internal_links')) / 35) * 100)
    : 0;

  const imagesScorePercent = reportObj && reportObj.checks
    ? Math.round(((getCheckScore('image_count') + getCheckScore('alt_text')) / 10) * 100)
    : 0;

  const tagsScorePercent = reportObj && reportObj.checks
    ? Math.round(((getCheckScore('relevant_tags') + getCheckScore('status_active') + getCheckScore('metafields') + getCheckScore('product_type_relevant')) / 20) * 100)
    : 0;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          ⬅ Back to Catalog
        </button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {reportObj && (
            <>
              <button className="btn btn-secondary" onClick={() => onRunAudit(targetKeyword)} disabled={isAuditing}>
                {isAuditing ? 'Analyzing...' : 'Re-run SEO Audit 🔄'}
              </button>
              <button className="btn btn-primary" onClick={onStartOptimize}>
                Go to Optimizer Agent 🤖
              </button>
            </>
          )}
        </div>
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
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Product ID: {product.id}</p>

          {/* Target Keyword Input Field */}
          <div style={{ margin: '0rem 0 1.25rem', width: '100%', textAlign: 'left' }}>
            <label htmlFor="target-keyword-input" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Target SEO Keyword / Phrase (optional)
            </label>
            <input
              id="target-keyword-input"
              type="text"
              placeholder="e.g. robotic arm kits, servo motor"
              className="form-control"
              style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              value={targetKeyword}
              onChange={(e) => onTargetKeywordChange(e.target.value)}
              disabled={isAuditing}
            />
          </div>

          {!reportObj ? (
            <div style={{ margin: '1rem 0', width: '100%' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                This product has not been audited yet. Trigger the SEO Expert Analyzer Agent to generate a detailed report.
              </p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onRunAudit(targetKeyword)} disabled={isAuditing}>
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
                  <span style={{ color: getScoreColor(titleScorePercent) }}>
                    {titleScorePercent}%
                  </span>
                </div>
                <div className="score-mini-card">
                  <label>Description</label>
                  <span style={{ color: getScoreColor(descScorePercent) }}>
                    {descScorePercent}%
                  </span>
                </div>
                <div className="score-mini-card">
                  <label>Images</label>
                  <span style={{ color: getScoreColor(imagesScorePercent) }}>
                    {imagesScorePercent}%
                  </span>
                </div>
                <div className="score-mini-card">
                  <label>Tags & Meta</label>
                  <span style={{ color: getScoreColor(tagsScorePercent) }}>
                    {tagsScorePercent}%
                  </span>
                </div>
              </div>

              {/* Diagnostic Reasoning Box */}
              <div style={{ marginTop: '1.5rem', textAlign: 'left', background: 'rgba(139, 92, 246, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.15)' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#c084fc', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', gap: '0.25rem' }}>
                  <span>🤖</span> Diagnostic Reasoning
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {reportObj.agent_reasoning}
                </p>
              </div>
            </div>
          )}

          <SerpPreview 
            title={metaTitle} 
            description={metaDescription} 
            shopifyUrl={shopifyUrl} 
            handle={product.handle} 
          />
        </div>

        {/* Right Side: Audit Issues Details */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>🕵️ SEO Audit Findings</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
            Actionable optimization tasks evaluated by the SEO Agent.
          </p>

          {!reportObj ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-muted)' }}>
              <p>No audit details available.</p>
              <p style={{ fontSize: '0.85rem' }}>Trigger the audit agent to start diagnosing.</p>
            </div>
          ) : !reportObj.checks ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-muted)' }}>
              <p>Old audit format detected.</p>
              <p style={{ fontSize: '0.85rem' }}>Please run the SEO Audit Agent again to use the new 14-point check system.</p>
            </div>
          ) : (
            <div className="issues-list" style={{ paddingRight: '0.5rem' }}>
              {Object.entries(CHECK_METADATA).map(([key, meta]) => {
                const s = getCheckScore(key);
                const isFull = s === meta.max;
                const isFailed = s === 0;
                
                const borderColor = isFull ? 'var(--seo-green)' : (isFailed ? 'var(--seo-red)' : 'var(--seo-orange)');
                const bgColor = isFull ? 'var(--seo-green-glow)' : (isFailed ? 'var(--seo-red-glow)' : 'var(--seo-orange-glow)');
                const badgeLabel = isFull ? 'Perfect' : (isFailed ? 'Missing / Fail' : 'Partial');
                const badgeClass = isFull ? 'low' : (isFailed ? 'high' : 'medium');

                return (
                  <div 
                    key={key} 
                    className="issue-item" 
                    style={{ 
                      borderLeft: `4px solid ${borderColor}`, 
                      background: bgColor, 
                      marginBottom: '0.5rem', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center' 
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{meta.label}</span>
                        <span className={`issue-badge ${badgeClass}`} style={{ fontSize: '0.65rem' }}>{badgeLabel}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: 0 }}>
                        {meta.desc}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '60px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: borderColor }}>
                        {s}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        /{meta.max}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
