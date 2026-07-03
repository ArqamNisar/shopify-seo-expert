import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ProductAudit from './components/ProductAudit';
import OptimizerPanel from './components/OptimizerPanel';

export default function App() {
  // Navigation / View State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | audit | optimize
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Theme State (default to light mode)
  const [theme, setTheme] = useState('light');

  // Connection Credentials
  const [shopifyUrl, setShopifyUrl] = useState('');
  const [shopifyToken, setShopifyToken] = useState('');
  const [connectedStore, setConnectedStore] = useState(null);

  // Business Data
  const [products, setProducts] = useState([]);
  const [scores, setScores] = useState({}); // productId -> auditReport
  const [optimizations, setOptimizations] = useState({}); // productId -> optimizationData

  // Loading & Bulk Progress States
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null); // { current: number, total: number, action: 'audit' | 'optimize' }

  // Login inputs
  const [loginUrl, setLoginUrl] = useState('');
  const [loginToken, setLoginToken] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Terminal & Toasts
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);

  // Initialize theme and load session from local storage
  useEffect(() => {
    // Check saved theme
    const savedTheme = localStorage.getItem('seo_theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    // Load credentials
    const savedUrl = localStorage.getItem('seo_shopify_url');
    const savedToken = localStorage.getItem('seo_shopify_token');
    const savedStoreName = localStorage.getItem('seo_store_name');

    if (savedUrl && savedToken && savedStoreName) {
      setShopifyUrl(savedUrl);
      setShopifyToken(savedToken);
      setConnectedStore({ name: savedStoreName, url: savedUrl });
      addLogMessage(`Restored active session for store: ${savedStoreName}`, 'success');
    } else {
      addLogMessage('No active session found. Please enter your Shopify Store credentials to proceed.', 'system');
    }
  }, []);

  // Fetch catalog when connection becomes active
  useEffect(() => {
    if (connectedStore) {
      fetchProducts();
      fetchCache();
    }
  }, [connectedStore]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('seo_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.body.classList.add('dark-theme');
      addLogMessage('Switched to Dark Theme.', 'system');
    } else {
      document.body.classList.remove('dark-theme');
      addLogMessage('Switched to Light Theme.', 'system');
    }
  };

  const addLogMessage = (text, type = 'agent') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { text: `[${time}] ${text}`, type }]);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginUrl || !loginToken) {
      setLoginError('Store URL and Access Token are required.');
      return;
    }
    setLoginError('');
    setIsLoggingIn(true);
    addLogMessage(`Verifying Shopify connection: "${loginUrl}"`, 'system');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_url: loginUrl,
          access_token: loginToken
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        addLogMessage(`Successfully authorized: ${data.shop_name} (${data.domain})`, 'success');
        
        // Save to state
        setShopifyUrl(loginUrl);
        setShopifyToken(loginToken);
        setConnectedStore({ name: data.shop_name, url: data.domain });
        
        // Save to local storage
        localStorage.setItem('seo_shopify_url', loginUrl);
        localStorage.setItem('seo_shopify_token', loginToken);
        localStorage.setItem('seo_store_name', data.shop_name);
        
        showToast(`Welcome to ${data.shop_name}!`, 'success');
      } else {
        const errorText = data.detail || 'Authorization failed. Please check credentials.';
        setLoginError(errorText);
        addLogMessage(`Authorization failed: ${errorText}`, 'system');
      }
    } catch (error) {
      setLoginError(`Network error: ${error.message}`);
      addLogMessage(`Authentication error: ${error.message}`, 'system');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnect = () => {
    addLogMessage(`Logging out from store: ${connectedStore?.name}`, 'system');
    setShopifyUrl('');
    setShopifyToken('');
    setConnectedStore(null);
    setProducts([]);
    setScores({});
    setOptimizations({});
    setSelectedProduct(null);
    setActiveTab('dashboard');
    
    // Clear storage
    localStorage.removeItem('seo_shopify_url');
    localStorage.removeItem('seo_shopify_token');
    localStorage.removeItem('seo_store_name');
    
    showToast('Logged out of Shopify Store.', 'success');
  };

  const fetchProducts = async () => {
    if (!shopifyUrl || !shopifyToken) return;
    setIsLoadingCatalog(true);
    addLogMessage('Contacting Shopify API to retrieve store catalog...', 'system');
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/products', {
        headers: {
          'Shopify-Shop-Url': shopifyUrl,
          'Shopify-Access-Token': shopifyToken
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Could not fetch catalog products.');
      }
      
      const data = await response.json();
      setProducts(data.products || []);
      addLogMessage(`Retrieved ${data.products.length} catalog items from Shopify.`, 'success');
    } catch (err) {
      addLogMessage(`Error fetching catalog: ${err.message}`, 'system');
      showToast(err.message, 'error');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const fetchCache = async () => {
    if (!shopifyUrl || !shopifyToken) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/cache');
      if (response.ok) {
        const data = await response.json();
        setScores(data.scores || {});
        setOptimizations(data.optimizations || {});
      }
    } catch (err) {
      console.error('Failed to fetch cache:', err);
    }
  };

  const runSeoAudit = async () => {
    if (!selectedProduct) return;
    setIsAuditing(true);
    addLogMessage(`[Analyzer Agent] Initiating product SEO analysis for: "${selectedProduct.title}"`, 'agent');
    addLogMessage('[Analyzer Agent] Evaluating Title structure and lengths...', 'agent');
    addLogMessage('[Analyzer Agent] Parsing description formatting and content body...', 'agent');
    addLogMessage('[Analyzer Agent] Retrieving product image alt tags...', 'agent');

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/products/${selectedProduct.id}/analyze`, {
        method: 'POST',
        headers: {
          'Shopify-Shop-Url': shopifyUrl,
          'Shopify-Access-Token': shopifyToken
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Audit request failed.');
      }
      
      const data = await response.json();
      setScores((prev) => ({ ...prev, [selectedProduct.id]: data }));
      addLogMessage(`[Analyzer Agent] Analysis complete. Overall score: ${data.overall_score}/100. Issues detected: ${data.issues?.length || 0}`, 'success');
      showToast('SEO Audit complete!', 'success');
    } catch (err) {
      addLogMessage(`[Analyzer Agent] Audit failed: ${err.message}`, 'system');
      showToast(err.message, 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  const runSeoOptimize = async () => {
    if (!selectedProduct) return;
    setIsOptimizing(true);
    addLogMessage(`[Optimizer Agent] Commencing copywriting suggestions for: "${selectedProduct.title}"`, 'agent');
    addLogMessage('[Optimizer Agent] Rewriting title according to character boundaries...', 'agent');
    addLogMessage('[Optimizer Agent] Generating SEO-optimized, styled HTML description...', 'agent');
    addLogMessage('[Optimizer Agent] Structuring meta tags and resolving empty media tags...', 'agent');

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/products/${selectedProduct.id}/optimize`, {
        method: 'POST',
        headers: {
          'Shopify-Shop-Url': shopifyUrl,
          'Shopify-Access-Token': shopifyToken
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Optimization suggestions failed.');
      }
      
      const data = await response.json();
      setOptimizations((prev) => ({ ...prev, [selectedProduct.id]: data }));
      addLogMessage(`[Optimizer Agent] Recommendations ready for title: "${data.optimized_title}"`, 'success');
      showToast('Optimizations generated by Agent!', 'success');
    } catch (err) {
      addLogMessage(`[Optimizer Agent] Optimization failed: ${err.message}`, 'system');
      showToast(err.message, 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  const runBulkSeoAudit = async (productIds, onComplete) => {
    if (!productIds || productIds.length === 0) return;
    setBulkProgress({ current: 0, total: productIds.length, action: 'audit' });
    addLogMessage(`[Bulk Operations] Initiating bulk SEO analysis for ${productIds.length} products...`, 'system');

    let successCount = 0;
    for (let i = 0; i < productIds.length; i++) {
      const id = productIds[i];
      const product = products.find(p => p.id === id);
      const title = product ? product.title : `ID: ${id}`;
      setBulkProgress({ current: i + 1, total: productIds.length, action: 'audit' });
      addLogMessage(`[Bulk Operations] (${i + 1}/${productIds.length}) Auditing "${title}"...`, 'agent');

      try {
        const response = await fetch(`http://127.0.0.1:8000/api/products/${id}/analyze`, {
          method: 'POST',
          headers: {
            'Shopify-Shop-Url': shopifyUrl,
            'Shopify-Access-Token': shopifyToken
          }
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Audit request failed.');
        }

        const data = await response.json();
        setScores((prev) => ({ ...prev, [id]: data }));
        addLogMessage(`[Bulk Operations] (${i + 1}/${productIds.length}) Audit complete for "${title}". Score: ${data.overall_score}/100.`, 'success');
        successCount++;
      } catch (err) {
        addLogMessage(`[Bulk Operations] (${i + 1}/${productIds.length}) Audit failed for "${title}": ${err.message}`, 'system');
      }
    }

    setBulkProgress(null);
    showToast(`Bulk Audit complete! ${successCount}/${productIds.length} successful.`, 'success');
    addLogMessage(`[Bulk Operations] Finished bulk audit. ${successCount}/${productIds.length} products processed successfully.`, 'success');
    if (onComplete) onComplete();
  };

  const runBulkSeoOptimize = async (productIds, onComplete) => {
    if (!productIds || productIds.length === 0) return;
    setBulkProgress({ current: 0, total: productIds.length, action: 'optimize' });
    addLogMessage(`[Bulk Operations] Initiating bulk copywriting optimizations for ${productIds.length} products...`, 'system');

    let successCount = 0;
    for (let i = 0; i < productIds.length; i++) {
      const id = productIds[i];
      const product = products.find(p => p.id === id);
      const title = product ? product.title : `ID: ${id}`;
      setBulkProgress({ current: i + 1, total: productIds.length, action: 'optimize' });
      addLogMessage(`[Bulk Operations] (${i + 1}/${productIds.length}) Generating copywriting recommendations for "${title}"...`, 'agent');

      try {
        const response = await fetch(`http://127.0.0.1:8000/api/products/${id}/optimize`, {
          method: 'POST',
          headers: {
            'Shopify-Shop-Url': shopifyUrl,
            'Shopify-Access-Token': shopifyToken
          }
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Optimization request failed.');
        }

        const data = await response.json();
        setOptimizations((prev) => ({ ...prev, [id]: data }));
        addLogMessage(`[Bulk Operations] (${i + 1}/${productIds.length}) Optimization complete for "${title}".`, 'success');
        successCount++;
      } catch (err) {
        addLogMessage(`[Bulk Operations] (${i + 1}/${productIds.length}) Optimization failed for "${title}": ${err.message}`, 'system');
      }
    }

    setBulkProgress(null);
    showToast(`Bulk Optimization complete! ${successCount}/${productIds.length} successful.`, 'success');
    addLogMessage(`[Bulk Operations] Finished bulk optimization. ${successCount}/${productIds.length} products processed successfully.`, 'success');
    if (onComplete) onComplete();
  };

  const syncToShopify = async (optimizedPayload) => {
    if (!selectedProduct) return;
    setIsSyncing(true);
    addLogMessage(`[System] Pushing metadata updates to Shopify API...`, 'system');

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/products/${selectedProduct.id}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Shopify-Shop-Url': shopifyUrl,
          'Shopify-Access-Token': shopifyToken
        },
        body: JSON.stringify(optimizedPayload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed syncing to Shopify.');
      }
      
      const data = await response.json();
      addLogMessage(`[System] Synced successfully: ${data.message}`, 'success');
      showToast('Synced with Shopify!', 'success');

      // Clear local agent cached runs to force fresh recalculation on next audit
      setScores((prev) => {
        const copy = { ...prev };
        delete copy[selectedProduct.id];
        return copy;
      });
      setOptimizations((prev) => {
        const copy = { ...prev };
        delete copy[selectedProduct.id];
        return copy;
      });

      // Reload products catalog
      await fetchProducts();
      
      // Navigate home
      setActiveTab('dashboard');
      setSelectedProduct(null);
    } catch (err) {
      addLogMessage(`[System] Sync failed: ${err.message}`, 'system');
      showToast(err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectProduct = (product, tab = 'audit') => {
    setSelectedProduct(product);
    setActiveTab(tab);
    if (tab === 'audit') {
      addLogMessage(`Auditing SEO fields for "${product.title}"...`, 'system');
    } else {
      addLogMessage(`Opening Optimizer Console for "${product.title}"...`, 'system');
    }
  };

  // If not logged in, render ONLY the Login screen
  if (!connectedStore) {
    return (
      <div className="app-container">
        <header className="header">
          <div className="brand">
            <div className="brand-logo">S</div>
            <h1 className="brand-name">Shopify SEO Expert</h1>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </header>

        <div className="login-wrapper">
          <div className="glass-card login-card">
            <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>🔐 Store Access Authorization</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Connect your Shopify development store to analyze and optimize your products catalog.
            </p>

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label htmlFor="login-url">Shopify Store Domain</label>
                <input
                  id="login-url"
                  type="text"
                  className="form-control"
                  placeholder="your-store-name.myshopify.com"
                  value={loginUrl}
                  onChange={(e) => setLoginUrl(e.target.value)}
                  disabled={isLoggingIn}
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-token">Admin API Access Token</label>
                <input
                  id="login-token"
                  type="password"
                  className="form-control"
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={loginToken}
                  onChange={(e) => setLoginToken(e.target.value)}
                  disabled={isLoggingIn}
                />
              </div>

              {loginError && (
                <div style={{ color: 'var(--seo-red)', fontSize: '0.85rem', marginBottom: '1rem', background: 'var(--seo-red-glow)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(220,38,38,0.2)' }}>
                  ⚠️ {loginError}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', display: 'inline-block', marginRight: '8px' }}></span>
                    Connecting to Shopify...
                  </>
                ) : 'Authorize Access'}
              </button>
            </form>
          </div>
        </div>

        {/* Toast notifications */}
        {toast && (
          <div className={`toast-msg ${toast.type}`}>
            <span style={{ fontSize: '1.2rem' }}>
              {toast.type === 'success' ? '✅' : '❌'}
            </span>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {toast.message}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Connected Application View
  return (
    <div className="app-container">
      {/* Header bar */}
      <header className="header">
        <div className="brand">
          <div className="brand-logo">S</div>
          <h1 className="brand-name">Shopify SEO Expert</h1>
          <span style={{ fontSize: '0.75rem', background: 'var(--seo-green-glow)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(5, 150, 105, 0.25)', marginLeft: '0.5rem', color: 'var(--seo-green)', fontWeight: 600 }}>
            Connected
          </span>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              setSelectedProduct(null);
            }}
          >
            📋 Catalog Dashboard
          </button>
          
          {selectedProduct && (
            <>
              <button
                className={`nav-button ${activeTab === 'audit' ? 'active' : ''}`}
                onClick={() => setActiveTab('audit')}
              >
                🔎 SEO Audit Details
              </button>
              <button
                className={`nav-button ${activeTab === 'optimize' ? 'active' : ''}`}
                onClick={() => setActiveTab('optimize')}
              >
                🤖 Optimizer Console
              </button>
            </>
          )}
          
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 0.5rem' }}></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, marginRight: '0.5rem' }}>
              {connectedStore.name}
            </span>
            <button className="btn btn-secondary" onClick={handleDisconnect} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Disconnect
            </button>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </nav>
      </header>

      {/* Main page layout */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            products={products}
            scores={scores}
            optimizations={optimizations}
            isLoading={isLoadingCatalog}
            onSelectProduct={handleSelectProduct}
            bulkProgress={bulkProgress}
            onBulkAudit={runBulkSeoAudit}
            onBulkOptimize={runBulkSeoOptimize}
          />
        )}

        {activeTab === 'audit' && selectedProduct && (
          <ProductAudit
            product={selectedProduct}
            auditReport={scores[selectedProduct.id]}
            onRunAudit={runSeoAudit}
            isAuditing={isAuditing}
            onStartOptimize={() => setActiveTab('optimize')}
            onBack={() => {
              setActiveTab('dashboard');
              setSelectedProduct(null);
            }}
          />
        )}

        {activeTab === 'optimize' && selectedProduct && (
          <OptimizerPanel
            product={selectedProduct}
            optimizationData={optimizations[selectedProduct.id]}
            isOptimizing={isOptimizing}
            onRunOptimize={runSeoOptimize}
            onSync={syncToShopify}
            isSyncing={isSyncing}
            onBack={() => {
              setActiveTab('dashboard');
              setSelectedProduct(null);
            }}
          />
        )}

        {/* Console logs terminal at bottom */}
      </main>

      {/* Toast notifications */}
      {toast && (
        <div className={`toast-msg ${toast.type}`}>
          <span style={{ fontSize: '1.2rem' }}>
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {toast.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
