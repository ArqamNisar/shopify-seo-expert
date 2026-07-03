import React, { useState, useEffect } from 'react';

function SerpPreview({ title, description, shopifyUrl = '', handle = '' }) {
  const [device, setDevice] = useState('desktop');
  
  const cleanUrl = shopifyUrl ? shopifyUrl.replace('https://', '').replace('http://', '') : 'store.myshopify.com';
  const displayTitle = title && title.length > 60 ? title.substring(0, 57) + '...' : title;
  const displayDesc = description && description.length > 160 ? description.substring(0, 157) + '...' : description;
  
  return (
    <div className={`serp-preview-container ${device}`} style={{ width: '100%', marginTop: '1rem', marginBottom: '1.25rem' }}>
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

function diffWords(oldStr, newStr) {
  if (!oldStr) oldStr = '';
  if (!newStr) newStr = '';
  
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);
  
  const dp = Array(oldWords.length + 1).fill(null).map(() => Array(newWords.length + 1).fill(0));
  
  for (let i = 1; i <= oldWords.length; i++) {
    for (let j = 1; j <= newWords.length; j++) {
      if (oldWords[i-1] === newWords[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }
  
  const result = [];
  let i = oldWords.length;
  let j = newWords.length;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i-1] === newWords[j-1]) {
      result.unshift({ type: 'equal', value: oldWords[i-1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift({ type: 'added', value: newWords[j-1] });
      j--;
    } else {
      result.unshift({ type: 'removed', value: oldWords[i-1] });
      i--;
    }
  }
  
  return result;
}

function DiffRenderer({ oldText, newText, pane }) {
  const diffs = diffWords(oldText, newText);
  
  return (
    <div className="diff-view-box">
      {diffs.map((part, index) => {
        if (part.type === 'removed' && pane === 'left') {
          return (
            <span key={index} className="diff-removed">
              {part.value}
            </span>
          );
        }
        if (part.type === 'added' && pane === 'right') {
          return (
            <span key={index} className="diff-added">
              {part.value}
            </span>
          );
        }
        if (part.type === 'equal') {
          return <span key={index}>{part.value}</span>;
        }
        return null;
      })}
    </div>
  );
}

export default function OptimizerPanel({
  product,
  optimizationData,
  shopifyUrl = '',
  targetKeyword = '',
  onTargetKeywordChange,
  isOptimizing,
  onRunOptimize,
  onSync,
  isSyncing,
  onBack
}) {
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedTags, setEditedTags] = useState('');
  const [editedImages, setEditedImages] = useState([]);
  const [editedMetaTitle, setEditedMetaTitle] = useState('');
  const [editedMetaDescription, setEditedMetaDescription] = useState('');
  const [editedProductType, setEditedProductType] = useState('');
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'diff'

  // Load optimization recommendations into state when they arrive
  useEffect(() => {
    if (optimizationData) {
      setEditedTitle(optimizationData.optimized_title || '');
      setEditedDescription(optimizationData.optimized_description || '');
      setEditedTags(optimizationData.optimized_tags || '');
      setEditedMetaTitle(optimizationData.optimized_meta_title || '');
      setEditedMetaDescription(optimizationData.optimized_meta_description || '');
      setEditedProductType(optimizationData.optimized_product_type || '');
      setEditedImages(
        optimizationData.optimized_images
          ? JSON.parse(JSON.stringify(optimizationData.optimized_images)) // Deep copy
          : []
      );
    }
  }, [optimizationData]);

  const handleAltChange = (id, newAlt) => {
    setEditedImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, alt: newAlt } : img))
    );
  };

  const handleSyncSubmit = (e) => {
    e.preventDefault();
    onSync({
      title: editedTitle,
      description: editedDescription,
      tags: editedTags,
      images: editedImages,
      meta_title: editedMetaTitle,
      meta_description: editedMetaDescription,
      product_type: editedProductType
    });
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

  const originalMetaTitle = getMetafieldValue('global', 'title_tag') || product.title || '';
  const originalMetaDescription = getMetafieldValue('global', 'description_tag') || stripHtml(product.body_html || product.description || '');
  const originalMetaTitleVal = getMetafieldValue('global', 'title_tag') || '';
  const originalMetaDescriptionVal = getMetafieldValue('global', 'description_tag') || '';

  const cleanDescriptionHTML = (html) => {
    if (!html) return '(No description)';
    return html.replace(/<[^>]*>/g, ' ').trim();
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            ⬅ Back to Catalog
          </button>
          
          {optimizationData && (
            <div className="view-mode-tabs">
              <button
                type="button"
                className={`view-mode-tab ${viewMode === 'editor' ? 'active' : ''}`}
                onClick={() => setViewMode('editor')}
              >
                ✏️ Standard Editor
              </button>
              <button
                type="button"
                className={`view-mode-tab ${viewMode === 'diff' ? 'active' : ''}`}
                onClick={() => setViewMode('diff')}
              >
                👁️ Visual Diff View
              </button>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
            <label htmlFor="opt-keyword" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Target Keyword:</label>
            <input
              id="opt-keyword"
              type="text"
              placeholder="optional keyword"
              className="form-control"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem', width: '160px', border: 'none', background: 'transparent', outline: 'none' }}
              value={targetKeyword}
              onChange={(e) => onTargetKeywordChange(e.target.value)}
              disabled={isOptimizing}
            />
          </div>
          {optimizationData && (
            <>
              <button className="btn btn-primary" onClick={() => onRunOptimize(targetKeyword)} disabled={isOptimizing}>
                {isOptimizing ? 'Generating...' : 'Re-run Optimizer 🔄'}
              </button>
              <button className="btn btn-success" onClick={handleSyncSubmit} disabled={isSyncing}>
                {isSyncing ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', display: 'inline-block', marginRight: '8px' }}></span>
                    Syncing...
                  </>
                ) : 'Sync Enhancements to Shopify 🚀'}
              </button>
            </>
          )}
        </div>
      </div>

      {!optimizationData ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🤖</span>
          <h2>Optimize Product Content</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.5rem auto 2rem' }}>
            Run the Optimizer Agent to let the model write high-performing titles, SEO-friendly HTML descriptions, descriptive tags, and visual search alt texts.
          </p>
          <button className="btn btn-primary" onClick={() => onRunOptimize(targetKeyword)} disabled={isOptimizing}>
            {isOptimizing ? (
              <>
                <span className="spinner spinner-purple" style={{ width: '16px', height: '16px', borderWidth: '2px', display: 'inline-block', marginRight: '8px' }}></span>
                Optimizer Agent generating copy...
              </>
            ) : 'Trigger Optimizer Agent 🤖'}
          </button>
        </div>
      ) : (
        <div className="editor-layout">
          {/* Left Pane: Original Metadata */}
          <div className="editor-pane">
            <div className="glass-card">
              <h3 className="pane-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Original Metadata
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Read Only</span>
              </h3>

              <SerpPreview 
                title={originalMetaTitle} 
                description={originalMetaDescription} 
                shopifyUrl={shopifyUrl} 
                handle={product.handle} 
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Title</span>
                    <span>{product.title?.length || 0} chars</span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ padding: '0.5rem 0', fontWeight: 600 }}>
                      <DiffRenderer oldText={product.title} newText={editedTitle} pane="left" />
                    </div>
                  ) : (
                    <div className="editor-text" style={{ fontWeight: 600 }}>{product.title}</div>
                  )}
                </div>

                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Product Type</span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ padding: '0.5rem 0' }}>
                      <DiffRenderer oldText={product.product_type || ''} newText={editedProductType} pane="left" />
                    </div>
                  ) : (
                    <div className="editor-text" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {product.product_type || '(None)'}
                    </div>
                  )}
                </div>

                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Meta Title (global.title_tag)</span>
                    <span>{originalMetaTitleVal.length} chars</span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ padding: '0.5rem 0' }}>
                      <DiffRenderer oldText={originalMetaTitleVal} newText={editedMetaTitle} pane="left" />
                    </div>
                  ) : (
                    <div className="editor-text" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {originalMetaTitleVal || '(None)'}
                    </div>
                  )}
                </div>

                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Meta Description (global.description_tag)</span>
                    <span>{originalMetaDescriptionVal.length} chars</span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ padding: '0.5rem 0' }}>
                      <DiffRenderer oldText={originalMetaDescriptionVal} newText={editedMetaDescription} pane="left" />
                    </div>
                  ) : (
                    <div className="editor-text" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {originalMetaDescriptionVal || '(None)'}
                    </div>
                  )}
                </div>

                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Description (Clean text)</span>
                    <span>{cleanDescriptionHTML(product.body_html || product.description).split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ maxHeight: '180px', overflowY: 'auto', padding: '0.5rem 0' }}>
                      <DiffRenderer 
                        oldText={cleanDescriptionHTML(product.body_html || product.description)} 
                        newText={cleanDescriptionHTML(editedDescription)} 
                        pane="left" 
                      />
                    </div>
                  ) : (
                    <div className="editor-text" style={{ maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {cleanDescriptionHTML(product.body_html || product.description)}
                    </div>
                  )}
                </div>

                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Tags</span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ padding: '0.5rem 0' }}>
                      <DiffRenderer oldText={product.tags} newText={editedTags} pane="left" />
                    </div>
                  ) : (
                    <div className="editor-text" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {product.tags || '(None)'}
                    </div>
                  )}
                </div>

                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Image Alt Text Assets</span>
                  </div>
                  {product.images && product.images.length > 0 ? (
                    product.images.map((img, idx) => {
                      const optImg = editedImages.find(i => i.id === img.id) || {};
                      return (
                        <div key={img.id || idx} className="img-alt-editor">
                          <img className="img-alt-thumb" src={img.src} alt="" />
                          <div style={{ flex: 1, fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Alt Tag {idx + 1}</span>
                            {viewMode === 'diff' ? (
                              <div style={{ padding: '0.25rem 0' }}>
                                <DiffRenderer oldText={img.alt || ''} newText={optImg.alt || ''} pane="left" />
                              </div>
                            ) : (
                              <span style={{ wordBreak: 'break-all' }}>{img.alt || '(Empty Alt Tag)'}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No product images.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane: Optimized Metadata (Interactive Editor) */}
          <div className="editor-pane">
            <div className="glass-card" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
              <h3 className="pane-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Optimized Copy suggestions
                <span style={{ fontSize: '0.8rem', color: 'var(--seo-green)', fontWeight: 600 }}>Interactive Editor</span>
              </h3>

              <SerpPreview 
                title={editedMetaTitle || editedTitle} 
                description={editedMetaDescription || stripHtml(editedDescription)} 
                shopifyUrl={shopifyUrl} 
                handle={product.handle} 
              />

              <form onSubmit={handleSyncSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
                
                {/* Title */}
                <div className="editor-field" style={{ borderColor: (editedTitle.length >= 50 && editedTitle.length <= 60) ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)' }}>
                  <div className="editor-field-header">
                    <label htmlFor="opt-title" style={{ cursor: 'pointer' }}>Title Suggestion</label>
                    <span style={{ color: (editedTitle.length >= 50 && editedTitle.length <= 60) ? 'var(--seo-green)' : 'var(--seo-orange)' }}>
                      {editedTitle.length} chars (Sweet spot: 50-60)
                    </span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ padding: '0.5rem 0', fontWeight: 600 }}>
                      <DiffRenderer oldText={product.title} newText={editedTitle} pane="right" />
                    </div>
                  ) : (
                    <input
                      id="opt-title"
                      type="text"
                      className="editor-input"
                      style={{ fontWeight: 600 }}
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                    />
                  )}
                </div>

                {/* Product Type */}
                <div className="editor-field">
                  <div className="editor-field-header">
                    <label htmlFor="opt-product-type" style={{ cursor: 'pointer' }}>Optimized Product Type</label>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ padding: '0.5rem 0' }}>
                      <DiffRenderer oldText={product.product_type || ''} newText={editedProductType} pane="right" />
                    </div>
                  ) : (
                    <input
                      id="opt-product-type"
                      type="text"
                      className="editor-input"
                      value={editedProductType}
                      onChange={(e) => setEditedProductType(e.target.value)}
                    />
                  )}
                </div>

                {/* Meta Title */}
                <div className="editor-field" style={{ borderColor: (editedMetaTitle.length >= 30 && editedMetaTitle.length <= 60) ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)' }}>
                  <div className="editor-field-header">
                    <label htmlFor="opt-meta-title" style={{ cursor: 'pointer' }}>Optimized Meta Title</label>
                    <span style={{ color: (editedMetaTitle.length >= 30 && editedMetaTitle.length <= 60) ? 'var(--seo-green)' : 'var(--seo-orange)' }}>
                      {editedMetaTitle.length} chars (Sweet spot: 30-60)
                    </span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ padding: '0.5rem 0' }}>
                      <DiffRenderer oldText={originalMetaTitleVal} newText={editedMetaTitle} pane="right" />
                    </div>
                  ) : (
                    <input
                      id="opt-meta-title"
                      type="text"
                      className="editor-input"
                      value={editedMetaTitle}
                      onChange={(e) => setEditedMetaTitle(e.target.value)}
                    />
                  )}
                </div>

                {/* Meta Description */}
                <div className="editor-field" style={{ borderColor: (editedMetaDescription.length >= 120 && editedMetaDescription.length <= 190) ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)' }}>
                  <div className="editor-field-header">
                    <label htmlFor="opt-meta-desc" style={{ cursor: 'pointer' }}>Optimized Meta Description</label>
                    <span style={{ color: (editedMetaDescription.length >= 120 && editedMetaDescription.length <= 190) ? 'var(--seo-green)' : 'var(--seo-orange)' }}>
                      {editedMetaDescription.length} chars (Sweet spot: 120-190)
                    </span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ padding: '0.5rem 0' }}>
                      <DiffRenderer oldText={originalMetaDescriptionVal} newText={editedMetaDescription} pane="right" />
                    </div>
                  ) : (
                    <textarea
                      id="opt-meta-desc"
                      className="editor-textarea"
                      style={{ minHeight: '80px' }}
                      value={editedMetaDescription}
                      onChange={(e) => setEditedMetaDescription(e.target.value)}
                    />
                  )}
                </div>

                {/* Description */}
                <div className="editor-field">
                  <div className="editor-field-header">
                    <label htmlFor="opt-desc" style={{ cursor: 'pointer' }}>Description (HTML Layout)</label>
                    <span>{editedDescription.split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ maxHeight: '180px', overflowY: 'auto', padding: '0.5rem 0' }}>
                      <DiffRenderer 
                        oldText={cleanDescriptionHTML(product.body_html || product.description)} 
                        newText={cleanDescriptionHTML(editedDescription)} 
                        pane="right" 
                      />
                    </div>
                  ) : (
                    <textarea
                      id="opt-desc"
                      className="editor-textarea"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                    />
                  )}
                </div>

                {/* Tags */}
                <div className="editor-field">
                  <div className="editor-field-header">
                    <label htmlFor="opt-tags" style={{ cursor: 'pointer' }}>Expanded Tags List</label>
                    <span>{editedTags.split(',').filter(Boolean).length} tags</span>
                  </div>
                  {viewMode === 'diff' ? (
                    <div className="editor-text" style={{ padding: '0.5rem 0' }}>
                      <DiffRenderer oldText={product.tags} newText={editedTags} pane="right" />
                    </div>
                  ) : (
                    <input
                      id="opt-tags"
                      type="text"
                      className="editor-input"
                      value={editedTags}
                      onChange={(e) => setEditedTags(e.target.value)}
                    />
                  )}
                </div>

                {/* Image Alts */}
                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Optimized Image Alt Texts</span>
                  </div>
                  {editedImages.length > 0 ? (
                    editedImages.map((img, idx) => {
                      const origImg = product.images?.find(i => i.id === img.id) || {};
                      return (
                        <div key={img.id || idx} className="img-alt-editor">
                          <img className="img-alt-thumb" src={img.src} alt="" />
                          <div className="img-alt-input-wrapper">
                            <label htmlFor={`alt-input-${img.id || idx}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                              Alt Tag {idx + 1}
                            </label>
                            {viewMode === 'diff' ? (
                              <div style={{ padding: '0.25rem 0' }}>
                                <DiffRenderer oldText={origImg.alt || ''} newText={img.alt || ''} pane="right" />
                              </div>
                            ) : (
                              <input
                                id={`alt-input-${img.id || idx}`}
                                type="text"
                                className="editor-input"
                                style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}
                                value={img.alt || ''}
                                onChange={(e) => handleAltChange(img.id, e.target.value)}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No product images to optimize.</div>
                  )}
                </div>

                {/* Reasoning Box */}
                {optimizationData.agent_reasoning && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--seo-green)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', gap: '0.25rem' }}>
                      <span>🤖</span> Optimization Strategy
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {optimizationData.agent_reasoning}
                    </p>
                  </div>
                )}

              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
