from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import time

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    is_active: bool = True

class SessionCreate(BaseModel):
    pass

class TrackingEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    event_type: str  # scroll, click, mousemove, idle, visibility, tab_count
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data: dict = {}

class TrackingEventCreate(BaseModel):
    session_id: str
    event_type: str
    data: dict = {}

class DriftAnalysis(BaseModel):
    is_drifting: bool
    confidence: float
    drift_score: float
    factors: dict
    recommendation: str

class SessionStats(BaseModel):
    session_id: str
    active_time: float
    scroll_count: int
    click_count: int
    mouse_movements: int
    idle_time: float
    tab_switches: int
    drift_detected: bool
    drift_score: float

# Drift Detection Algorithm
class DriftDetector:
    """Rule-based drift detection simulating LSTM behavior"""
    
    @staticmethod
    async def analyze_session(session_id: str, db_instance) -> DriftAnalysis:
        # Get recent events (last 60 seconds)
        cutoff_time = datetime.now(timezone.utc)
        events = await db_instance.tracking_events.find({
            "session_id": session_id,
        }).sort("timestamp", -1).limit(100).to_list(100)
        
        if not events:
            return DriftAnalysis(
                is_drifting=False,
                confidence=0.0,
                drift_score=0.0,
                factors={},
                recommendation="Keep going! Start tracking your activity."
            )
        
        # Calculate metrics
        scroll_count = sum(1 for e in events if e.get('event_type') == 'scroll')
        click_count = sum(1 for e in events if e.get('event_type') == 'click')
        mouse_movements = sum(1 for e in events if e.get('event_type') == 'mousemove')
        idle_events = sum(1 for e in events if e.get('event_type') == 'idle')
        tab_switches = sum(1 for e in events if e.get('event_type') == 'tab_count' and e.get('data', {}).get('count', 1) > 3)
        
        # Drift scoring (0-100)
        drift_score = 0.0
        factors = {}
        
        # High scroll activity without clicks (mindless scrolling)
        if scroll_count > 20 and click_count < 3:
            drift_score += 25
            factors['excessive_scrolling'] = True
        
        # Low interaction (idle)
        if idle_events > 3:
            drift_score += 30
            factors['idle_behavior'] = True
        
        # Too many tabs open (distraction)
        if tab_switches > 2:
            drift_score += 20
            factors['multiple_tabs'] = True
        
        # Erratic mouse movements
        if mouse_movements > 50 and click_count < 5:
            drift_score += 15
            factors['erratic_movement'] = True
        
        # Low activity overall
        total_activity = scroll_count + click_count + mouse_movements
        if total_activity < 10:
            drift_score += 10
            factors['low_activity'] = True
        
        is_drifting = drift_score > 40
        confidence = min(drift_score / 100.0, 0.95)
        
        # Generate recommendation
        if is_drifting:
            if factors.get('idle_behavior'):
                recommendation = "Take a short break or switch tasks to re-engage."
            elif factors.get('excessive_scrolling'):
                recommendation = "Focus on reading content instead of scrolling."
            elif factors.get('multiple_tabs'):
                recommendation = "Close unnecessary tabs to reduce distractions."
            else:
                recommendation = "Refocus on your current task."
        else:
            recommendation = "Great focus! Keep up the good work."
        
        return DriftAnalysis(
            is_drifting=is_drifting,
            confidence=confidence,
            drift_score=drift_score,
            factors=factors,
            recommendation=recommendation
        )

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Focus Drift Detection API", "status": "active"}

@api_router.post("/session/start", response_model=Session)
async def start_session(input: SessionCreate):
    """Start a new tracking session"""
    session = Session()
    doc = session.model_dump()
    doc['start_time'] = doc['start_time'].isoformat()
    if doc['end_time']:
        doc['end_time'] = doc['end_time'].isoformat()
    
    await db.sessions.insert_one(doc)
    return session

@api_router.post("/tracking/event")
async def log_tracking_event(input: TrackingEventCreate):
    """Log a tracking event"""
    event = TrackingEvent(**input.model_dump())
    doc = event.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.tracking_events.insert_one(doc)
    return {"status": "logged", "event_id": event.id}

@api_router.get("/tracking/analysis/{session_id}", response_model=DriftAnalysis)
async def get_drift_analysis(session_id: str):
    """Get real-time drift analysis for a session"""
    analysis = await DriftDetector.analyze_session(session_id, db)
    return analysis

@api_router.get("/session/{session_id}/stats", response_model=SessionStats)
async def get_session_stats(session_id: str):
    """Get statistics for a session"""
    # Get all events for the session
    events = await db.tracking_events.find({"session_id": session_id}).to_list(1000)
    
    if not events:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Calculate stats
    scroll_count = sum(1 for e in events if e.get('event_type') == 'scroll')
    click_count = sum(1 for e in events if e.get('event_type') == 'click')
    mouse_movements = sum(1 for e in events if e.get('event_type') == 'mousemove')
    idle_events = sum(1 for e in events if e.get('event_type') == 'idle')
    
    # Get session
    session_doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")
    
    start_time = datetime.fromisoformat(session_doc['start_time'])
    active_time = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    # Get drift analysis
    analysis = await DriftDetector.analyze_session(session_id, db)
    
    return SessionStats(
        session_id=session_id,
        active_time=active_time,
        scroll_count=scroll_count,
        click_count=click_count,
        mouse_movements=mouse_movements,
        idle_time=idle_events * 5.0,  # Assuming 5s idle check
        tab_switches=0,
        drift_detected=analysis.is_drifting,
        drift_score=analysis.drift_score
    )

@api_router.delete("/session/{session_id}")
async def end_session(session_id: str):
    """End a tracking session"""
    result = await db.sessions.update_one(
        {"id": session_id},
        {"$set": {
            "is_active": False,
            "end_time": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"status": "session_ended", "session_id": session_id}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()