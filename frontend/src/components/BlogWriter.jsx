import React, { useState, useEffect } from 'react';

function SerpPreview({ title, description, shopifyUrl = '', handle = '', blogHandle = 'news' }) {
  const [device, setDevice] = useState('desktop');
  
  const cleanUrl = shopifyUrl ? shopifyUrl.replace('https://', '').replace('http://', '') : 'store.myshopify.com';
  const displayTitle = title && title.length > 60 ? title.substring(0, 57) + '...' : title;
  const displayDesc = description && description.length > 160 ? description.substring(0, 157) + '...' : description;
  const displayArticleHandle = handle ? handle.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'article-url';

  return (
    <div className={`serp-preview-container ${device}`} style={{ width: '100%', marginTop: '1rem', marginBottom: '1.25rem' }}>
      <div className="serp-preview-header">
        <span>🔍 Article Search Preview</span>
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
        <span className="serp-favicon">📰</span>
        <span className="serp-breadcrumbs">
          {cleanUrl} › blogs › {blogHandle} › {displayArticleHandle}
        </span>
      </div>
      
      <div className="serp-title">
        {displayTitle || 'Please enter article title'}
      </div>
      
      <div className="serp-description">
        {displayDesc || 'Please enter article meta description'}
      </div>
    </div>
  );
}

export default function BlogWriter({
  product,
  blogData,
  shopifyUrl = '',
  targetKeyword = '',
  onTargetKeywordChange,
  isGenerating,
  onGenerateBlog,
  onPublishArticle,
  isPublishing,
  shopifyToken = '',
  onBack
}) {
  // Generation configuration
  const [tone, setTone] = useState('informative');
  const [length, setLength] = useState('medium');
  const [includeCta, setIncludeCta] = useState(true);

  // Loaded/Edited article contents
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedTags, setEditedTags] = useState('');
  const [editedMetaTitle, setEditedMetaTitle] = useState('');
  const [editedMetaDescription, setEditedMetaDescription] = useState('');

  // Publishing variables
  const [blogsList, setBlogsList] = useState([]);
  const [selectedBlogId, setSelectedBlogId] = useState('');
  const [selectedBlogHandle, setSelectedBlogHandle] = useState('news');
  const [authorName, setAuthorName] = useState('SEO Copywriter Agent');
  const [selectedImage, setSelectedImage] = useState('');
  const [publishStatus, setPublishStatus] = useState(true); // true = published, false = draft

  const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
  const [isCreatingBlog, setIsCreatingBlog] = useState(false);
  const [newBlogTitle, setNewBlogTitle] = useState('');
  const [showCreateBlogForm, setShowCreateBlogForm] = useState(false);
  const [previewTab, setPreviewTab] = useState('preview'); // 'preview' | 'html'

  // Fetch blogs list from Shopify on mount
  useEffect(() => {
    fetchBlogs();
  }, [shopifyUrl, shopifyToken]);

  // Load generated blog draft into interactive editor
  useEffect(() => {
    if (blogData) {
      setEditedTitle(blogData.title || '');
      setEditedContent(blogData.body_content || '');
      setEditedTags(blogData.tags || '');
      setEditedMetaTitle(blogData.meta_title || '');
      setEditedMetaDescription(blogData.meta_description || '');
    }
  }, [blogData]);

  // Pre-select first image of the product as the default featured image
  useEffect(() => {
    if (product?.images && product.images.length > 0 && !selectedImage) {
      setSelectedImage(product.images[0].src);
    }
  }, [product]);

  const fetchBlogs = async () => {
    if (!shopifyUrl || !shopifyToken) return;
    setIsLoadingBlogs(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/blogs', {
        headers: {
          'Shopify-Shop-Url': shopifyUrl,
          'Shopify-Access-Token': shopifyToken
        }
      });
      if (response.ok) {
        const data = await response.json();
        const list = data.blogs || [];
        setBlogsList(list);
        if (list.length > 0) {
          setSelectedBlogId(list[0].id.toString());
          setSelectedBlogHandle(list[0].handle || 'news');
        }
      }
    } catch (err) {
      console.error('Failed to fetch blogs:', err);
    } finally {
      setIsLoadingBlogs(false);
    }
  };

  const handleBlogChange = (blogIdStr) => {
    setSelectedBlogId(blogIdStr);
    const matched = blogsList.find(b => b.id.toString() === blogIdStr);
    if (matched) {
      setSelectedBlogHandle(matched.handle || 'news');
    }
  };

  const handleCreateDefaultBlog = async (e) => {
    e.preventDefault();
    const titleToCreate = newBlogTitle.trim() || 'News';
    setIsCreatingBlog(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Shopify-Shop-Url': shopifyUrl,
          'Shopify-Access-Token': shopifyToken
        },
        body: JSON.stringify({ title: titleToCreate })
      });
      if (response.ok) {
        setNewBlogTitle('');
        setShowCreateBlogForm(false);
        await fetchBlogs();
      } else {
        const err = await response.json();
        alert(`Failed to create blog: ${err.detail || 'API error'}`);
      }
    } catch (err) {
      alert(`Network error creating blog: ${err.message}`);
    } finally {
      setIsCreatingBlog(false);
    }
  };

  const handleRunGenerator = () => {
    onGenerateBlog({
      tone,
      length,
      include_cta: includeCta,
      target_keyword: targetKeyword || null
    });
  };

  const handlePublishSubmit = (e) => {
    e.preventDefault();
    if (!selectedBlogId) {
      alert('Please select or create a Shopify blog category before publishing.');
      return;
    }
    onPublishArticle(selectedBlogId, {
      title: editedTitle,
      author: authorName,
      tags: editedTags,
      body_html: editedContent,
      published: publishStatus,
      image_url: selectedImage || null,
      meta_title: editedMetaTitle || null,
      meta_description: editedMetaDescription || null
    });
  };

  const wordCount = editedContent 
    ? editedContent.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length 
    : 0;

  // SEO Optimal Target Lengths
  const targetWords = length === 'short' ? 400 : length === 'medium' ? 800 : 1200;
  const minWords = Math.round(targetWords * 0.9);
  const maxWords = Math.round(targetWords * 1.1);

  const isTitleOptimal = editedTitle.length >= 50 && editedTitle.length <= 70;
  const isMetaTitleOptimal = editedMetaTitle.length >= 50 && editedMetaTitle.length <= 60;
  const isMetaDescOptimal = editedMetaDescription.length >= 120 && editedMetaDescription.length <= 190;
  const isBodyOptimal = wordCount >= minWords && wordCount <= maxWords;

  // Keyword check logic
  const kw = targetKeyword ? targetKeyword.toLowerCase().trim() : '';
  const cleanBodyText = editedContent ? editedContent.replace(/<[^>]*>/g, ' ').toLowerCase() : '';
  const keywordInTitle = kw ? editedTitle.toLowerCase().includes(kw) : true;
  const keywordInMetaTitle = kw ? editedMetaTitle.toLowerCase().includes(kw) : true;
  const keywordInMetaDesc = kw ? editedMetaDescription.toLowerCase().includes(kw) : true;

  let keywordDensityCount = 0;
  if (kw && cleanBodyText) {
    let pos = cleanBodyText.indexOf(kw);
    while (pos !== -1) {
      keywordDensityCount++;
      pos = cleanBodyText.indexOf(kw, pos + kw.length);
    }
  }
  const isKeywordDensityOptimal = kw ? (keywordDensityCount >= 3 && keywordDensityCount <= 5) : true;

  const handleAutoFix = () => {
    // 1. Fix Article Title: 50 to 70 chars
    let newTitle = editedTitle.trim();
    if (newTitle.length < 50) {
      newTitle = `${newTitle} | Complete Product Guide & Review`;
      if (newTitle.length > 70) {
        newTitle = newTitle.substring(0, 70);
      }
    } else if (newTitle.length > 70) {
      newTitle = newTitle.substring(0, 67) + '...';
    }
    setEditedTitle(newTitle);

    // 2. Fix Meta Title: 50 to 60 chars
    let newMetaTitle = editedMetaTitle.trim() || newTitle;
    if (newMetaTitle.length < 50) {
      newMetaTitle = `${newMetaTitle} | Shop Online`;
      if (newMetaTitle.length > 60) {
        newMetaTitle = newMetaTitle.substring(0, 60);
      }
    } else if (newMetaTitle.length > 60) {
      newMetaTitle = newMetaTitle.substring(0, 57) + '...';
    }
    setEditedMetaTitle(newMetaTitle);

    // 3. Fix Meta Description: 120 to 190 chars
    let newMetaDesc = editedMetaDescription.trim();
    if (newMetaDesc.length < 120) {
      newMetaDesc = `${newMetaDesc} Discover key features, technical specifications, real-world application context, and comprehensive customer feedback details.`;
      if (newMetaDesc.length > 190) {
        newMetaDesc = newMetaDesc.substring(0, 190);
      }
    } else if (newMetaDesc.length > 190) {
      newMetaDesc = newMetaDesc.substring(0, 187) + '...';
    }
    setEditedMetaDescription(newMetaDesc);

    // 4. Fix Article Content Body Word Count
    let currentWords = wordCount;
    if (currentWords < minWords) {
      // Too short: append professional SEO paragraphs to meet minWords
      let newHtml = editedContent;
      const keywordToWeave = targetKeyword ? targetKeyword : (product?.title || 'this premium product');
      const extraParagraphs = [
        `<p>Furthermore, choosing the ${keywordToWeave} ensures that you are utilizing a solution designed with top-tier materials to guarantee long-term stability and reliability in various settings. Our engineering team has focused on optimizing the user interface and structural build, ensuring a seamless experience and a product that continues to deliver value over time.</p>`,
        `<p>Additionally, integrating the ${keywordToWeave} into your setup addresses key requirements for efficiency and durability. We offer dedicated customer support, a comprehensive warranty, and helpful setup guidelines to ensure you get the absolute most out of your investment. Join thousands of satisfied users who have elevated their daily routines with this modern solution.</p>`,
        `<p>In conclusion, selecting the ${keywordToWeave} is the best way to guarantee high-performance, quality craftsmanship, and reliable daily operation. Don't miss the opportunity to upgrade your setup with this outstanding tool that stands out from standard marketplace alternatives.</p>`
      ];

      for (const p of extraParagraphs) {
        newHtml = `${newHtml}\n\n${p}`;
        const tempClean = newHtml.replace(/<[^>]*>/g, ' ').trim();
        const tempWords = tempClean.split(/\s+/).filter(Boolean).length;
        if (tempWords >= minWords) {
          break;
        }
      }
      setEditedContent(newHtml);
    } else if (currentWords > maxWords) {
      // Too long: truncate paragraph/header blocks safely
      const parts = editedContent.split(/(?<=<\/p>|<\/h3>|<\/h4>|<\/ul>)/gi).map(p => p.trim()).filter(Boolean);
      let newHtml = "";
      let wordAccumulator = 0;
      for (const part of parts) {
        const partText = part.replace(/<[^>]*>/g, ' ').trim();
        const partWords = partText.split(/\s+/).filter(Boolean).length;
        
        if (wordAccumulator + partWords <= maxWords || newHtml === "") {
          newHtml += (newHtml ? "\n\n" : "") + part;
          wordAccumulator += partWords;
        } else {
          break;
        }
      }
      setEditedContent(newHtml);
    }
  };

  return (
    <div>
      {/* Header toolbar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          ⬅ Back to Catalog
        </button>
        {blogData && (
          <div className="view-mode-tabs">
            <button
              type="button"
              className={`view-mode-tab ${previewTab === 'preview' ? 'active' : ''}`}
              onClick={() => setPreviewTab('preview')}
            >
              👁️ Visual Preview
            </button>
            <button
              type="button"
              className={`view-mode-tab ${previewTab === 'html' ? 'active' : ''}`}
              onClick={() => setPreviewTab('html')}
            >
              ✏️ Edit HTML Draft
            </button>
          </div>
        )}
      </div>

      <div className="editor-layout">
        {/* Left Side: Setup & Publishing controls */}
        <div className="editor-pane" style={{ maxWidth: '380px' }}>
          
          {/* Section 1: Generation preferences */}
          <div className="glass-card" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span>✍️</span> Copywriter Settings
            </h3>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="blog-tone-select">Brand Voice Tone</label>
              <select
                id="blog-tone-select"
                className="form-control"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={isGenerating}
              >
                <option value="informative">Informative / Expert</option>
                <option value="promotional">Promotional / Sales-focused</option>
                <option value="storytelling">Storytelling / Narrative</option>
                <option value="educational">Educational / Guide</option>
                <option value="playful">Playful / Casual</option>
                <option value="professional">Professional / B2B</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="blog-length-select">Target Article Length</label>
              <select
                id="blog-length-select"
                className="form-control"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                disabled={isGenerating}
              >
                <option value="short">Short (~400 words)</option>
                <option value="medium">Medium (~800 words)</option>
                <option value="long">Long (~1200 words)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="blog-keyword-input">Target SEO Keyword (optional)</label>
              <input
                id="blog-keyword-input"
                type="text"
                className="form-control"
                placeholder="e.g. smart sensors, diy robotics"
                value={targetKeyword}
                onChange={(e) => onTargetKeywordChange(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input
                type="checkbox"
                id="blog-include-cta"
                style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                checked={includeCta}
                onChange={(e) => setIncludeCta(e.target.checked)}
                disabled={isGenerating}
              />
              <label htmlFor="blog-include-cta" style={{ fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
                Include Product CTA Purchase Link
              </label>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleRunGenerator}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="spinner spinner-purple" style={{ width: '16px', height: '16px', borderWidth: '2px', display: 'inline-block', marginRight: '8px' }}></span>
                  Agent Writing Draft...
                </>
              ) : blogData ? 'Re-generate Blog Post 🔄' : 'Generate Blog Post 🤖'}
            </button>
          </div>

          {/* Section 2: Publishing configurations (Only active when content is drafted) */}
          {blogData && (
            <div className="glass-card" style={{ animation: 'fadeIn 0.3s ease both' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span>🚀</span> Publishing Settings
              </h3>
              
              <form onSubmit={handlePublishSubmit}>
                {/* Blog Category selection */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="blog-category-select" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Select Shopify Blog Category
                    {isLoadingBlogs && <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }}></span>}
                  </label>
                  
                  {blogsList.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        id="blog-category-select"
                        className="form-control"
                        value={selectedBlogId}
                        onChange={(e) => handleBlogChange(e.target.value)}
                        disabled={isPublishing}
                      >
                        {blogsList.map(blog => (
                          <option key={blog.id} value={blog.id}>
                            {blog.title} ({blog.handle})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0 0.5rem', fontSize: '0.9rem' }}
                        onClick={() => setShowCreateBlogForm(!showCreateBlogForm)}
                        title="Create a new blog category"
                      >
                        ➕
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '0.5rem', background: 'var(--seo-orange-glow)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--seo-orange)', lineHeight: 1.3, marginBottom: '0.4rem' }}>
                        ⚠️ No blog categories found. Create a blog category on your store first.
                      </p>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: '100%', fontSize: '0.75rem', padding: '0.3rem' }}
                        onClick={() => setShowCreateBlogForm(true)}
                      >
                        Create Default "News" Blog
                      </button>
                    </div>
                  )}
                </div>

                {/* Subform to create blog category */}
                {showCreateBlogForm && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem', animation: 'slideDown 0.25s' }}>
                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label htmlFor="new-blog-title-input" style={{ fontSize: '0.75rem' }}>Blog Category Title</label>
                      <input
                        id="new-blog-title-input"
                        type="text"
                        className="form-control"
                        placeholder="e.g. Store Updates, Tech News"
                        value={newBlogTitle}
                        onChange={(e) => setNewBlogTitle(e.target.value)}
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        disabled={isCreatingBlog}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => setShowCreateBlogForm(false)}
                        disabled={isCreatingBlog}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={handleCreateDefaultBlog}
                        disabled={isCreatingBlog}
                      >
                        {isCreatingBlog ? 'Creating...' : 'Create Blog'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Author Name */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="blog-author-input">Author Name</label>
                  <input
                    id="blog-author-input"
                    type="text"
                    className="form-control"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    disabled={isPublishing}
                  />
                </div>

                {/* Featured Image Selector */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Select Featured Image</label>
                  {product.images && product.images.length > 0 ? (
                    <div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem', background: 'rgba(255,255,255,0.02)', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        {product.images.map((img, idx) => (
                          <div 
                            key={img.id || idx} 
                            style={{ 
                              position: 'relative', 
                              cursor: 'pointer', 
                              borderRadius: '6px', 
                              overflow: 'hidden',
                              border: selectedImage === img.src ? '3px solid var(--accent-purple)' : '1px solid var(--border-color)',
                              boxShadow: selectedImage === img.src ? '0 0 8px rgba(124,58,237,0.3)' : 'none',
                              transition: 'transform 0.15s'
                            }}
                            onClick={() => setSelectedImage(img.src)}
                            title="Set as featured banner image"
                          >
                            <img
                              src={img.src}
                              alt=""
                              style={{ width: '56px', height: '56px', objectFit: 'cover', display: 'block' }}
                            />
                            {selectedImage === img.src && (
                              <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'var(--accent-purple)', color: 'white', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                                ✓
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: '100%', marginTop: '0.4rem', fontSize: '0.75rem', padding: '0.3rem' }}
                        onClick={() => setSelectedImage('')}
                      >
                        Remove Image (Omit Featured banner)
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No images available for this product.</p>
                  )}
                </div>

                {/* Publish Status Toggle */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="blog-status-select">Visibility Status</label>
                  <select
                    id="blog-status-select"
                    className="form-control"
                    value={publishStatus ? 'active' : 'draft'}
                    onChange={(e) => setPublishStatus(e.target.value === 'active')}
                    disabled={isPublishing}
                  >
                    <option value="active">Visible (Publish immediately)</option>
                    <option value="draft">Hidden (Save as draft article)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-success"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  disabled={isPublishing || !selectedBlogId}
                >
                  {isPublishing ? (
                    <>
                      <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                      Publishing article...
                    </>
                  ) : (
                    <>
                      <span>🚀</span> Publish Article to Store
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Visual Workstation */}
        <div className="editor-pane">
          {!blogData ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6rem 2rem', minHeight: '400px' }}>
              <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem', animation: 'float 4s ease-in-out infinite' }}>📝</span>
              <h2>AI Copywriter Workshop</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0.5rem auto 1.5rem', lineHeight: 1.4 }}>
                Ready to create? Configure your brand voice parameters on the left and trigger the Blog Writer Agent to draft an SEO-friendly article for <strong>{product.title}</strong>.
              </p>
            </div>
          ) : (
            <div className="glass-card" style={{ minHeight: '600px', borderColor: 'rgba(124, 58, 237, 0.15)', padding: '1.5rem' }}>
              
              {/* SEO Compliance Checklist Panel */}
              <div className="seo-compliance-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <span>📊</span> SEO Optimization Checklist
                  </h4>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAutoFix}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(124, 58, 237, 0.3)', background: 'rgba(124, 58, 237, 0.05)', color: 'var(--accent-purple)' }}
                    title="Programmatically adjust Title, Meta Title, and Meta Description lengths to fit ideal limits."
                  >
                    <span>🪄</span> Auto-Fix Lengths
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {/* Character Limits Checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{isTitleOptimal ? '🟢' : '🔴'}</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Article Title ({editedTitle.length} chars)</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: 50-70 characters</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{isMetaTitleOptimal ? '🟢' : '🔴'}</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>SEO Meta Title ({editedMetaTitle.length} chars)</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: 50-60 characters</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{isMetaDescOptimal ? '🟢' : '🔴'}</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>SEO Meta Description ({editedMetaDescription.length} chars)</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: 120-190 characters</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{isBodyOptimal ? '🟢' : '🔴'}</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Article Body ({wordCount} words)</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: ~{targetWords} words ({minWords}-{maxWords} allowed)</span>
                      </div>
                    </div>
                  </div>

                  {/* Keyword Limits Checklist (only visible if keyword is set) */}
                  {targetKeyword ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>{keywordInTitle ? '🟢' : '🔴'}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Keyword in Title</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Must include "{targetKeyword}"</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>{keywordInMetaTitle ? '🟢' : '🔴'}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Keyword in Meta Title</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Must include "{targetKeyword}"</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>{keywordInMetaDesc ? '🟢' : '🔴'}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Keyword in Meta Desc</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Must include "{targetKeyword}"</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>{isKeywordDensityOptimal ? '🟢' : '🔴'}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Keyword Density ({keywordDensityCount}x)</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recommended: 3 to 5 mentions</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      ℹ️ Enter a target keyword in Settings (left pane) to enable keyword optimization checks.
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Preview Tab */}
              {previewTab === 'preview' && (
                <div style={{ animation: 'fadeIn 0.3s ease both' }}>
                  {/* Article Banner Header */}
                  {selectedImage && (
                    <div style={{ width: '100%', height: '220px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                      <img
                        src={selectedImage}
                        alt="Blog Cover banner"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  
                  {/* Title & Metadata */}
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: '0.5rem' }}>
                    {editedTitle || '(Untitled Article)'}
                  </h1>
                  
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <span>✍️ By: <strong>{authorName || 'SEO Agent'}</strong></span>
                    <span>📂 Category: <strong>{blogsList.find(b => b.id.toString() === selectedBlogId)?.title || 'News'}</strong></span>
                    <span>⏱️ Length: <strong>{wordCount} words</strong></span>
                  </div>

                  {/* Rendered HTML Body */}
                  <div 
                    className="blog-preview-html-body"
                    style={{ 
                      fontSize: '1rem', 
                      color: 'var(--text-secondary)', 
                      lineHeight: 1.6, 
                      whiteSpace: 'normal',
                      wordBreak: 'break-word'
                    }}
                    dangerouslySetInnerHTML={{ __html: editedContent }}
                  />

                  {/* Generated Tags list */}
                  {editedTags && (
                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Article Tags:</span>
                      {editedTags.split(',').map((tag, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.2rem 0.6rem', borderRadius: '20px', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Strategy Reasoning Section */}
                  {blogData.agent_reasoning && (
                    <div style={{ marginTop: '2.5rem', background: 'var(--accent-purple-glow)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-purple)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', gap: '0.25rem' }}>
                        <span>🤖</span> Copywriting Strategy
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {blogData.agent_reasoning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Edit HTML Tab */}
              {previewTab === 'html' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.3s ease both' }}>
                  
                  {/* Serp Preview */}
                  <SerpPreview 
                    title={editedMetaTitle || editedTitle} 
                    description={editedMetaDescription} 
                    shopifyUrl={shopifyUrl} 
                    handle={editedTitle} 
                    blogHandle={selectedBlogHandle}
                  />

                  {/* Article Title */}
                  <div className="editor-field" style={{ borderColor: (editedTitle.length >= 50 && editedTitle.length <= 70) ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)' }}>
                    <div className="editor-field-header">
                      <label htmlFor="edit-blog-title">Article Title</label>
                      <span style={{ color: (editedTitle.length >= 50 && editedTitle.length <= 70) ? 'var(--seo-green)' : 'var(--seo-orange)' }}>
                        {editedTitle.length} chars (Target: 50-70)
                      </span>
                    </div>
                    <input
                      id="edit-blog-title"
                      type="text"
                      className="editor-input"
                      style={{ fontWeight: 700 }}
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                    />
                  </div>

                  {/* Article Meta Title */}
                  <div className="editor-field" style={{ borderColor: (editedMetaTitle.length >= 50 && editedMetaTitle.length <= 60) ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)' }}>
                    <div className="editor-field-header">
                      <label htmlFor="edit-blog-meta-title">SEO Article Meta Title</label>
                      <span style={{ color: (editedMetaTitle.length >= 50 && editedMetaTitle.length <= 60) ? 'var(--seo-green)' : 'var(--seo-orange)' }}>
                        {editedMetaTitle.length} chars (Target: 50-60)
                      </span>
                    </div>
                    <input
                      id="edit-blog-meta-title"
                      type="text"
                      className="editor-input"
                      value={editedMetaTitle}
                      onChange={(e) => setEditedMetaTitle(e.target.value)}
                    />
                  </div>

                  {/* Article Meta Description */}
                  <div className="editor-field" style={{ borderColor: (editedMetaDescription.length >= 120 && editedMetaDescription.length <= 190) ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)' }}>
                    <div className="editor-field-header">
                      <label htmlFor="edit-blog-meta-desc">SEO Article Meta Description</label>
                      <span style={{ color: (editedMetaDescription.length >= 120 && editedMetaDescription.length <= 190) ? 'var(--seo-green)' : 'var(--seo-orange)' }}>
                        {editedMetaDescription.length} chars (Target: 120-190)
                      </span>
                    </div>
                    <textarea
                      id="edit-blog-meta-desc"
                      className="editor-textarea"
                      style={{ minHeight: '70px' }}
                      value={editedMetaDescription}
                      onChange={(e) => setEditedMetaDescription(e.target.value)}
                    />
                  </div>

                  {/* HTML Content Body */}
                  <div className="editor-field">
                    <div className="editor-field-header">
                      <label htmlFor="edit-blog-content">Article Content Body (HTML Format)</label>
                      <span>{wordCount} words</span>
                    </div>
                    <textarea
                      id="edit-blog-content"
                      className="editor-textarea"
                      style={{ minHeight: '300px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                    />
                  </div>

                  {/* Article Tags */}
                  <div className="editor-field">
                    <div className="editor-field-header">
                      <label htmlFor="edit-blog-tags">Article Tags (Comma-separated)</label>
                      <span>{editedTags.split(',').filter(Boolean).length} tags</span>
                    </div>
                    <input
                      id="edit-blog-tags"
                      type="text"
                      className="editor-input"
                      value={editedTags}
                      onChange={(e) => setEditedTags(e.target.value)}
                    />
                  </div>

                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
