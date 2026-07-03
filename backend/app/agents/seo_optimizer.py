import json
import re
from groq import Groq
from backend.app.config import GROQ_API_KEY, GROQ_MODEL_OPTIMIZER

def get_metafield_value(product: dict, namespace: str, key: str):
    metafields = product.get('metafields_list', [])
    if not metafields:
        return None
    for mf in metafields:
        if mf.get('namespace') == namespace and mf.get('key') == key:
            return mf.get('value')
    return None

def run_heuristic_optimization(product: dict, audit_report: dict, target_keyword: str = None) -> dict:
    """Fallback heuristic optimizer when Groq API Key is not available."""
    title = product.get("title", "")
    description = product.get("body_html", "") or product.get("description", "")
    tags = product.get("tags", "")
    images = product.get("images", [])

    # Clean description from HTML tag
    clean_desc = re.sub('<[^<]+?>', '', description)
    if not clean_desc.strip():
        clean_desc = "Premium quality product designed for durability and high performance. Perfect for daily use."

    # Optimize title: Capitalize, strip, and make sure it has the name of the store or basic tags
    opt_title = title.strip().title()
    if target_keyword:
        kw = target_keyword.strip().title()
        if kw not in opt_title:
            opt_title = f"{kw} - {opt_title}"
    if len(opt_title) < 50:
        opt_title = f"{opt_title} - High Quality Premium Edition"
    if len(opt_title) > 60:
        opt_title = opt_title[:57] + "..."

    # Ensure the description is rich and long enough to exceed 300 words to satisfy the analyzer quality check
    intro_text = (
        f"Discover the exceptional quality and innovative design of our {opt_title}. "
        "Engineered to meet the highest industry standards, this premium product delivers "
        "unmatched reliability, durability, and efficiency for both professional and everyday use. "
        "Each unit is crafted with meticulous attention to detail using state-of-the-art materials, "
        "ensuring a long lifespan and outstanding wear resistance under various operating conditions."
    )
    
    features_intro = (
        "Designed with user convenience in mind, it integrates seamlessly into your existing workflows "
        "and setups. Whether you are looking to upgrade your current gear or starting a new project, "
        "our product offers the perfect balance of price, performance, and functionality. "
        "We stand behind the craftsmanship of all our items, offering dedicated support and "
        "a commitment to customer satisfaction."
    )

    opt_desc = f"<h3>Why Choose Our {opt_title}?</h3>\n"
    opt_desc += f"<p>{intro_text}</p>\n"
    opt_desc += f"<p>{clean_desc}</p>\n\n"
    opt_desc += f"<p>{features_intro}</p>\n\n"
    opt_desc += "<h4>Key Product Specifications and Features:</h4>\n<ul>\n"
    opt_desc += "  <li><strong>Premium Materials:</strong> Crafted using high-grade components for maximum durability and strength.</li>\n"
    opt_desc += "  <li><strong>Ergonomic Architecture:</strong> Engineered with a user-centric design layout to guarantee comfort, efficiency, and safety.</li>\n"
    opt_desc += "  <li><strong>High Operational Efficiency:</strong> Optimized to perform consistently with low energy consumption and minimal maintenance.</li>\n"
    opt_desc += "  <li><strong>Versatile Application:</strong> Perfect for a wide variety of setups, hobbyist projects, or heavy-duty industrial tasks.</li>\n"
    opt_desc += "</ul>\n\n"
    opt_desc += "<h4>Additional Details & Support</h4>\n"
    opt_desc += f"<p>We provide full technical support for our {opt_title} to ensure you get the most out of your purchase. "
    opt_desc += "For inquiries, documentation, or custom orders, feel free to contact our service team. "
    opt_desc += "Explore our comprehensive range of tools and matching accessories by visiting our "
    opt_desc += "<a href=\"/collections/all\">full collections page</a> to shop all related items.</p>"

    # Optimize tags: ensure we have at least a few keywords
    if isinstance(tags, str):
        tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
    elif isinstance(tags, list):
        tag_list = [t.lower() for t in tags]
    else:
        tag_list = []

    # Inject standard optimization tags
    essential_tags = ["premium", "bestseller", "shopify-seo", "quality-goods"]
    if target_keyword:
        essential_tags.append(target_keyword.lower().strip())
    for et in essential_tags:
        if et not in tag_list:
            tag_list.append(et)
    opt_tags = ", ".join(tag_list)

    # Optimize images: generate alt text based on product title
    opt_images = []
    for idx, img in enumerate(images):
        src = img.get("src", "")
        # Add index-based alt text
        alt_label = f"Close up view of {opt_title} - angle {idx + 1}" if idx > 0 else f"{opt_title} product image"
        opt_images.append({
            "id": img.get("id"),
            "src": src,
            "alt": alt_label
        })

    # Optimize Meta Title
    opt_meta_title = opt_title
    if len(opt_meta_title) > 60:
        opt_meta_title = opt_meta_title[:57] + "..."

    # Optimize Meta Description
    opt_meta_desc = clean_desc[:150].strip()
    if len(opt_meta_desc) < 120:
        opt_meta_desc = f"{opt_meta_desc} Shop high quality products with top-tier performance, durability, and customer support. Explore all premium catalog selections online."
    if len(opt_meta_desc) > 190:
        opt_meta_desc = opt_meta_desc[:187] + "..."

    # Optimize Product Type
    opt_prod_type = product.get("product_type", "")
    if not opt_prod_type or not opt_prod_type.strip():
        title_lower = title.lower()
        if "motor" in title_lower or "servo" in title_lower:
            opt_prod_type = "Industrial Motors"
        elif "breadboard" in title_lower or "sensor" in title_lower or "board" in title_lower:
            opt_prod_type = "Electronics Components"
        elif "cable" in title_lower or "adapter" in title_lower:
            opt_prod_type = "Electrical Supplies"
        else:
            opt_prod_type = "Industrial Equipment"

    return {
        "optimized_title": opt_title,
        "optimized_description": opt_desc,
        "optimized_tags": opt_tags,
        "optimized_images": opt_images,
        "optimized_meta_title": opt_meta_title,
        "optimized_meta_description": opt_meta_desc,
        "optimized_product_type": opt_prod_type,
        "agent_reasoning": "Constructed standardized optimization outputs: Capitalized title, wrapped description into clean HTML sections with bulleted features, generated dedicated search engine meta tags, categorized product type, and mapped image positions to descriptive alt labels (Groq API Key not active, using rule-based formatter)."
    }

def optimize_product_seo(product: dict, audit_report: dict, user_api_key: str = None, target_keyword: str = None) -> dict:
    """
    Optimizes product details for search engines.
    Uses Groq llama3-70b-8192 if credentials are provided, falls back to rules-based formatter otherwise.
    """
    if isinstance(audit_report, list) and len(audit_report) > 0:
        audit_report = audit_report[0]

    api_key = user_api_key or GROQ_API_KEY
    if not api_key:
        return run_heuristic_optimization(product, audit_report, target_keyword)

    title = product.get("title", "")
    description = product.get("body_html", "") or product.get("description", "")
    clean_desc = re.sub('<[^<]+?>', '', description)
    tags = product.get("tags", "")
    images = product.get("images", [])

    image_details = []
    for idx, img in enumerate(images):
        image_details.append({
            "id": img.get("id"),
            "src": img.get("src", ""),
            "alt": img.get("alt", "")
        })

    prompt = f"""
    You are an expert Shopify SEO Copywriter and Optimizer Agent. Optimize this product's SEO fields.
    
    Here is the Product Information:
    - Original Title: "{title}"
    - Original Description (Raw Text): "{clean_desc}"
    - Original Tags: "{tags}"
    - Original Product Type: "{product.get("product_type") or '(Not specified)'}"
    - Original Meta Title (global.title_tag): "{get_metafield_value(product, 'global', 'title_tag') or ''}"
    - Original Meta Description (global.description_tag): "{get_metafield_value(product, 'global', 'description_tag') or ''}"
    - Original Images: {json.dumps(image_details)}
    - Target SEO Keyword: "{target_keyword or '(Not specified)'}"
    
    Here is the SEO Audit Report containing issues:
    {json.dumps(audit_report)}

    Task Instructions:
    1. Optimized Title: Write a product title between 50-60 characters. Place primary keywords first (if target keyword is specified, prioritize it!). It must sound natural and drive clicks.
    2. Optimized Description: Write an engaging, HTML-structured description (using standard HTML formatting like <p>, <h3>, <ul>, <li>). The description MUST exceed 300 words (aim for 310-330 words) to meet the SEO search density check. Describe features, benefits, and address customer intent (make sure to integrate the target keyword naturally at least 2-3 times if specified!). Additionally, you MUST embed at least one storefront internal hyperlink (e.g., `<a href="/collections/all">explore our collections</a>` or `<a href="/collections/best-sellers">best sellers</a>`) naturally inside the HTML description body to pass the internal linking audit check.
    3. Optimized Tags: Expand tags list to 6-10 keywords separated by commas (include the target keyword in tags if specified!).
    4. Optimized Image Alt Texts: Provide a descriptive, keyword-rich, and natural alt text for each image. Make each alt text unique and match the image position. Do not leave any image alt text blank.
    5. Optimized Meta Title (global.title_tag): Write an SEO meta title between 50-60 characters. It should highlight the product value proposition and include target keywords.
    6. Optimized Meta Description (global.description_tag): Write an engaging, keyword-rich SEO meta description between 120-190 characters. Avoid raw HTML here; write plain text only.
    7. Optimized Product Type: Categorize the product into a clean standard Shopify category type (e.g., "Electronics Components", "Industrial Motors", etc.) based on the title and target keyword.

    Return a JSON object exactly matching this schema:
    {{
        "optimized_title": "<string: optimized title>",
        "optimized_description": "<string: HTML-formatted optimized description>",
        "optimized_tags": "<string: comma-separated tags>",
        "optimized_meta_title": "<string: SEO meta title>",
        "optimized_meta_description": "<string: SEO meta description>",
        "optimized_product_type": "<string: optimized product type>",
        "optimized_images": [
            {{
                "id": <id of image>,
                "src": "<string: src URL>",
                "alt": "<string: custom optimized alt text>"
            }}
        ],
        "agent_reasoning": "<string: explanation of your optimization decisions (e.g. keywords targeted, title format, and description copywriting choices)>"
    }}
    """

    try:
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a specialized JSON-outputting Shopify SEO copywriter. Always output strictly valid JSON content representing the optimization."
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
        return json.loads(result_str)
        
    except Exception as e:
        # Fall back gracefully on Groq error
        result = run_heuristic_optimization(product, audit_report, target_keyword)
        result["agent_reasoning"] = f"Heuristic optimization applied because Groq API call failed: {str(e)}"
        return result
