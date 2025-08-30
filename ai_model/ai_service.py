from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import pandas as pd
try:
    from prophet import Prophet
except ImportError:  # Graceful fallback if prophet not installed yet
    Prophet = None
import uvicorn
from typing import List, Dict, Any

app = FastAPI(title="Inventory AI Service", description="Forecast demand and profit analytics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
