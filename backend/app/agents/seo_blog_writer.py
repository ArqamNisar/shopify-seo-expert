import json
import re
from groq import Groq
from backend.app.config import GROQ_API_KEY, GROQ_MODEL_OPTIMIZER

def run_heuristic_blog_writing(
    product: dict, 
    tone: str, 
    length: str, 
    include_cta: bool, 
    target_keyword: str = None
) -> dict:
    """Heuristic fallback blog generator when Groq API is not active or fails."""
    title = product.get("title", "Product")
    handle = product.get("handle", "product-url")
    desc = product.get("body_html", "") or product.get("description", "")
    clean_desc = re.sub('<[^<]+?>', '', desc).strip()
    
    # Trim description if too long
    summary = clean_desc[:300] + "..." if len(clean_desc) > 300 else clean_desc
    if not summary.strip():
        summary = "our latest premium collection offering high performance, durability, and standard-setting design quality."

    # Determine word count baseline
    word_targets = {"short": 400, "medium": 800, "long": 1200}
    target_words = word_targets.get(length.lower(), 600)
    
    # Catchy titles based on tone
    titles_by_tone = {
        "informative": f"Everything You Need to Know About {title}",
        "promotional": f"Exclusive Look: Why You Need the New {title} Today",
        "storytelling": f"The Story Behind {title}: Crafting a Modern Solution",
        "educational": f"Step-by-Step Guide: How to Get the Most Out of {title}",
        "playful": f"Upgrade Your Gear Game! Meet the Amazing {title}",
        "professional": f"An In-Depth Industrial Assessment of {title}"
    }
    blog_title = titles_by_tone.get(tone.lower(), f"Discover the Benefits of {title}")
    
    if target_keyword:
        blog_title = f"{target_keyword.title()}: {blog_title}"

    # Generate body sections
    paragraphs = []
    
    # Intro
    if tone.lower() == "storytelling":
        intro = f"Every great innovation begins with a problem that needs solving. The journey of the {title} started with a simple vision: to design an item that marries function, design, and durability. Whether you are scaling up your workflow or tackling a new hobby, it serves as the ultimate companion."
    elif tone.lower() == "playful":
        intro = f"Get ready to level up your setup! We are super excited to show off the {title}—our favorite new product of the season. Packed with style, power, and loaded with features, this item is here to make your life a whole lot easier."
    elif tone.lower() == "professional":
        intro = f"In seeking to optimize efficiency and maintain peak performance levels, selecting the correct instrumentation is paramount. This review examines the technical capabilities and structural benefits of the {title}, designed to deliver high reliability."
    else:
        intro = f"Are you looking to enhance your everyday efficiency and take your setup to the next level? Look no further than the <strong>{title}</strong>. Crafted from premium materials and built with precision engineering, this is the product you have been waiting for."

    paragraphs.append(f"<p>{intro}</p>")
    
    # Body 1: Core Value
    kw_sentence = f" Integrating your target objective of '{target_keyword}' has never been simpler." if target_keyword else ""
    paragraphs.append(
        f"<h3>1. Built for Uncompromising Quality</h3>"
        f"<p>When it comes to selecting new additions, durability is always a primary concern. The {title} is constructed using industry-grade components that undergo rigorous quality testing. This ensures that it can withstand heavy, prolonged use without any degradation in performance.{kw_sentence}</p>"
    )

    # Body 2: Specifications
    paragraphs.append(
        f"<h3>2. Key Features and Technical Highlights</h3>"
        f"<p>Our development team focused on maximizing user convenience and utility. Here is a breakdown of what makes this product stand out from standard marketplace alternatives:</p>"
        f"<ul>"
        f"  <li><strong>Precision Engineering:</strong> Fully optimized dimensions and structural integrity for seamless installation.</li>"
        f"  <li><strong>Enhanced Durability:</strong> Heat, wear, and shock-resistant design variables.</li>"
        f"  <li><strong>User-Centric Interface:</strong> Crafted to minimize learning curves and integrate directly with your setup.</li>"
        f"</ul>"
    )

    # Body 3: Application Context
    paragraphs.append(
        f"<h3>3. Real-World Applications</h3>"
        f"<p>From home workshops to large-scale industrial assemblies, this product is highly versatile. Customers have integrated the {title} into various projects, reporting excellent reliability and a noticeable boost in overall workflow efficiency. For best results, we suggest combining this with matching accessories from our collection.</p>"
    )

    # Extra filler paragraphs to respect word count
    if target_words >= 800:
        paragraphs.append(
            f"<h3>Maximizing Long-Term Performance</h3>"
            f"<p>To keep the {title} operating at peak performance levels, simple preventative maintenance is key. Clean the device occasionally to prevent dust accumulation, check connections, and follow the simple setup steps included in our reference catalog. By dedicating a few minutes to proper care, you ensure a lifetime of trouble-free operations.</p>"
        )
    if target_words >= 1200:
        paragraphs.append(
            f"<h3>Understanding the Science Behind It</h3>"
            f"<p>Under the hood, the {title} leverages advanced physical alignment layouts. By utilizing high-conductivity contacts and premium grade shielding materials, internal wear is minimized. This scientific approach to standard wear resistance is what allows us to offer robust backing and guarantees that our customers receive nothing short of excellence.</p>"
        )

    # CTA
    if include_cta:
        cta_text = f"Shop the {title} Now"
        if tone.lower() == "playful":
            cta_text = f"🔥 Snag Your {title} Today!"
        elif tone.lower() == "promotional":
            cta_text = f"🛍️ Claim Your {title} - Buy Online"
            
        paragraphs.append(
            f"<h3>Ready to Upgrade?</h3>"
            f"<p>Don't settle for less when you can have the absolute best. Check out the product details, look through additional imagery, and purchase your unit directly from our store.</p>"
            f"<p style='margin-top: 1.5rem;'><a href=\"/products/{handle}\" id=\"blog-cta-link\" style=\"display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 700; transition: background 0.25s;\">{cta_text}</a></p>"
        )

    body_html = "\n\n".join(paragraphs)
    
    # Meta Details
    meta_title = f"Why Choose the {title} | Full Overview"
    if len(meta_title) > 60:
        meta_title = meta_title[:57] + "..."
    meta_desc = f"Looking for a reliable review of the {title}? Read our article detailing specifications, real-world testing, and key benefits."
    if len(meta_desc) > 160:
        meta_desc = meta_desc[:157] + "..."

    return {
        "title": blog_title,
        "body_content": body_html,
        "tags": f"Product Spotlight, {title}, Shopping Guide" + (f", {target_keyword}" if target_keyword else ""),
        "meta_title": meta_title,
        "meta_description": meta_desc,
        "agent_reasoning": "Constructed high-quality, template-based blog post tailored for the selected tone and length guidelines (Groq API Key not active, using rules-based content engine)."
    }

def generate_blog_article(
    product: dict,
    tone: str = "informative",
    length: str = "medium",
    include_cta: bool = True,
    target_keyword: str = None,
    user_api_key: str = None
) -> dict:
    """
    Generates an SEO-optimized blog article about a product.
    Uses Groq llama-3.3-70b-versatile for creative copywriting.
    Falls back to run_heuristic_blog_writing if key is missing or call fails.
    """
    api_key = user_api_key or GROQ_API_KEY
    if not api_key:
        return run_heuristic_blog_writing(product, tone, length, include_cta, target_keyword)

    title = product.get("title", "")
    description = product.get("body_html", "") or product.get("description", "")
    clean_desc = re.sub('<[^<]+?>', '', description).strip()
    tags = product.get("tags", "")
    product_type = product.get("product_type", "")
    handle = product.get("handle", "product-url")

    word_targets = {"short": 400, "medium": 800, "long": 1200}
    target_words = word_targets.get(length.lower(), 600)

    prompt = f"""
    You are an expert SEO Copywriter and Blog Writing Agent. Your task is to write a high-quality, engaging, and SEO-optimized blog post to promote the following product:
    
    === PRODUCT INFORMATION ===
    - Product Title: "{title}"
    - Product Description: "{clean_desc[:1000]}"
    - Current Tags: "{tags}"
    - Product Category/Type: "{product_type}"
    - Product Slug Handle: "{handle}"
    
    === BLOG SPECIFICATIONS ===
    - Tone: "{tone}" (adopt this brand voice: e.g. playful, informative, storytelling, professional, educational, promotional)
    - Target Length: ~{target_words} words. Structure it with rich subheaders and content blocks.
    - Target SEO Keyword: "{target_keyword or '(None specified)'}" (weave it naturally into the title, subheaders, and content paragraphs 3-5 times)
    - Include Product CTA Link: {include_cta} (If true, you MUST include a call-to-action section linking back to the product. Use relative path: "/products/{handle}" with engaging anchor text)

    === COPYWRITING REQUIREMENTS ===
    - DO NOT write plain text; format the post body entirely in structured HTML. Use tags like `<p>`, `<h3>`, `<h4>`, `<ul>`, `<li>`, `<strong>`, `<em>`.
    - DO NOT use `<h1>` or `<h2>` tags. They are reserved for Shopify's theme architecture.
    - Craft a highly engaging title between 50-70 characters.
    - Write a search engine meta title (50-60 chars) and meta description (120-190 chars) specifically for the blog article page.
    - Suggest 3-5 relevant article tags.

    === OUTPUT SCHEMA ===
    Return ONLY a valid JSON object matching this exact schema:
    {{
        "title": "<string: catchy, SEO-friendly blog post title>",
        "body_content": "<string: HTML-formatted blog body content>",
        "tags": "<string: comma-separated list of article tags>",
        "meta_title": "<string: 50-60 chars meta title for SEO>",
        "meta_description": "<string: 120-190 chars meta description for SEO, plain text only>",
        "agent_reasoning": "<string: summary of the SEO and copywriting strategy you used>"
    }}
    """

    try:
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a specialized JSON-outputting Shopify blog writing assistant. Always output strictly valid JSON content."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=GROQ_MODEL_OPTIMIZER,
            response_format={"type": "json_object"}
        )
        
        result_str = chat_completion.choices[0].message.content
        result = json.loads(result_str)

        # Basic validation / fallbacks
        if not result.get("title"):
            result["title"] = f"Spotlight on {title}: The Ultimate Guide"
        if not result.get("body_content"):
            result["body_content"] = f"<p>Learn more about our premium {title}. Perfect option for your catalog.</p>"
        if not result.get("meta_title"):
            result["meta_title"] = result["title"][:60]
        if not result.get("meta_description"):
            result["meta_description"] = f"Discover everything you need to know about {title}. Read our in-depth review, guides, and feature listings online."
        if not result.get("tags"):
            result["tags"] = f"Spotlight, {title}"

        return result
        
    except Exception as e:
        # Graceful fallback on LLM failure
        fallback = run_heuristic_blog_writing(product, tone, length, include_cta, target_keyword)
        fallback["agent_reasoning"] = f"Heuristic blog draft applied because Groq API call failed: {str(e)}"
        return fallback
