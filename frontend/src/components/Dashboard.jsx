import React, { useState } from 'react';

export default function Dashboard({
  products,
  scores,
  isLoading,
  shopifyUrl,
  shopifyToken,
  groqKey,
  connectedStore,
  onConnect,
  onDisconnect,
  onSelectProduct,
  addLogMessage
}) {
  const [shopUrlInput, setShopUrlInput] = useState(shopifyUrl || '');
  const [accessTokenInput, setAccessTokenInput] = useState(shopifyToken || '');
  const [groqKeyInput, setGroqKeyInput] = useState(groqKey || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    if (!shopUrlInput || !accessTokenInput) {
      setErrorMsg('Please provide both Shop URL and Access Token.');
      return;
    }
    setErrorMsg('');
    setIsVerifying(true);
    addLogMessage('Connecting to Shopify store...', 'system');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_url: shopUrlInput,
          access_token: accessTokenInput
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        addLogMessage(`Connected to Shopify store: ${data.shop_name} (${data.domain})`, 'success');
        onConnect({
          shopUrl: shopUrlInput,
          accessToken: accessTokenInput,
          groqKey: groqKeyInput,
          storeName: data.shop_name
        });
      } else {
        const errorText = data.detail || 'Failed verification.';
        setErrorMsg(errorText);
        addLogMessage(`Shopify connection failed: ${errorText}`, 'system');
      }
    } catch (error) {
      setErrorMsg(`Connection error: ${error.message}`);
      addLogMessage(`Shopify connection failed: ${error.message}`, 'system');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = () => {
    onDisconnect();
    addLogMessage('Disconnected from Shopify. Reverting to Mock Store Catalog.', 'system');
  };

  const handleSaveGroqKey = (e) => {
    e.preventDefault();
    onConnect({
      shopUrl: shopUrlInput,
      accessToken: accessTokenInput,
      groqKey: groqKeyInput,
      storeName: connectedStore ? connectedStore.name : null
    });
    addLogMessage(groqKeyInput ? 'Groq API Key saved successfully.' : 'Groq API Key cleared.', 'success');
  };

  // Calculate KPIs
  const auditedProducts = Object.keys(scores).length;
  const averageScore = auditedProducts > 0
    ? Math.round(Object.values(scores).reduce((sum, item) => sum + item.overall_score, 0) / auditedProducts)
    : null;

  const getScoreBadgeClass = (score) => {
    if (score === null || score === undefined) return 'score-none';
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  };

  return (
    <div>
      {/* Connection Panel */}
      <div className="connection-panel">
        <div className="glass-card">
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔌</span> Shopify Store Connection
          </h2>
          
          {connectedStore ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--seo-green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: 'var(--seo-green)', borderRadius: '50%' }}></span>
                  Connected: {connectedStore.name}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  URL: {connectedStore.url}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <form onSubmit={handleConnectSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="shop-url">Shopify URL</label>
                  <input
                    id="shop-url"
                    type="text"
                    className="form-control"
                    placeholder="example.myshopify.com"
                    value={shopUrlInput}
                    onChange={(e) => setShopUrlInput(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="access-token">Admin API Access Token</label>
                  <input
                    id="access-token"
                    type="password"
                    className="form-control"
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                    value={accessTokenInput}
                    onChange={(e) => setAccessTokenInput(e.target.value)}
                  />
                </div>
              </div>
              {errorMsg && <p style={{ color: 'var(--seo-red)', fontSize: '0.85rem', marginBottom: '1rem' }}>{errorMsg}</p>}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={isVerifying}>
                  {isVerifying ? 'Verifying...' : 'Connect Store'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShopUrlInput('');
                  setAccessTokenInput('');
                  setErrorMsg('');
                  addLogMessage('Using fallback Sandbox environment.', 'system');
                }}>
                  Sandbox Mode
                </button>
              </div>
            </form>
          )}
        </div>

        {/* AI Config */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🧠</span> Groq API Config
          </h2>
          <form onSubmit={handleSaveGroqKey}>
            <div className="form-group">
              <label htmlFor="groq-key">Groq API Key</label>
              <input
                id="groq-key"
                type="password"
                className="form-control"
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                value={groqKeyInput}
                onChange={(e) => setGroqKeyInput(e.target.value)}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              If no API key is specified, audits will run using local rule-based SEO diagnostics.
            </p>
            <button type="submit" className="btn btn-accent" style={{ width: '100%' }}>
              Save Groq API Key
            </button>
          </form>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' }}>
            📊
          </div>
          <div className="kpi-info">
            <p>Total Products</p>
            <h3>{products.length}</h3>
          </div>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>
            🔍
          </div>
          <div className="kpi-info">
            <p>Products Audited</p>
            <h3>{auditedProducts}</h3>
          </div>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--seo-green)' }}>
            🎯
          </div>
          <div className="kpi-info">
            <p>Average SEO Score</p>
            <h3>{averageScore !== null ? `${averageScore}%` : 'N/A'}</h3>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="glass-card catalog-section">
        <div className="section-header">
          <h2>📦 Product Catalog {connectedStore ? `(${connectedStore.name})` : '(Sandbox)'}</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Select a product to view SEO details and request optimization.
          </span>
        </div>

        {isLoading ? (
          <div className="spinner-wrapper">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading catalog products...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <p>No products found in this store catalog.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => {
              const audit = scores[product.id];
              const score = audit ? audit.overall_score : null;
              
              return (
                <div key={product.id} className="glass-card product-card">
                  <img
                    className="product-thumb"
                    src={product.images && product.images.length > 0 ? product.images[0].src : 'https://placehold.co/300x200?text=No+Image'}
                    alt={product.images && product.images.length > 0 ? product.images[0].alt : product.title}
                  />
                  <div className="product-info">
                    <div>
                      <div className="product-meta">
                        <span className={`score-badge ${getScoreBadgeClass(score)}`}>
                          {score !== null ? `SEO: ${score}%` : 'Not Audited'}
                        </span>
                        <span className="product-tags">
                          ID: {product.id}
                        </span>
                      </div>
                      <h3 className="product-title" title={product.title}>
                        {product.title}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Tags: {product.tags || '(None)'}
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%', display: 'flex', gap: '0.25rem' }}
                      onClick={() => onSelectProduct(product)}
                    >
                      Audit & Optimize 🔍
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
