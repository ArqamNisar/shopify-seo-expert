import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ProductAudit from './components/ProductAudit';
import OptimizerPanel from './components/OptimizerPanel';
import AgentLog from './components/AgentLog';

export default function App() {
  // Navigation / View State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | audit | optimize
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Connection Credentials
  const [shopifyUrl, setShopifyUrl] = useState('');
  const [shopifyToken, setShopifyToken] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [connectedStore, setConnectedStore] = useState(null);

  // Business Data
  const [products, setProducts] = useState([]);
  const [scores, setScores] = useState({}); // productId -> auditReport
  const [optimizations, setOptimizations] = useState({}); // productId -> optimizationData

  // Loading States
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Terminal & Toasts
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);

  // Load configuration from local storage if available on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('seo_shopify_url');
    const savedToken = localStorage.getItem('seo_shopify_token');
    const savedGroq = localStorage.getItem('seo_groq_key');
    const savedStoreName = localStorage.getItem('seo_store_name');

    if (savedUrl) setShopifyUrl(savedUrl);
    if (savedToken) setShopifyToken(savedToken);
    if (savedGroq) setGroqKey(savedGroq);
    if (savedStoreName && savedUrl) {
      setConnectedStore({ name: savedStoreName, url: savedUrl });
    }

    addLogMessage('Shopify SEO Expert Agent system loaded.', 'system');
    addLogMessage('Sandbox Mode active. Connect your Shopify Store in the connection panel.', 'system');
  }, []);

  // Fetch catalog whenever connection state changes
  useEffect(() => {
    fetchProducts();
  }, [connectedStore]);

  const addLogMessage = (text, type = 'agent') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { text: `[${time}] ${text}`, type }]);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProducts = async () => {
    setIsLoadingCatalog(true);
    addLogMessage('Fetching product catalog from backend API...', 'system');
    
    const headers = {};
    if (connectedStore) {
      headers['Shopify-Shop-Url'] = shopifyUrl;
      headers['Shopify-Access-Token'] = shopifyToken;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/products', { headers });
      if (!response.ok) throw new Error('Backend failed loading products.');
      const data = await response.json();
      
      setProducts(data.products || []);
      if (data.mode === 'live') {
        addLogMessage(`Successfully synchronized ${data.products.length} live products from Shopify.`, 'success');
      } else {
        addLogMessage('Loaded Sandbox catalog (3 mock items) for local auditing.', 'system');
      }
    } catch (err) {
      addLogMessage(`Error loading catalog: ${err.message}`, 'system');
      showToast(`Error loading products: ${err.message}`, 'error');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleConnect = (credentials) => {
    setShopifyUrl(credentials.shopUrl);
    setShopifyToken(credentials.accessToken);
    setGroqKey(credentials.groqKey);

    if (credentials.shopUrl && credentials.accessToken) {
      setConnectedStore({ name: credentials.storeName || 'Shopify Dev Store', url: credentials.shopUrl });
      localStorage.setItem('seo_shopify_url', credentials.shopUrl);
      localStorage.setItem('seo_shopify_token', credentials.accessToken);
      if (credentials.storeName) localStorage.setItem('seo_store_name', credentials.storeName);
    }
    
    if (credentials.groqKey) {
      localStorage.setItem('seo_groq_key', credentials.groqKey);
    } else {
      localStorage.removeItem('seo_groq_key');
    }
  };

  const handleDisconnect = () => {
    setShopifyUrl('');
    setShopifyToken('');
    setConnectedStore(null);
    localStorage.removeItem('seo_shopify_url');
    localStorage.removeItem('seo_shopify_token');
    localStorage.removeItem('seo_store_name');
  };

  const runSeoAudit = async () => {
    if (!selectedProduct) return;
    setIsAuditing(true);
    addLogMessage(`[Analyzer Agent] Launching SEO Audit for product: "${selectedProduct.title}" (ID: ${selectedProduct.id})`, 'agent');
    addLogMessage('[Analyzer Agent] Evaluating Title structure and character counts...', 'agent');
    addLogMessage('[Analyzer Agent] Reading HTML description body tags...', 'agent');
    addLogMessage('[Analyzer Agent] Fetching media assets and verification of alt text tags...', 'agent');

    const headers = {};
    if (groqKey) headers['Groq-Api-Key'] = groqKey;
    if (connectedStore) {
      headers['Shopify-Shop-Url'] = shopifyUrl;
      headers['Shopify-Access-Token'] = shopifyToken;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/products/${selectedProduct.id}/analyze`, {
        method: 'POST',
        headers
      });

      if (!response.ok) throw new Error('SEO Audit request failed.');
      const data = await response.json();
      
      setScores((prev) => ({ ...prev, [selectedProduct.id]: data }));
      addLogMessage(`[Analyzer Agent] Audit complete for ID ${selectedProduct.id}. Score: ${data.overall_score}/100. Issues detected: ${data.issues?.length || 0}`, 'success');
      showToast('SEO Audit complete!', 'success');
    } catch (err) {
      addLogMessage(`[Analyzer Agent] Critical failure: ${err.message}`, 'system');
      showToast(`Audit failed: ${err.message}`, 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  const runSeoOptimize = async () => {
    if (!selectedProduct) return;
    setIsOptimizing(true);
    addLogMessage(`[Optimizer Agent] Initiating semantic SEO optimizations for: "${selectedProduct.title}"`, 'agent');
    addLogMessage('[Optimizer Agent] Generating high-performing titles based on product details...', 'agent');
    addLogMessage('[Optimizer Agent] Rewriting descriptions into semantic layout with HTML highlights...', 'agent');
    addLogMessage('[Optimizer Agent] Expanding missing product search tags...', 'agent');
    addLogMessage('[Optimizer Agent] Muffling duplicate labels and generating keyword-rich image alt tags...', 'agent');

    const headers = {};
    if (groqKey) headers['Groq-Api-Key'] = groqKey;
    if (connectedStore) {
      headers['Shopify-Shop-Url'] = shopifyUrl;
      headers['Shopify-Access-Token'] = shopifyToken;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/products/${selectedProduct.id}/optimize`, {
        method: 'POST',
        headers
      });

      if (!response.ok) throw new Error('SEO copy generation request failed.');
      const data = await response.json();
      
      setOptimizations((prev) => ({ ...prev, [selectedProduct.id]: data }));
      addLogMessage(`[Optimizer Agent] Successfully compiled optimizations for "${data.optimized_title}"`, 'success');
      showToast('Optimizations generated by Agent!', 'success');
    } catch (err) {
      addLogMessage(`[Optimizer Agent] Critical failure: ${err.message}`, 'system');
      showToast(`Optimization failed: ${err.message}`, 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  const syncToShopify = async (optimizedPayload) => {
    if (!selectedProduct) return;
    setIsSyncing(true);
    addLogMessage(`[System] Syncing metadata updates to ${connectedStore ? 'Shopify API' : 'local memory cache'}...`, 'system');

    const headers = { 'Content-Type': 'application/json' };
    if (connectedStore) {
      headers['Shopify-Shop-Url'] = shopifyUrl;
      headers['Shopify-Access-Token'] = shopifyToken;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/products/${selectedProduct.id}/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify(optimizedPayload)
      });

      if (!response.ok) throw new Error('Failed to update product details.');
      const data = await response.json();
      
      addLogMessage(`[System] ${data.message}`, 'success');
      showToast(connectedStore ? 'Synced with Shopify!' : 'Local session mock catalog updated!', 'success');

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
      addLogMessage(`[System] Sync error: ${err.message}`, 'system');
      showToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setActiveTab('audit');
    addLogMessage(`Selected product: "${product.title}" for SEO auditing.`, 'system');
  };

  return (
    <div className="app-container">
      {/* Header bar */}
      <header className="header">
        <div className="brand">
          <div className="brand-logo">S</div>
          <h1 className="brand-name">Shopify SEO Expert</h1>
          <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', marginLeft: '0.5rem', color: 'var(--accent-cyan)' }}>
            v1.0 - Agentic
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
        </nav>
      </header>

      {/* Main page layout */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            products={products}
            scores={scores}
            isLoading={isLoadingCatalog}
            shopifyUrl={shopifyUrl}
            shopifyToken={shopifyToken}
            groqKey={groqKey}
            connectedStore={connectedStore}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSelectProduct={handleSelectProduct}
            addLogMessage={addLogMessage}
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
            onBack={() => setActiveTab('audit')}
          />
        )}

        {/* Console logs terminal at bottom */}
        <AgentLog logs={logs} />
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
