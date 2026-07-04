import logging
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from backend.app.config import GROQ_API_KEY
from backend.app.agents.seo_analyzer import analyze_product_seo
from backend.app.agents.seo_optimizer import optimize_product_seo
from backend.app.agents.seo_blog_writer import generate_blog_article

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Shopify SEO Expert Agent System API")

# Enable CORS for the frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
import json

DB_FILE = os.path.join(os.path.dirname(__file__), "db.json")

def load_db() -> tuple[dict, dict, dict]:
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Convert string keys back to int for product_id
                audits = {int(k): v for k, v in data.get("audits", {}).items()}
                opts = {int(k): v for k, v in data.get("optimizations", {}).items()}
                blogs = {int(k): v for k, v in data.get("blogs", {}).items()}
                return audits, opts, blogs
        except Exception as e:
            logger.error(f"Error loading database: {str(e)}")
    return {}, {}, {}

def save_db(audits: dict, opts: dict, blogs: dict = None):
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "audits": {str(k): v for k, v in audits.items()},
                "optimizations": {str(k): v for k, v in opts.items()},
                "blogs": {str(k): v for k, v in (blogs or {}).items()}
            }, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error saving database: {str(e)}")

# Keep track of audit reports, optimizations, and blog posts
AUDIT_REPORTS, OPTIMIZED_DATA, BLOG_POSTS = load_db()

class ConnectionDetails(BaseModel):
    shop_url: str
    access_token: str

class SyncPayload(BaseModel):
    title: str
    description: str
    tags: str
    images: List[Dict]
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    product_type: Optional[str] = None

class BlogPayload(BaseModel):
    tone: str
    length: str
    include_cta: bool
    target_keyword: Optional[str] = None

class CreateBlogPayload(BaseModel):
    title: str

class ArticlePayload(BaseModel):
    title: str
    author: Optional[str] = None
    tags: Optional[str] = None
    body_html: str
    published: bool = True
    image_url: Optional[str] = None

def get_shopify_headers(access_token: str) -> dict:
    return {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json"
    }

def clean_shop_url(url: str) -> str:
    # Ensure it starts with https:// and ends with .myshopify.com
    url = url.strip().replace("http://", "").replace("https://", "")
    if not url.endswith(".myshopify.com"):
        url = f"{url}.myshopify.com"
    return url

def check_credentials(shopify_shop_url: Optional[str], shopify_access_token: Optional[str]) -> tuple[str, str]:
    if not shopify_shop_url or not shopify_access_token:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Shopify Store URL and Admin API Access Token are required. Please log in first."
        )
    return clean_shop_url(shopify_shop_url), shopify_access_token

async def get_product_metafields(product_id: int, shop_url: str, access_token: str) -> list:
    """Fetches product metafields from Shopify API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{shop_url}/admin/api/2024-04/products/{product_id}/metafields.json",
                headers=get_shopify_headers(access_token),
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json().get("metafields", [])
            else:
                logger.warning(f"Failed to fetch metafields for product {product_id}: {response.text}")
                return []
    except Exception as e:
        logger.warning(f"Exception fetching metafields for product {product_id}: {str(e)}")
        return []

@app.get("/api/health")
def health_check():
    # Show if Groq API Key is configured on the backend
    return {
        "status": "ok", 
        "message": "Shopify SEO Backend is running.",
        "groq_configured": bool(GROQ_API_KEY)
    }

@app.post("/api/connect")
async def verify_shopify_connection(details: ConnectionDetails):
    """Verifies connection to Shopify API by hitting the shop.json endpoint."""
    shop_url = clean_shop_url(details.shop_url)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{shop_url}/admin/api/2024-04/shop.json",
                headers=get_shopify_headers(details.access_token),
                timeout=10.0
            )
            if response.status_code == 200:
                shop_data = response.json().get("shop", {})
                return {
                    "success": True,
                    "message": "Connected to Shopify store successfully.",
                    "shop_name": shop_data.get("name"),
                    "domain": shop_data.get("domain")
                }
            else:
                logger.error(f"Shopify connect response: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Shopify verification failed. Status code: {response.status_code}. Response: {response.text}"
                )
    except Exception as e:
        logger.error(f"Unable to connect to Shopify: {str(e)}")
        raise HTTPException(
            status_code=400, 
            detail=f"Unable to connect to Shopify: {str(e)}"
        )

@app.get("/api/products")
async def get_products(
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Fetches list of products from Shopify."""
    shop_url, access_token = check_credentials(shopify_shop_url, shopify_access_token)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{shop_url}/admin/api/2024-04/products.json?limit=50",
                headers=get_shopify_headers(access_token),
                timeout=15.0
            )
            if response.status_code == 200:
                products = response.json().get("products", [])
                return {"mode": "live", "products": products}
            else:
                logger.error(f"Shopify API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Shopify API error: {response.text}"
                )
    except httpx.RequestError as exc:
        logger.error(f"HTTP Request failed: {exc}")
        raise HTTPException(status_code=503, detail=f"Failed to communicate with Shopify: {str(exc)}")

@app.get("/api/products/{product_id}")
async def get_product_detail(
    product_id: int,
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Fetches a specific product's details from Shopify."""
    shop_url, access_token = check_credentials(shopify_shop_url, shopify_access_token)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{shop_url}/admin/api/2024-04/products/{product_id}.json",
                headers=get_shopify_headers(access_token),
                timeout=10.0
            )
            if response.status_code == 200:
                product = response.json().get("product", {})
                # Fetch metafields and attach them to the product
                metafields = await get_product_metafields(product_id, shop_url, access_token)
                product["metafields_list"] = metafields
                return product
            else:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Failed to find product: {response.text}"
                )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Failed to connect to Shopify: {str(exc)}")

@app.post("/api/products/{product_id}/analyze")
async def analyze_product(
    product_id: int,
    target_keyword: Optional[str] = None,
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Runs the SEO Analyzer Agent on a product."""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Backend Configuration Error: GROQ_API_KEY is not defined in the backend environment variables."
        )

    product = await get_product_detail(product_id, shopify_shop_url, shopify_access_token)
    
    # Run agent analysis (uses config-based GROQ_API_KEY)
    audit_report = analyze_product_seo(product, GROQ_API_KEY, target_keyword)
    AUDIT_REPORTS[product_id] = audit_report
    save_db(AUDIT_REPORTS, OPTIMIZED_DATA, BLOG_POSTS)
    
    return audit_report

@app.post("/api/products/{product_id}/optimize")
async def optimize_product(
    product_id: int,
    target_keyword: Optional[str] = None,
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Runs the SEO Optimizer Agent on a product based on its audit findings."""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Backend Configuration Error: GROQ_API_KEY is not defined in the backend environment variables."
        )

    product = await get_product_detail(product_id, shopify_shop_url, shopify_access_token)
    
    # Get audit report or run analysis on the fly
    audit_report = AUDIT_REPORTS.get(product_id)
    if not audit_report:
        audit_report = analyze_product_seo(product, GROQ_API_KEY, target_keyword)
        AUDIT_REPORTS[product_id] = audit_report
        
    # Run optimizer agent
    audit_report_dict = audit_report[0] if isinstance(audit_report, list) and len(audit_report) > 0 else audit_report
    optimized_data = optimize_product_seo(product, audit_report_dict, GROQ_API_KEY, target_keyword)
    OPTIMIZED_DATA[product_id] = optimized_data
    save_db(AUDIT_REPORTS, OPTIMIZED_DATA, BLOG_POSTS)
    
    return optimized_data

@app.post("/api/products/{product_id}/sync")
async def sync_optimized_product(
    product_id: int,
    payload: SyncPayload,
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Syncs optimized title, description, tags, and image alt text to Shopify."""
    shop_url, access_token = check_credentials(shopify_shop_url, shopify_access_token)
    headers = get_shopify_headers(access_token)
    
    try:
        async with httpx.AsyncClient() as client:
            # 1. Update title, description (body_html), tags, product_type, and meta fields
            update_body = {
                "product": {
                    "id": product_id,
                    "title": payload.title,
                    "body_html": payload.description,
                    "tags": payload.tags
                }
            }
            if payload.product_type is not None:
                update_body["product"]["product_type"] = payload.product_type

            metafields = []
            if payload.meta_title:
                metafields.append({
                    "namespace": "global",
                    "key": "title_tag",
                    "value": payload.meta_title,
                    "type": "single_line_text_field"
                })
            if payload.meta_description:
                metafields.append({
                    "namespace": "global",
                    "key": "description_tag",
                    "value": payload.meta_description,
                    "type": "multi_line_text_field"
                })
            if metafields:
                update_body["product"]["metafields"] = metafields
            prod_response = await client.put(
                f"https://{shop_url}/admin/api/2024-04/products/{product_id}.json",
                headers=headers,
                json=update_body,
                timeout=12.0
            )
            
            if prod_response.status_code != 200:
                logger.error(f"Shopify product update error: {prod_response.text}")
                raise HTTPException(
                    status_code=prod_response.status_code,
                    detail=f"Failed to update product details on Shopify: {prod_response.text}"
                )
            
            # 2. Update Image Alt Texts (if images have valid ids)
            for img in payload.images:
                img_id = img.get("id")
                alt_text = img.get("alt")
                if img_id and alt_text:
                    img_body = {
                        "image": {
                            "id": img_id,
                            "alt": alt_text
                        }
                    }
                    img_response = await client.put(
                        f"https://{shop_url}/admin/api/2024-04/products/{product_id}/images/{img_id}.json",
                        headers=headers,
                        json=img_body,
                        timeout=12.0
                    )
                    if img_response.status_code != 200:
                        logger.warning(f"Failed to update alt text for image {img_id}: {img_response.text}")
                    
            # Re-evaluate the product SEO score automatically after sync
            new_audit = None
            try:
                updated_product = await get_product_detail(product_id, shop_url, access_token)
                new_audit = analyze_product_seo(updated_product, GROQ_API_KEY)
                AUDIT_REPORTS[product_id] = new_audit
            except Exception as audit_err:
                logger.warning(f"Failed to auto-re-evaluate product {product_id} after sync: {str(audit_err)}")
                if product_id in AUDIT_REPORTS:
                    del AUDIT_REPORTS[product_id]

            if product_id in OPTIMIZED_DATA:
                del OPTIMIZED_DATA[product_id]
            save_db(AUDIT_REPORTS, OPTIMIZED_DATA, BLOG_POSTS)

            return {
                "success": True, 
                "message": "Product synced to Shopify store successfully.",
                "new_audit": new_audit
            }
            
    except Exception as e:
        logger.error(f"Failed syncing to Shopify: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed syncing to Shopify: {str(e)}"
        )

@app.get("/api/cache")
def get_cached_reports():
    return {
        "scores": {str(k): v for k, v in AUDIT_REPORTS.items()},
        "optimizations": {str(k): v for k, v in OPTIMIZED_DATA.items()},
        "blogs": {str(k): v for k, v in BLOG_POSTS.items()}
    }

@app.get("/api/blogs")
async def get_blogs(
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Fetches list of blogs from Shopify Online Store."""
    shop_url, access_token = check_credentials(shopify_shop_url, shopify_access_token)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{shop_url}/admin/api/2024-04/blogs.json",
                headers=get_shopify_headers(access_token),
                timeout=12.0
            )
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Shopify Blogs fetch error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Shopify Blogs API error: {response.text}"
                )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Failed to reach Shopify: {str(exc)}")

@app.post("/api/blogs")
async def create_blog(
    payload: CreateBlogPayload,
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Creates a new blog category on Shopify Store."""
    shop_url, access_token = check_credentials(shopify_shop_url, shopify_access_token)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://{shop_url}/admin/api/2024-04/blogs.json",
                headers=get_shopify_headers(access_token),
                json={"blog": {"title": payload.title}},
                timeout=12.0
            )
            if response.status_code == 201:
                return response.json()
            else:
                logger.error(f"Shopify Blog creation error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Shopify Blog creation API error: {response.text}"
                )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Failed to reach Shopify: {str(exc)}")

@app.post("/api/products/{product_id}/write-blog")
async def write_product_blog(
    product_id: int,
    payload: BlogPayload,
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Runs the SEO Copywriter Agent to generate a blog post draft about the product."""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Backend Configuration Error: GROQ_API_KEY is not defined in the backend environment variables."
        )
    
    product = await get_product_detail(product_id, shopify_shop_url, shopify_access_token)
    blog_data = generate_blog_article(
        product=product,
        tone=payload.tone,
        length=payload.length,
        include_cta=payload.include_cta,
        target_keyword=payload.target_keyword,
        user_api_key=GROQ_API_KEY
    )
    
    BLOG_POSTS[product_id] = blog_data
    save_db(AUDIT_REPORTS, OPTIMIZED_DATA, BLOG_POSTS)
    
    return blog_data

@app.post("/api/blogs/{blog_id}/articles")
async def publish_blog_article(
    blog_id: int,
    payload: ArticlePayload,
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Publishes a customized article to Shopify under a specific blog category."""
    shop_url, access_token = check_credentials(shopify_shop_url, shopify_access_token)
    
    article_body = {
        "article": {
            "title": payload.title,
            "body_html": payload.body_html,
            "published": payload.published
        }
    }
    
    if payload.author:
        article_body["article"]["author"] = payload.author
    if payload.tags:
        article_body["article"]["tags"] = payload.tags
    if payload.image_url:
        article_body["article"]["image"] = {"src": payload.image_url}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://{shop_url}/admin/api/2024-04/blogs/{blog_id}/articles.json",
                headers=get_shopify_headers(access_token),
                json=article_body,
                timeout=15.0
            )
            if response.status_code == 201:
                return {
                    "success": True,
                    "message": "Blog post published to Shopify store successfully.",
                    "article": response.json().get("article", {})
                }
            else:
                logger.error(f"Shopify Article publish error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Shopify Article API error: {response.text}"
                )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Failed to reach Shopify: {str(exc)}")
