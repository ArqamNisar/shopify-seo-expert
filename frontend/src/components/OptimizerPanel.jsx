import React, { useState, useEffect } from 'react';

export default function OptimizerPanel({
  product,
  optimizationData,
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

  // Load optimization recommendations into state when they arrive
  useEffect(() => {
    if (optimizationData) {
      setEditedTitle(optimizationData.optimized_title || '');
      setEditedDescription(optimizationData.optimized_description || '');
      setEditedTags(optimizationData.optimized_tags || '');
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
      images: editedImages
    });
  };

  const cleanDescriptionHTML = (html) => {
    if (!html) return '(No description)';
    return html.replace(/<[^>]*>/g, ' ').trim();
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          ⬅ Back to Catalog
        </button>
        {optimizationData && (
          <button className="btn btn-success" onClick={handleSyncSubmit} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', display: 'inline-block', marginRight: '8px' }}></span>
                Syncing...
              </>
            ) : 'Sync Enhancements to Shopify 🚀'}
          </button>
        )}
      </div>

      {!optimizationData ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🤖</span>
          <h2>Optimize Product Content</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.5rem auto 2rem' }}>
            Run the Optimizer Agent to let the model write high-performing titles, SEO-friendly HTML descriptions, descriptive tags, and visual search alt texts.
          </p>
          <button className="btn btn-primary" onClick={onRunOptimize} disabled={isOptimizing}>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Title</span>
                    <span>{product.title?.length || 0} chars</span>
                  </div>
                  <div className="editor-text" style={{ fontWeight: 600 }}>{product.title}</div>
                </div>

                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Description (Clean text)</span>
                    <span>{cleanDescriptionHTML(product.body_html || product.description).split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                  <div className="editor-text" style={{ maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {cleanDescriptionHTML(product.body_html || product.description)}
                  </div>
                </div>

                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Tags</span>
                  </div>
                  <div className="editor-text" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {product.tags || '(None)'}
                  </div>
                </div>

                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Image Alt Text Assets</span>
                  </div>
                  {product.images && product.images.length > 0 ? (
                    product.images.map((img, idx) => (
                      <div key={img.id || idx} className="img-alt-editor">
                        <img className="img-alt-thumb" src={img.src} alt="" />
                        <div style={{ flex: 1, fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Alt Tag {idx + 1}</span>
                          <span style={{ wordBreak: 'break-all' }}>{img.alt || '(Empty Alt Tag)'}</span>
                        </div>
                      </div>
                    ))
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

              <form onSubmit={handleSyncSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
                
                {/* Title */}
                <div className="editor-field" style={{ borderColor: (editedTitle.length >= 50 && editedTitle.length <= 60) ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)' }}>
                  <div className="editor-field-header">
                    <label htmlFor="opt-title" style={{ cursor: 'pointer' }}>Title Suggestion</label>
                    <span style={{ color: (editedTitle.length >= 50 && editedTitle.length <= 60) ? 'var(--seo-green)' : 'var(--seo-orange)' }}>
                      {editedTitle.length} chars (Sweet spot: 50-60)
                    </span>
                  </div>
                  <input
                    id="opt-title"
                    type="text"
                    className="editor-input"
                    style={{ fontWeight: 600 }}
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="editor-field">
                  <div className="editor-field-header">
                    <label htmlFor="opt-desc" style={{ cursor: 'pointer' }}>Description (HTML Layout)</label>
                    <span>{editedDescription.split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                  <textarea
                    id="opt-desc"
                    className="editor-textarea"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                  />
                </div>

                {/* Tags */}
                <div className="editor-field">
                  <div className="editor-field-header">
                    <label htmlFor="opt-tags" style={{ cursor: 'pointer' }}>Expanded Tags List</label>
                    <span>{editedTags.split(',').filter(Boolean).length} tags</span>
                  </div>
                  <input
                    id="opt-tags"
                    type="text"
                    className="editor-input"
                    value={editedTags}
                    onChange={(e) => setEditedTags(e.target.value)}
                  />
                </div>

                {/* Image Alts */}
                <div className="editor-field">
                  <div className="editor-field-header">
                    <span>Optimized Image Alt Texts</span>
                  </div>
                  {editedImages.length > 0 ? (
                    editedImages.map((img, idx) => (
                      <div key={img.id || idx} className="img-alt-editor">
                        <img className="img-alt-thumb" src={img.src} alt="" />
                        <div className="img-alt-input-wrapper">
                          <label htmlFor={`alt-input-${img.id || idx}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                            Alt Tag {idx + 1}
                          </label>
                          <input
                            id={`alt-input-${img.id || idx}`}
                            type="text"
                            className="editor-input"
                            style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}
                            value={img.alt || ''}
                            onChange={(e) => handleAltChange(img.id, e.target.value)}
                          />
                        </div>
                      </div>
                    ))
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
