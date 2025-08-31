from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import pandas as pd
try:
    from prophet import Prophet
except ImportError:  # Graceful fallback if prophet not installed yet
    Prophet = None
import uvicorn
import os, smtplib
from email.mime.text import MIMEText
from typing import List, Dict, Any, Optional

app = FastAPI(title="Inventory AI Service", description="Forecast demand and profit analytics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health & root endpoints (defined early so always available)
@app.get('/')
def root():
    return {"service": "inventory-ai", "status": "ok"}

@app.get('/health')
def health():
    return {'status': 'ok'}

class SalesPoint(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    units: float = Field(..., ge=0, description="Units sold that day")

class ProductData(BaseModel):
    productId: str
    productName: str
    costPrice: float = Field(..., ge=0)
    sellingPrice: float = Field(..., ge=0)
    salesHistory: List[SalesPoint]  # chronological or unordered list
    stockLevel: Optional[float] = Field(None, ge=0, description="Current on-hand stock level")
    assumedLeadTimeDays: Optional[int] = Field(7, ge=1, le=60, description="Assumed supplier lead time in days")

    @validator("sellingPrice")
    def validate_margin(cls, v, values):
        cost = values.get("costPrice")
        if cost is not None and v < cost:
            raise ValueError("Selling price cannot be less than cost price")
        return v

@app.post("/analyze")
def analyze_product(data: ProductData) -> Dict[str, Any]:
    if len(data.salesHistory) < 5:
        raise HTTPException(status_code=400, detail="Provide at least 5 days of sales history for a meaningful forecast")

    df = pd.DataFrame([s.dict() for s in data.salesHistory])
    if df['units'].max() == 0:
        raise HTTPException(status_code=400, detail="All sales units are zero; cannot build forecast")

    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    if df['date'].isna().any():
        raise HTTPException(status_code=400, detail="Invalid date format detected. Use YYYY-MM-DD")
    df = df.sort_values('date')
    df = df.rename(columns={'date': 'ds', 'units': 'y'})

    total_units = float(df['y'].sum())
    unit_margin = data.sellingPrice - data.costPrice
    profit = unit_margin * total_units

    demand_next_week = None
    forecast_points = []
    model_used = None
    try:
        if Prophet is None:
            raise RuntimeError("prophet not installed")
        model = Prophet()
        model.fit(df)
        future = model.make_future_dataframe(periods=7)
        forecast = model.predict(future)
        next7 = forecast.tail(7)
        demand_next_week = max(0, float(next7['yhat'].mean()))
        forecast_points = next7[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].round(2).to_dict(orient='records')
        model_used = 'prophet'
    except Exception as e:  # Fallback to simple moving average
        recent = df.tail(7)['y']
        demand_next_week = float(recent.mean())
        model_used = f'simple_average_fallback ({e})'
        forecast_points = [
            {"ds": str((df['ds'].max() + pd.Timedelta(days=i+1)).date()), "yhat": demand_next_week}
            for i in range(7)
        ]

    avg_demand = float(df['y'].mean())

    # ---------- Extended analytics ----------
    days_history = len(df)
    recent14 = df.tail(min(14, days_history))
    recent_avg14 = float(recent14['y'].mean()) if len(recent14) else avg_demand
    # Trend via simple linear regression (index vs y)
    import math
    idx = list(range(len(df)))
    n = len(idx)
    mean_x = sum(idx)/n
    mean_y = float(df['y'].mean())
    cov = sum((x-mean_x)*(y-mean_y) for x, y in zip(idx, df['y']))
    var_x = sum((x-mean_x)**2 for x in idx) or 1
    slope = cov/var_x  # units per day
    # Volatility (coefficient of variation)
    std = float(df['y'].std()) if n > 1 else 0.0
    volatility = (std/mean_y) if mean_y else 0.0
    # Weekend lift
    df['dow'] = df['ds'].dt.dayofweek
    weekend_avg = float(df[df['dow'] >= 5]['y'].mean()) if any(df['dow']>=5) else 0
    weekday_avg = float(df[df['dow'] < 5]['y'].mean()) if any(df['dow']<5) else 0
    weekend_lift = (weekend_avg/weekday_avg) if weekday_avg else 0
    # Pattern detection
    pattern = 'stable'
    slope_threshold = max(0.05, 0.05 * avg_demand)  # adaptive minimal change
    if slope > slope_threshold:
        pattern = 'growth'
    elif slope < -slope_threshold:
        pattern = 'decline'
    elif volatility > 0.9:
        pattern = 'spiky'
    elif weekend_lift > 1.4:
        pattern = 'weekend_peaks'
    # Seasonal quick heuristic (7-day periodic variance) – compare first and last quarter mean
    # (kept simple to avoid heavy libs)
    quarter = max(2, n//4)
    if pattern == 'stable' and quarter*2 <= n:
        early = float(df['y'].head(quarter).mean())
        late = float(df['y'].tail(quarter).mean())
        diff_ratio = abs(late-early)/avg_demand if avg_demand else 0
        if diff_ratio > 0.4 and abs(slope) < slope_threshold:
            pattern = 'seasonal_shift'

    margin_percent = (unit_margin / data.sellingPrice * 100) if data.sellingPrice else 0
    margin_category = 'high' if margin_percent >= 40 else 'medium' if margin_percent >= 20 else 'low'

    # Inventory metrics
    stock_level = data.stockLevel if data.stockLevel is not None else None
    lead_time = data.assumedLeadTimeDays or 7
    avg_daily_demand = recent_avg14 if recent_avg14 > 0 else avg_demand
    std_daily = std or 0
    safety_stock = 0
    reorder_point = None
    days_inventory_remaining = None
    suggested_order_qty = None
    if stock_level is not None and avg_daily_demand > 0:
        # Safety stock using 95% service level approx Z=1.65
        safety_stock = round(1.65 * std_daily * math.sqrt(lead_time), 2)
        reorder_point = round(avg_daily_demand * lead_time + safety_stock, 2)
        days_inventory_remaining = round(stock_level / avg_daily_demand, 2)
        target_days = 30
        suggested_order_qty = max(0, math.ceil(target_days * avg_daily_demand - stock_level))

    # Demand forecast vs history decision logic
    growth_ratio = (demand_next_week / avg_demand) if avg_demand else 1
    if growth_ratio > 1.15 and unit_margin > 0:
        base_rec = 'Rising demand – accelerate restock'
        action = 'RESTOCK_NOW'
    elif pattern == 'decline' and margin_category == 'low':
        base_rec = 'Declining demand & low margin – consider discontinuation or price increase'
        action = 'REVIEW_OR_DISCONTINUE'
    elif pattern == 'decline':
        base_rec = 'Demand declining – reduce order size'
        action = 'REDUCE_ORDERS'
    elif pattern in ('spiky','weekend_peaks'):
        base_rec = 'Irregular demand – keep buffer stock'
        action = 'MAINTAIN_BUFFER'
    elif margin_category == 'high' and pattern == 'growth':
        base_rec = 'High margin growth product – prioritize restock'
        action = 'PRIORITIZE'
    else:
        base_rec = 'Stable demand – standard replenishment'
        action = 'STANDARD'

    # Risk score (0 best, 100 worst)
    risk = 0
    if pattern == 'decline': risk += 30
    if volatility > 0.9: risk += 15
    if margin_category == 'low': risk += 25
    if stock_level is not None and days_inventory_remaining is not None and days_inventory_remaining < lead_time:
        risk += 30
    risk = min(100, risk)

    # Combine into recommendation string
    inventory_aspect = ''
    if stock_level is not None and reorder_point is not None:
        if stock_level < reorder_point:
            inventory_aspect = f" Current stock ({stock_level}) below reorder point ({reorder_point})."
        else:
            inventory_aspect = f" Stock healthy (≥ reorder point {reorder_point})."
    recommendation = f"{base_rec}.{inventory_aspect} Margin {margin_percent:.1f}% ({margin_category}). Pattern: {pattern}."

    breakeven_units = None
    if unit_margin > 0:
        breakeven_units = 0  # trivial here

    return {
        "productId": data.productId,
        "productName": data.productName,
        "unitMargin": round(unit_margin, 2),
        "totalUnits": total_units,
        "estimatedProfit": round(profit, 2),
        "forecastAvgNext7": round(demand_next_week, 2),
        "avgHistoricalDemand": round(avg_demand, 2),
        "forecastPoints": forecast_points,
        "modelUsed": model_used,
        "breakevenUnits": breakeven_units,
        "recommendation": recommendation,
        "analytics": {
            "daysHistory": days_history,
            "recentAvg14": round(recent_avg14, 2),
            "trendSlope": round(slope, 4),
            "volatility": round(volatility, 3),
            "pattern": pattern,
            "weekendLift": round(weekend_lift, 2),
            "marginPercent": round(margin_percent, 2),
            "marginCategory": margin_category,
            "riskScore": risk,
            "stockLevel": stock_level,
            "daysInventoryRemaining": days_inventory_remaining,
            "safetyStock": safety_stock,
            "reorderPoint": reorder_point,
            "suggestedOrderQty": suggested_order_qty,
            "leadTimeDays": lead_time,
            "action": action
        }
    }

class LowStockAlert(BaseModel):
    productId: str
    productName: str
    stockLevel: int
    threshold: int
    toEmail: Optional[str] = None

def _send_email(subject: str, body: str, override_to: Optional[str] = None):
    host = os.getenv('SMTP_HOST')
    user = os.getenv('SMTP_USER')
    pwd = os.getenv('SMTP_PASS')
    to_addr = override_to or os.getenv('ALERT_EMAIL_TO')
    port = int(os.getenv('SMTP_PORT', '587'))
    use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() != 'false'
    if not all([host, user, pwd, to_addr]):
        raise HTTPException(status_code=500, detail="Email not configured on server")
    print(f"[EMAIL] Sending via host={host} port={port} user={user} to={to_addr} tls={use_tls}")
    msg = MIMEText(body, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = user
    msg['To'] = to_addr
    try:
        with smtplib.SMTP(host, port, timeout=15) as s:
            if use_tls:
                s.starttls()
            s.login(user, pwd)
            s.sendmail(user, [to_addr], msg.as_string())
        print("[EMAIL] Sent successfully")
    except Exception as e:
        print(f"[EMAIL] Failed: {e}")
        raise HTTPException(status_code=500, detail=f"Email send failed: {e}")

@app.post('/low_stock_alert')
def low_stock_alert(alert: LowStockAlert, background: BackgroundTasks):
    subject = f"LOW STOCK: {alert.productName} ({alert.stockLevel} <= {alert.threshold})"
    body = ("Low Stock Alert\n" 
            f"Product: {alert.productName} (ID: {alert.productId})\n"
            f"Current Stock: {alert.stockLevel}\nThreshold: {alert.threshold}\n" 
            "Time to review and restock if necessary.")
    background.add_task(_send_email, subject, body, alert.toEmail)
    return {"status": "queued", "to": alert.toEmail or os.getenv('ALERT_EMAIL_TO')}

# Hyphen alias to avoid 404 if frontend uses - instead of _
@app.post('/low-stock-alert')
def low_stock_alert_alias(alert: LowStockAlert, background: BackgroundTasks):
    return low_stock_alert(alert, background)

@app.get('/email_status')
def email_status():
    cfg = {k: os.getenv(k) for k in ['SMTP_HOST','SMTP_PORT','SMTP_USER','ALERT_EMAIL_TO','SMTP_USE_TLS']}
    configured = all([cfg.get('SMTP_HOST'), cfg.get('SMTP_USER'), os.getenv('SMTP_PASS'), cfg.get('ALERT_EMAIL_TO')])
    if not configured:
        missing = [k for k in ['SMTP_HOST','SMTP_USER','SMTP_PASS','ALERT_EMAIL_TO'] if not os.getenv(k)]
    else:
        missing = []
    return {"configured": configured, "missing": missing, "config": cfg}

@app.post('/test_email')
def test_email(background: BackgroundTasks):
    subject = "Inventory System Test Email"
    body = "This is a test email from the Inventory AI service to confirm SMTP settings."
    background.add_task(_send_email, subject, body)
    return {"status": "queued"}

if __name__ == "__main__":
    print("Starting Inventory AI Service on 0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
