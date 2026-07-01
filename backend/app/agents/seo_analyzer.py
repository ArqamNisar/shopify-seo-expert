import json
import re
from groq import Groq
from backend.app.config import GROQ_API_KEY, GROQ_MODEL_ANALYZER

def run_heuristic_analysis(product: dict) -> dict:
    """Fallback heuristic analyzer when Groq API Key is not available."""
    title = product.get("title", "")
    description = product.get("body_html", "") or product.get("description", "")
    # Clean HTML from description
    clean_desc = re.sub('<[^<]+?>', '', description)
    tags = product.get("tags", "")
    if isinstance(tags, str):
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    elif isinstance(tags, list):
        tag_list = tags
    else:
        tag_list = []
        
    images = product.get("images", [])

    issues = []
    
    # Title analysis
    title_len = len(title)
    if title_len == 0:
        title_score = 0
        issues.append({"type": "title", "severity": "high", "message": "Product title is empty."})
    elif title_len < 30:
        title_score = 60
        issues.append({"type": "title", "severity": "medium", "message": f"Title is short ({title_len} chars). Try aiming for 50-60 characters to include relevant keywords."})
    elif title_len > 70:
        title_score = 70
        issues.append({"type": "title", "severity": "medium", "message": f"Title is long ({title_len} chars). It might get cut off in Google search results (limit is ~60 characters)."})
    else:
        title_score = 100

    # Description analysis
    desc_words = len(clean_desc.split())
    if desc_words == 0:
        description_score = 0
        issues.append({"type": "description", "severity": "high", "message": "Description is empty. Write an informative description to engage buyers and help search engines."})
    elif desc_words < 50:
        description_score = 50
        issues.append({"type": "description", "severity": "high", "message": f"Description is very brief ({desc_words} words). Target at least 150-300 words with rich, semantic content."})
    elif desc_words < 150:
        description_score = 80
        issues.append({"type": "description", "severity": "low", "message": f"Description has {desc_words} words. Consider expanding to hit the 200+ word sweet spot for better SEO ranking."})
    else:
        description_score = 100

    # Tags analysis
    if len(tag_list) == 0:
        tags_score = 40
        issues.append({"type": "tags", "severity": "medium", "message": "No product tags defined. Add 5-10 descriptive tags for internal search and collection filtering."})
    elif len(tag_list) < 4:
        tags_score = 80
        issues.append({"type": "tags", "severity": "low", "message": f"Only {len(tag_list)} tags defined. Adding 3-5 more highly searched keywords can improve discovery."})
    else:
        tags_score = 100

    # Images & Alt texts
    image_count = len(images)
    if image_count == 0:
        images_score = 0
        issues.append({"type": "images", "severity": "high", "message": "No images present. High quality product images are crucial for conversions and Google Images SEO."})
    else:
        missing_alt = 0
        for idx, img in enumerate(images):
            alt = img.get("alt")
            if not alt or alt.strip() == "" or alt == title:
                missing_alt += 1
        
        if missing_alt > 0:
            images_score = max(0, 100 - (missing_alt * 25))
            issues.append({
                "type": "images",
                "severity": "high" if missing_alt == image_count else "medium",
                "message": f"{missing_alt} out of {image_count} images are missing custom alt text. Add descriptive keywords to alt tags for visual search indexing."
            })
        else:
            images_score = 100

    overall_score = int((title_score + description_score + tags_score + images_score) / 4)
    
    # Extracted keywords (basic word counting of nouns/adjectives)
    words = re.findall(r'\b[a-zA-Z]{4,}\b', (title + " " + " ".join(tag_list)).lower())
    stop_words = {"with", "that", "this", "from", "your", "them", "their", "they"}
    keywords = list(set([w for w in words if w not in stop_words]))[:6]

    return {
        "overall_score": overall_score,
        "scores": {
            "title_score": title_score,
            "description_score": description_score,
            "images_score": images_score,
            "tags_score": tags_score
        },
        "issues": issues,
        "keywords_detected": keywords,
        "agent_reasoning": "Performed heuristic SEO analysis based on length guidelines, tag distribution, and image alt text presence. (Groq API Key not active, using rules-based analyzer)."
    }

def analyze_product_seo(product: dict, user_api_key: str = None) -> dict:
    """
    Analyzes product information for SEO quality.
    Uses Groq llama3-70b-8192 for deep analysis if API key is provided/env is configured.
    Falls back to run_heuristic_analysis if no keys are found.
    """
    api_key = user_api_key or GROQ_API_KEY
    if not api_key:
        return run_heuristic_analysis(product)

    title = product.get("title", "")
    description = product.get("body_html", "") or product.get("description", "")
    clean_desc = re.sub('<[^<]+?>', '', description)
    tags = product.get("tags", "")
    images = product.get("images", [])
    
    image_details = []
    for idx, img in enumerate(images):
        image_details.append({
            "index": idx,
            "src": img.get("src", ""),
            "alt": img.get("alt", "")
        })

    prompt = f"""
    You are an expert Shopify SEO Analyst. Analyze the following Shopify product details and provide a comprehensive SEO Audit in JSON format.

    Product Details:
    - Title: "{title}"
    - Description: "{clean_desc}"
    - Tags: "{tags}"
    - Images: {json.dumps(image_details)}

    Evaluate the SEO details based on industry best practices:
    1. Title: Sweet spot is 50-60 characters. Must be catchy and contain high-intent keywords.
    2. Description: Sweet spot is 150-350 words. Must describe the product, benefits, and include semantic terms naturally. Avoid keyword stuffing.
    3. Tags: Must contain 5-10 specific tags relevant to products, materials, and target audience.
    4. Images: Every image must have unique, descriptive alt text explaining what's in the image. No placeholder, empty or duplicates of the title.

    Return a JSON object exactly matching this schema:
    {{
        "overall_score": <int: 0-100>,
        "scores": {{
            "title_score": <int: 0-100>,
            "description_score": <int: 0-100>,
            "images_score": <int: 0-100>,
            "tags_score": <int: 0-100>
        }},
        "issues": [
            {{
                "type": "title" | "description" | "images" | "tags",
                "severity": "high" | "medium" | "low",
                "message": "<string: clear descriptive feedback with actionable improvement metrics>"
            }}
        ],
        "keywords_detected": [<string: top 4-6 primary keywords found in product content>],
        "agent_reasoning": "<string: brief explanation of your overall diagnostic process and the reasoning for scores>"
    }}
    """

    try:
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a specialized JSON-outputting Shopify SEO analysis bot. Always output strictly valid JSON content representing the analysis."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=GROQ_MODEL_ANALYZER,
            response_format={"type": "json_object"}
        )
        
        result_str = chat_completion.choices[0].message.content
        return json.loads(result_str)
        
    except Exception as e:
        # Fall back gracefully on Groq error
        result = run_heuristic_analysis(product)
        result["agent_reasoning"] = f"Heuristic analysis applied because Groq API call failed: {str(e)}"
        return result
