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
    if demand_next_week > avg_demand * 1.1:
        recommendation = "⚡ Restock - Rising demand and healthy margin." if unit_margin > 0 else "⚠️ Rising demand but negative margin — review pricing."
    elif demand_next_week < avg_demand * 0.8:
        recommendation = "📉 Slowdown expected - avoid large restock." if unit_margin > 0 else "🛑 Low demand & negative margin - consider discontinuing."
    else:
        recommendation = "✅ Stable demand - restock normally."

    breakeven_units = None
    if unit_margin > 0:
        breakeven_units = 0  # Already profitable per unit; breakeven concept trivial here

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
        "recommendation": recommendation
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
