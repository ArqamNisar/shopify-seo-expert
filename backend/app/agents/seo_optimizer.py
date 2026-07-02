import json
import re
from groq import Groq
from backend.app.config import GROQ_API_KEY, GROQ_MODEL_OPTIMIZER

def run_heuristic_optimization(product: dict, audit_report: dict) -> dict:
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
    if len(opt_title) < 30:
        opt_title = f"{opt_title} - High Quality & Premium Edition"
    elif len(opt_title) > 70:
        opt_title = opt_title[:67] + "..."

    # Optimize description: Structure it nicely with HTML headings and bullet points
    opt_desc = f"<h3>Why Choose Our {opt_title}?</h3>\n"
    opt_desc += f"<p>{clean_desc}</p>\n\n"
    opt_desc += "<h4>Key Features:</h4>\n<ul>\n"
    opt_desc += "  <li>Premium quality construction and materials</li>\n"
    opt_desc += "  <li>Ergonomic and user-friendly design</li>\n"
    opt_desc += "  <li>Long-lasting durability and reliability</li>\n"
    opt_desc += "</ul>"

    # Optimize tags: ensure we have at least a few keywords
    if isinstance(tags, str):
        tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
    elif isinstance(tags, list):
        tag_list = [t.lower() for t in tags]
    else:
        tag_list = []

    # Inject standard optimization tags
    essential_tags = ["premium", "bestseller", "shopify-seo", "quality-goods"]
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

    return {
        "optimized_title": opt_title,
        "optimized_description": opt_desc,
        "optimized_tags": opt_tags,
        "optimized_images": opt_images,
        "agent_reasoning": "Constructed standardized optimization outputs: Capitalized title, wrapped description into clean HTML sections with bulleted features, and mapped image positions to descriptive alt labels (Groq API Key not active, using rule-based formatter)."
    }

def optimize_product_seo(product: dict, audit_report: dict, user_api_key: str = None) -> dict:
    """
    Optimizes product details for search engines.
    Uses Groq llama3-70b-8192 if credentials are provided, falls back to rules-based formatter otherwise.
    """
    if isinstance(audit_report, list) and len(audit_report) > 0:
        audit_report = audit_report[0]

    api_key = user_api_key or GROQ_API_KEY
    if not api_key:
        return run_heuristic_optimization(product, audit_report)

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
    - Original Images: {json.dumps(image_details)}
    
    Here is the SEO Audit Report containing issues:
    {json.dumps(audit_report)}

    Task Instructions:
    1. Optimized Title: Write a title between 50-60 characters. Place primary keywords first. It must sound natural and drive clicks.
    2. Optimized Description: Write an engaging, HTML-structured description (using standard HTML formatting like <p>, <h3>, <ul>, <li>). It should be 150-300 words. Describe features, benefits, and address customer intent without spamming.
    3. Optimized Tags: Expand tags list to 6-10 keywords separated by commas.
    4. Optimized Image Alt Texts: Provide a descriptive, keyword-rich, and natural alt text for each image. Make each alt text unique and match the image position.

    Return a JSON object exactly matching this schema:
    {{
        "optimized_title": "<string: optimized title>",
        "optimized_description": "<string: HTML-formatted optimized description>",
        "optimized_tags": "<string: comma-separated tags>",
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
        result = run_heuristic_optimization(product, audit_report)
        result["agent_reasoning"] = f"Heuristic optimization applied because Groq API call failed: {str(e)}"
        return result
