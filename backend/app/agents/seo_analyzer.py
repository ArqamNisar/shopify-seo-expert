import json
import re
from groq import Groq
from backend.app.config import GROQ_API_KEY, GROQ_MODEL_ANALYZER

def run_heuristic_analysis(product: dict) -> list:
    """Fallback heuristic analyzer when Groq API Key is not available."""
    title = product.get("title", "")
    handle = product.get("handle", "")
    product_type = product.get("product_type", "")
    status = product.get("status", "")
    tags = product.get("tags", "")
    images = product.get("images", [])
    
    # Parse metafields
    metafields = product.get("metafields_list", [])
    meta_title = None
    meta_description = None
    custom_metafields = []
    
    for mf in metafields:
        namespace = mf.get("namespace")
        key = mf.get("key")
        value = mf.get("value")
        if (namespace == "global" and key == "title_tag") or (namespace == "seo" and key == "title"):
            meta_title = value
        elif (namespace == "global" and key == "description_tag") or (namespace == "seo" and key == "description"):
            meta_description = value
        else:
            custom_metafields.append(mf)
            
    meta_title_length = len(meta_title) if meta_title else 0
    meta_description_length = len(meta_description) if meta_description else 0
    
    # Heuristics scoring
    # 1. Check if keyword is present in the title (out of 5)
    keyword_score = 0
    if title:
        title_lower = title.lower()
        words_to_check = []
        if product_type:
            words_to_check.extend(product_type.lower().split())
        if tags:
            if isinstance(tags, str):
                words_to_check.extend([t.strip().lower() for t in tags.split(",")])
            elif isinstance(tags, list):
                words_to_check.extend([t.lower() for t in tags])
        # If any word from tags or product type is in the title, score 5. Otherwise 3 as a baseline if title exists.
        if any(w in title_lower for w in words_to_check if len(w) > 3):
            keyword_score = 5
        else:
            keyword_score = 3 if title else 0
            
    # 2. Does the handle contain the product name? (out of 10)
    handle_score = 0
    if handle and title:
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        if slug in handle.lower() or handle.lower() in slug:
            handle_score = 10
        else:
            handle_score = 5
            
    # 3. Meta title should not be None (out of 10)
    meta_title_score = 10 if meta_title else 0
    
    # 4. Is the Product type relevant to the product? (out of 5)
    type_score = 5 if product_type else 0
    
    # 5. The length of meta title should be between 30 and 60. (out of 10)
    meta_title_len_score = 0
    if meta_title_length >= 30 and meta_title_length <= 60:
        meta_title_len_score = 10
    elif meta_title_length > 0:
        meta_title_len_score = 5
        
    # 6. Check the quality of the content in descriptionHtml (> 300 words) (out of 10)
    desc_html = product.get("body_html", "") or product.get("description", "") or ""
    clean_desc = re.sub('<[^<]+?>', '', desc_html)
    word_count = len(clean_desc.split())
    if word_count > 300:
        content_score = 10
    elif word_count > 100:
        content_score = 7
    elif word_count > 0:
        content_score = 3
    else:
        content_score = 0
        
    # 7. Meta description should not be None (out of 10)
    meta_desc_score = 10 if meta_description else 0
    
    # 8. The length of meta description should be between 120 and 190 characters. (out of 10)
    meta_desc_len_score = 0
    if meta_description_length >= 120 and meta_description_length <= 190:
        meta_desc_len_score = 10
    elif meta_description_length > 0:
        meta_desc_len_score = 5
        
    # 9. Check at least one internal link (<a href>) should be present in links (out of 5)
    links = re.findall(r'href="([^"]+)"', desc_html)
    internal_links_score = 5 if len(links) > 0 else 0
    
    # 10. There should be at least three images. (out of 5)
    image_count = len(images)
    image_count_score = 5 if image_count >= 3 else 0
    
    # 11. Check altText for all the images. (out of 5)
    alt_text_score = 5
    if image_count == 0:
        alt_text_score = 0
    else:
        for img in images:
            alt = img.get("alt", "")
            if not alt or alt.strip() == "":
                alt_text_score = 0
                break
                
    # 12. Are there at least 2 relevant tags? (out of 5)
    tag_count = 0
    if isinstance(tags, str):
        tag_count = len([t for t in tags.split(",") if t.strip()])
    elif isinstance(tags, list):
        tag_count = len(tags)
    tags_score = 5 if tag_count >= 2 else (3 if tag_count > 0 else 0)
    
    # 13. Is the status ACTIVE (out of 5)
    status_score = 5 if status.lower() == "active" else 0
    
    # 14. Are at least 1 custom metafield present? (out of 5)
    metafields_score = 5 if len(custom_metafields) > 0 else 0
    
    seo_score = (
        keyword_score + handle_score + meta_title_score + type_score +
        meta_title_len_score + content_score + meta_desc_score +
        meta_desc_len_score + internal_links_score + image_count_score +
        alt_text_score + tags_score + status_score + metafields_score
    )
    
    return [
        {
            "checks": [
                {"keyword_in_title": keyword_score},
                {"product_name_in_handle": handle_score},
                {"meta_title_set": meta_title_score},
                {"product_type_relevant": type_score},
                {"meta_title_length": meta_title_len_score},
                {"content_quality": content_score},
                {"meta_description_set": meta_desc_score},
                {"meta_description_length": meta_desc_len_score},
                {"internal_links": internal_links_score},
                {"image_count": image_count_score},
                {"alt_text": alt_text_score},
                {"relevant_tags": tags_score},
                {"status_active": status_score},
                {"metafields": metafield_score}
            ],
            "seo_score": seo_score,
            "product_name": title,
            "agent_reasoning": "Performed heuristic SEO analysis based on length guidelines, tag distribution, and image alt text presence. (Groq API Key not active, using rules-based analyzer)."
        }
    ]

def analyze_product_seo(product: dict, user_api_key: str = None) -> list:
    """
    Analyzes product information for SEO quality.
    Uses Groq llama3-70b-8192 for deep analysis if API key is provided/env is configured.
    Falls back to run_heuristic_analysis if no keys are found.
    """
    api_key = user_api_key or GROQ_API_KEY
    if not api_key:
        return run_heuristic_analysis(product)

    title = product.get("title", "")
    handle = product.get("handle", "")
    product_type = product.get("product_type", "")
    status = product.get("status", "")
    tags = product.get("tags", "")
    images = product.get("images", [])
    
    # Parse metafields
    metafields = product.get("metafields_list", [])
    meta_title = None
    meta_description = None
    custom_metafields = []
    
    for mf in metafields:
        namespace = mf.get("namespace")
        key = mf.get("key")
        value = mf.get("value")
        if (namespace == "global" and key == "title_tag") or (namespace == "seo" and key == "title"):
            meta_title = value
        elif (namespace == "global" and key == "description_tag") or (namespace == "seo" and key == "description"):
            meta_description = value
        else:
            custom_metafields.append(mf)
            
    meta_title_length = len(meta_title) if meta_title else 0
    meta_description_length = len(meta_description) if meta_description else 0
    
    # Parse links in description HTML
    desc_html = product.get("body_html", "") or product.get("description", "") or ""
    links = re.findall(r'href="([^"]+)"', desc_html)

    prompt = f"""
    You are a smart and efficient SEO agent. Your goal is to understand the Product Information precisely and perform the below mentioned checks accurately. And eventually assigning an SEO score.
    
    Shopify Product Information (as JSON):
    {json.dumps(product, indent=2)}

    Context Variables:
    - Product Name: "{title}"
    - Handle: "{handle}"
    - Product Type: "{product_type}"
    - Status: "{status}"
    - Tags: "{tags}"
    - Images: {json.dumps(images)}
    - Meta Title: {json.dumps(meta_title)}
    - Meta Title Length: {meta_title_length}
    - Meta Description: {json.dumps(meta_description)}
    - Meta Description Length: {meta_description_length}
    - Links in description: {json.dumps(links)}
    - Custom Metafields: {json.dumps(custom_metafields)}

    Instructions:
    - You will be forwarded a Shopify Product's information as an input. You need to perform some checks so that you can eventually assign an SEO score to that particular product.
    - The checks that you need to perform are as follows:
    * Check if keyword is present in the title.
        - Provide a score for this factor out of 5.
    * Does the handle contain the product name?
        - Provide a score for this factor out of 10.
    * Meta title should not be None. If meta title is None, just give this factor a score of 0.
        - Provide a score for this factor out of 10.
    * Is the Product type relevant to the product?
        - Provide a score for this factor out of 5.
    * The length of meta title should be between 30 and 60. If length of meta title is 0, just give this factor a score of 0.
        - Provide a score for this factor out of 10.
    * Check the quality of the content in descriptionHtml that is the content relevant to the product and is the description over 300 words?
        - Provide a score for this factor out of 10.
    * Meta description should not be None. If meta description is None, just give this factor a score of 0.
        - Provide a score for this factor out of 10.
    * The length of meta description should be between 120 and 190 characters. If the length of meta description is 0, just give this factor a score of 0.
        - Provide a score for this factor out of 10.
    * Check at least one internal link (<a href>) should be present in the links to another product, collection, or page on the store.
        - Provide a score for this factor out of 5.
    * There should be at least three images. If the image count is less than 3, just give this factor a score of 0.
        - Provide a score for this factor out of 5.
    * Check altText for all the images. If altText is an empty string or null, just give this factor a score of 0.
        - Provide a score for this factor out of 5.
    * Are there at least 2 relevant tags?
        - Provide a score for this factor out of 5.
    * Is the status ACTIVE (i.e., visible to search engines)?
        - Provide a score for this factor out of 5.
    * Are at least 1 custom metafield present?
        - Provide a score for this factor out of 5.
        
    After performing all the checks, add the numbers of checks and compile a Final SEO Score (total max 100).
    
    Return the Final SEO Score along with the results of checks performed in a JSON format like the following example: 
    [
    {{
        "checks":[
            {{"keyword_in_title": <int: score out of 5>}},
            {{"product_name_in_handle": <int: score out of 10>}},
            {{"meta_title_set": <int: score out of 10>}},
            {{"product_type_relevant": <int: score out of 5>}},
            {{"meta_title_length": <int: score out of 10>}},
            {{"content_quality": <int: score out of 10>}},
            {{"meta_description_set": <int: score out of 10>}},
            {{"meta_description_length": <int: score out of 10>}},
            {{"internal_links": <int: score out of 5>}},
            {{"image_count": <int: score out of 5>}},
            {{"alt_text": <int: score out of 5>}},
            {{"relevant_tags": <int: score out of 5>}},
            {{"status_active": <int: score out of 5>}},
            {{"metafields": <int: score out of 5>}}
        ],
        "seo_score": <int: Final SEO Score out of 100>,
        "product_name": "{title}",
        "agent_reasoning": "<string: short paragraph explaining your overall diagnosis and summary of checks>"
    }}
    ]
    """

    try:
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a specialized JSON-outputting Shopify SEO analysis bot. Always output strictly valid JSON content in the requested list structure."
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
        data = json.loads(result_str)
        # Groq with response_format can return the dict direct. Make sure we return a list.
        if isinstance(data, dict):
            # If the model wraps it in a top-level key or outputs a single object instead of array
            if "checks" in data:
                return [data]
            for val in data.values():
                if isinstance(val, list) and len(val) > 0 and "checks" in val[0]:
                    return val
        return data if isinstance(data, list) else [data]
        
    except Exception as e:
        # Fall back gracefully on Groq error
        result = run_heuristic_analysis(product)
        result[0]["agent_reasoning"] = f"Heuristic analysis applied because Groq API call failed: {str(e)}"
        return result
