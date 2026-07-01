import logging
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from backend.app.config import GROQ_API_KEY, SHOPIFY_SHOP_URL, SHOPIFY_ACCESS_TOKEN
from backend.app.agents.seo_analyzer import analyze_product_seo
from backend.app.agents.seo_optimizer import optimize_product_seo

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

# In-memory mock product store to simulate updates when Shopify is not connected
MOCK_PRODUCTS = [
    {
        "id": 8812739182,
        "title": "Minimalist Wall Clock",
        "body_html": "<p>Nice clock. Tells time. Uses batteries. Black color.</p>",
        "tags": "clock, wall",
        "handle": "minimalist-wall-clock",
        "images": [
            {
                "id": 101,
                "src": "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=500&auto=format&fit=crop&q=60",
                "alt": ""
            }
        ]
    },
    {
        "id": 8812739183,
        "title": "Leather Hiking Boots Waterproof Outdoor Shoes for Men and Women Trekking Trail",
        "body_html": "<p>Get these boots. They are waterproof. Good for walking. You can buy them now.</p>",
        "tags": "",
        "handle": "leather-hiking-boots-waterproof",
        "images": [
            {
                "id": 201,
                "src": "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=500&auto=format&fit=crop&q=60",
                "alt": ""
            },
            {
                "id": 202,
                "src": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60",
                "alt": ""
            }
        ]
    },
    {
        "id": 8812739184,
        "title": "Yoga Mat",
        "body_html": "<p>Yoga Mat for exercise. Made of rubber. Good yoga mat.</p>",
        "tags": "yoga, fitness, mat",
        "handle": "yoga-mat",
        "images": [
            {
                "id": 301,
                "src": "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=500&auto=format&fit=crop&q=60",
                "alt": "Yoga Mat"  # Duplicate of title
            }
        ]
    }
]

# Keep track of audit reports and optimization recommendations in memory
AUDIT_REPORTS = {}
OPTIMIZED_DATA = {}

class ConnectionDetails(BaseModel):
    shop_url: str
    access_token: str

class SyncPayload(BaseModel):
    title: str
    description: str
    tags: str
    images: List[Dict]

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

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Shopify SEO Backend is running."}

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
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Shopify verification failed: {response.text}"
                )
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Unable to connect to Shopify: {str(e)}"
        )

@app.get("/api/products")
async def get_products(
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """
    Fetches products.
    If Shopify headers are provided, pulls live products.
    Otherwise, returns the in-memory mock products.
    """
    if shopify_shop_url and shopify_access_token:
        shop_url = clean_shop_url(shopify_shop_url)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://{shop_url}/admin/api/2024-04/products.json?limit=20",
                    headers=get_shopify_headers(shopify_access_token),
                    timeout=10.0
                )
                if response.status_code == 200:
                    products = response.json().get("products", [])
                    return {"mode": "live", "products": products}
                else:
                    logger.error(f"Shopify API error: {response.text}")
                    # Return mock data as fallback
        except Exception as e:
            logger.error(f"Failed to query Shopify API, falling back to mock: {e}")
            
    # Mock fallback
    return {"mode": "mock", "products": MOCK_PRODUCTS}

@app.get("/api/products/{product_id}")
async def get_product_detail(
    product_id: int,
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Fetches a specific product's details."""
    if shopify_shop_url and shopify_access_token:
        shop_url = clean_shop_url(shopify_shop_url)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://{shop_url}/admin/api/2024-04/products/{product_id}.json",
                    headers=get_shopify_headers(shopify_access_token),
                    timeout=10.0
                )
                if response.status_code == 200:
                    return response.json().get("product")
        except Exception as e:
            logger.error(f"Failed to fetch Shopify product {product_id}: {e}")

    # Fallback/Mock find
    for p in MOCK_PRODUCTS:
        if p["id"] == product_id:
            return p
            
    raise HTTPException(status_code=404, detail="Product not found")

@app.post("/api/products/{product_id}/analyze")
async def analyze_product(
    product_id: int,
    groq_api_key: Optional[str] = Header(None),
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Runs the SEO Analyzer Agent on a product."""
    product = await get_product_detail(product_id, shopify_shop_url, shopify_access_token)
    
    # Run agent analysis
    audit_report = analyze_product_seo(product, groq_api_key)
    AUDIT_REPORTS[product_id] = audit_report
    
    return audit_report

@app.post("/api/products/{product_id}/optimize")
async def optimize_product(
    product_id: int,
    groq_api_key: Optional[str] = Header(None),
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Runs the SEO Optimizer Agent on a product based on its audit findings."""
    product = await get_product_detail(product_id, shopify_shop_url, shopify_access_token)
    
    # Get audit report or run analysis on the fly
    audit_report = AUDIT_REPORTS.get(product_id)
    if not audit_report:
        audit_report = analyze_product_seo(product, groq_api_key)
        AUDIT_REPORTS[product_id] = audit_report
        
    # Run optimizer agent
    optimized_data = optimize_product_seo(product, audit_report, groq_api_key)
    OPTIMIZED_DATA[product_id] = optimized_data
    
    return optimized_data

@app.post("/api/products/{product_id}/sync")
async def sync_optimized_product(
    product_id: int,
    payload: SyncPayload,
    shopify_shop_url: Optional[str] = Header(None),
    shopify_access_token: Optional[str] = Header(None)
):
    """Syncs optimized title, description, tags, and image alt text to Shopify."""
    if shopify_shop_url and shopify_access_token:
        shop_url = clean_shop_url(shopify_shop_url)
        headers = get_shopify_headers(shopify_access_token)
        try:
            async with httpx.AsyncClient() as client:
                # 1. Update title, description (body_html), and tags
                update_body = {
                    "product": {
                        "id": product_id,
                        "title": payload.title,
                        "body_html": payload.description,
                        "tags": payload.tags
                    }
                }
                prod_response = await client.put(
                    f"https://{shop_url}/admin/api/2024-04/products/{product_id}.json",
                    headers=headers,
                    json=update_body,
                    timeout=10.0
                )
                
                if prod_response.status_code != 200:
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
                        await client.put(
                            f"https://{shop_url}/admin/api/2024-04/products/{product_id}/images/{img_id}.json",
                            headers=headers,
                            json=img_body,
                            timeout=10.0
                        )
                        
                return {"success": True, "message": "Product synced to Shopify store."}
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed syncing to Shopify: {str(e)}"
            )

    # Local Mock Updates (Simulates updating in-memory)
    for p in MOCK_PRODUCTS:
        if p["id"] == product_id:
            p["title"] = payload.title
            p["body_html"] = payload.description
            p["tags"] = payload.tags
            # Map optimized image alts
            for local_img in p["images"]:
                for payload_img in payload.images:
                    if local_img["id"] == payload_img.get("id"):
                        local_img["alt"] = payload_img.get("alt", "")
            
            # Clear stored records to force re-evaluation on next load
            if product_id in AUDIT_REPORTS:
                del AUDIT_REPORTS[product_id]
            if product_id in OPTIMIZED_DATA:
                del OPTIMIZED_DATA[product_id]

            return {
                "success": True, 
                "message": "Product details updated locally in Mock memory. Ready to analyze again!"
            }

    raise HTTPException(status_code=404, detail="Product not found in Mock catalog")
