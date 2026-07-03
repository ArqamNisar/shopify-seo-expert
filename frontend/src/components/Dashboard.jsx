import React, { useState } from 'react';

export default function Dashboard({
  products = [],
  scores = {},
  optimizations = {},
  isLoading,
  onSelectProduct,
  bulkProgress = null,
  onBulkAudit,
  onBulkOptimize
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [optimizeFilter, setOptimizeFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);

  // Calculate KPIs
  const totalProducts = products.length;
  const auditedProducts = Object.keys(scores).length;
  const averageScore = auditedProducts > 0
    ? Math.round(Object.values(scores).reduce((sum, item) => {
        const reportObj = Array.isArray(item) ? item[0] : item;
        const s = reportObj ? (reportObj.seo_score !== undefined ? reportObj.seo_score : reportObj.overall_score) : 0;
        return sum + s;
      }, 0) / auditedProducts)
    : null;

  const getScoreBadgeClass = (score) => {
    if (score === null || score === undefined) return 'score-none';
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  };

  // Compile available statuses dynamically
  const uniqueStatuses = ['ALL', ...new Set(products.map(p => p.status?.toUpperCase()).filter(Boolean))];

  const filteredProducts = products.filter(product => {
    // 1. Search filter
    const matchesSearch = !searchTerm ||
      product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.tags?.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Status filter
    const matchesStatus = statusFilter === 'ALL' ||
      product.status?.toUpperCase() === statusFilter;

    // 3. Audited filter
    const hasAudit = !!scores[product.id];
    const matchesAudit = auditFilter === 'ALL' ||
      (auditFilter === 'AUDITED' && hasAudit) ||
      (auditFilter === 'NOT_AUDITED' && !hasAudit);

    // 4. Optimized filter
    const hasOptimize = !!optimizations[product.id];
    const matchesOptimize = optimizeFilter === 'ALL' ||
      (optimizeFilter === 'OPTIMIZED' && hasOptimize) ||
      (optimizeFilter === 'NOT_OPTIMIZED' && !hasOptimize);

    return matchesSearch && matchesStatus && matchesAudit && matchesOptimize;
  });

  return (
    <div>
      {/* KPI Stats */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(37, 99, 235, 0.08)', color: 'var(--accent-blue)' }}>
            📦
          </div>
          <div className="kpi-info">
            <p>Total Products</p>
            <h3>{totalProducts}</h3>
          </div>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(124, 58, 237, 0.08)', color: 'var(--accent-purple)' }}>
            🔍
          </div>
          <div className="kpi-info">
            <p>Products Audited</p>
            <h3>{auditedProducts}</h3>
          </div>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(5, 150, 105, 0.08)', color: 'var(--seo-green)' }}>
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
        <div className="section-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>📋 Store Products Catalog</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Select a product to audit titles, tags, descriptions, and media details.
            </p>
          </div>
          
          <div style={{ minWidth: '250px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search products or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem' }}
            />
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="filters-bar">
          <div className="filters-bar-title">
            <span>⚙️ Filter Products</span>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-status">Shopify Status</label>
            <select
              id="filter-status"
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-audit">Audit Status</label>
            <select
              id="filter-audit"
              className="form-control"
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
            >
              <option value="ALL">All Audit States</option>
              <option value="AUDITED">Audited</option>
              <option value="NOT_AUDITED">Not Audited</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-optimize">Optimization Status</label>
            <select
              id="filter-optimize"
              className="form-control"
              value={optimizeFilter}
              onChange={(e) => setOptimizeFilter(e.target.value)}
            >
              <option value="ALL">All Optimization States</option>
              <option value="OPTIMIZED">Optimized</option>
              <option value="NOT_OPTIMIZED">Not Optimized</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== 'ALL' || auditFilter !== 'ALL' || optimizeFilter !== 'ALL') && (
            <div className="filter-actions">
              <button
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1rem', height: '38px', fontSize: '0.85rem' }}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setAuditFilter('ALL');
                  setOptimizeFilter('ALL');
                }}
              >
                Clear Filters 🔄
              </button>
            </div>
          )}
        </div>

        {/* Results Info Counter */}
        {!isLoading && (
          <div className="filter-results-info">
            <span>
              Showing <strong>{filteredProducts.length}</strong> of <strong>{totalProducts}</strong> products
            </span>
            {(searchTerm || statusFilter !== 'ALL' || auditFilter !== 'ALL' || optimizeFilter !== 'ALL') && (
              <span className="badge-info">Filters Active</span>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="spinner-wrapper">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading store products from Shopify...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>🔍</span>
            <p style={{ fontWeight: 500 }}>No products matched your search or filters.</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Try adjusting your keywords/filters or clearing them.</p>
          </div>
        ) : (
          <div className="seo-table-container">
            <table className="seo-table">
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      id="select-all-products"
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                      checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const visibleIds = filteredProducts.map(p => p.id);
                          setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
                        } else {
                          const visibleIds = filteredProducts.map(p => p.id);
                          setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
                        }
                      }}
                      disabled={!!bulkProgress}
                    />
                  </th>
                  <th style={{ width: '60px' }}>Image</th>
                  <th>Product Details</th>
                  <th>Status</th>
                  <th>SEO Score</th>
                  <th>Tags</th>
                  <th style={{ width: '220px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const auditReport = scores[product.id];
                  const reportObj = Array.isArray(auditReport) ? auditReport[0] : auditReport;
                  const score = reportObj ? (reportObj.seo_score !== undefined ? reportObj.seo_score : reportObj.overall_score) : null;
                  
                  return (
                    <tr key={product.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          id={`select-product-${product.id}`}
                          style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                          checked={selectedIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, product.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== product.id));
                            }
                          }}
                          disabled={!!bulkProgress}
                        />
                      </td>
                      <td>
                        <img
                          className="table-thumb"
                          src={product.images && product.images.length > 0 ? product.images[0].src : 'https://placehold.co/100x100?text=No+Image'}
                          alt=""
                        />
                      </td>
                      <td>
                        <div className="table-product-title" title={product.title}>
                          {product.title}
                        </div>
                        <div className="table-product-id">
                          ID: {product.id}
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: 600, 
                          textTransform: 'uppercase',
                          color: product.status?.toLowerCase() === 'active' ? 'var(--seo-green)' : 'var(--text-muted)',
                          background: product.status?.toLowerCase() === 'active' ? 'var(--seo-green-glow)' : 'var(--bg-tertiary)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          border: product.status?.toLowerCase() === 'active' ? '1px solid rgba(5, 150, 105, 0.15)' : '1px solid var(--border-color)'
                        }}>
                          {product.status || 'DRAFT'}
                        </span>
                      </td>
                      <td>
                        <span className={`score-badge ${getScoreBadgeClass(score)}`}>
                          {score !== null ? `SEO: ${score}%` : 'Not Audited'}
                        </span>
                      </td>
                      <td>
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: 'var(--text-secondary)', 
                          maxWidth: '180px', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }} title={product.tags || '(None)'}>
                          {product.tags || '(None)'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => onSelectProduct(product, 'audit')}
                          >
                            Audit 🔍
                          </button>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => onSelectProduct(product, 'optimize')}
                          >
                            Optimize 🤖
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Bulk Operations Console */}
      {(selectedIds.length > 0 || bulkProgress) && (
        <div className="glass-card bulk-actions-bar" style={{
          position: 'fixed',
          bottom: '2.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '750px',
          zIndex: 1000,
          background: 'var(--glass-bg)',
          border: '1px solid var(--accent-purple)',
          boxShadow: '0 20px 40px rgba(124, 58, 237, 0.15)',
          padding: '1.25rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
          borderRadius: 'var(--border-radius-lg)',
          animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Bulk Operations Console
            </h4>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {bulkProgress ? (
                <>
                  Running bulk {bulkProgress.action === 'audit' ? 'SEO Audit' : 'SEO Optimization'}... <strong>{bulkProgress.current}</strong> of <strong>{bulkProgress.total}</strong> products
                </>
              ) : (
                <>
                  Selected <strong>{selectedIds.length}</strong> products for bulk operations.
                </>
              )}
            </span>
          </div>

          {bulkProgress ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '220px' }}>
              <div style={{
                flex: 1,
                height: '8px',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <span className="spinner spinner-purple" style={{ width: '20px', height: '20px', borderWidth: '2.5px' }}></span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                className="btn btn-accent"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                onClick={() => onBulkAudit(selectedIds, () => setSelectedIds([]))}
              >
                Bulk Audit 🔍
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                onClick={() => onBulkOptimize(selectedIds, () => setSelectedIds([]))}
              >
                Bulk Optimize 🤖
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', border: 'none' }}
                onClick={() => setSelectedIds([])}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
