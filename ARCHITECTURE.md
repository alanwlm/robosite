# System Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                     http://localhost:5173                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ObjectiveHeader │  │   VideoFeed     │  │MessageInterface │ │
│  │                 │  │                 │  │                 │ │
│  │ Display current │  │ Canvas display  │  │ Chat UI         │ │
│  │ task objective  │  │ 30 FPS stream   │  │ Send/receive    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                │                      │           │
│  ┌─────────────────────────────┴──────────────────────┘          │
│  │              SessionContext (React Context)                   │
│  │  • Manages current session                                    │
│  │  • Coordinates recording state                                │
│  └────────────┬────────────────────────┬─────────────────────┐  │
│               │                        │                     │  │
│     ┌─────────▼──────────┐  ┌─────────▼──────────┐  ┌──────▼───┐│
│     │ videoStreamService │  │   apiService       │  │  State  ││
│     │                    │  │                    │  │  Mgmt   ││
│     │ • WebSocket client │  │ • REST API calls   │  │         ││
│     │ • Frame handling   │  │ • Data persistence │  │         ││
│     └─────────┬──────────┘  └─────────┬──────────┘  └─────────┘│
└───────────────┼─────────────────────────┼──────────────────────┘
                │ WebSocket               │ HTTP REST
                │ (Socket.IO)             │
                │                         │
┌───────────────┼─────────────────────────┼──────────────────────┐
│               │                         │                       │
│               │      Backend (Node.js)  │                       │
│               │   http://localhost:3001 │                       │
├───────────────┴─────────────────────────┴──────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Express Server + Socket.IO                   │  │
│  │                                                            │  │
│  │  ┌────────────────┐              ┌────────────────┐      │  │
│  │  │  REST API      │              │  WebSocket     │      │  │
│  │  │  Routes        │              │  Handler       │      │  │
│  │  │                │              │                │      │  │
│  │  │ /api/sessions  │              │ video-frame    │      │  │
│  │  │ /api/messages  │              │ start-recording│      │  │
│  │  │ /api/labels    │              │ stop-recording │      │  │
│  │  │ /api/export    │              │ message-sent   │      │  │
│  │  └────────┬───────┘              └────────┬───────┘      │  │
│  └───────────┼──────────────────────────────┼──────────────┘  │
│              │                              │                  │
│    ┌─────────▼────────────┐     ┌──────────▼─────────────┐   │
│    │ DataCollectionService│     │ VideoStreamService     │   │
│    │                      │     │                        │   │
│    │ • Session management │     │ • WebSocket streaming  │   │
│    │ • Message storage    │     │ • Frame generation     │   │
│    │ • Label management   │     │ • Recording state      │   │
│    │ • Data persistence   │     │ • Frame association    │   │
│    └─────────┬────────────┘     └──────────┬─────────────┘   │
│              │                              │                  │
│              │                    ┌─────────▼─────────────┐   │
│              │                    │  VideoSimulator       │   │
│              │                    │                       │   │
│              │                    │ • Canvas rendering    │   │
│              │                    │ • Robot arm animation │   │
│              │                    │ • Scene composition   │   │
│              │                    │ • 30 FPS generation   │   │
│              │                    └───────────────────────┘   │
│              │                                                 │
└──────────────┼─────────────────────────────────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │   File System         │
    │   server/data/        │
    ├──────────────────────┤
    │                       │
    │ sessions.json         │ ◄── Main database
    │                       │
    │ video_frames/         │ ◄── Frame metadata
    │   {frameId}.json      │
    │                       │
    │ exports/              │ ◄── Exported datasets
    │   {id}_tfrecord.json  │
    │   {id}_huggingface.json│
    │   {id}_data.csv       │
    │   {id}_statistics.json│
    │   dataset_manifest.json│
    └──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │   Export Utilities    │
    ├──────────────────────┤
    │                       │
    │ dataExporter.js       │ ◄── JS export tool
    │ exportData.js (CLI)   │ ◄── Command-line tool
    │ load_dataset.py       │ ◄── Python loader
    └──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │   ML Training         │
    ├──────────────────────┤
    │                       │
    │ TensorFlow            │
    │ PyTorch               │
    │ HuggingFace           │
    │ Pandas/NumPy          │
    └──────────────────────┘
```

## Data Flow

### 1. Session Creation Flow
```
User loads page
    → AppContent.useEffect()
    → SessionContext.createSession()
    → ApiService.createSession() (POST /api/sessions)
    → DataCollectionService.createSession()
    → Store in sessions Map
    → Persist to sessions.json
    → Return session object
    → VideoStreamService.startRecording()
```

### 2. Video Streaming Flow
```
Backend: VideoStreamService starts interval (33ms for 30 FPS)
    → VideoSimulator.generateFrame()
    → Render canvas with robot scene
    → Convert canvas to base64 JPEG
    → Generate frame ID
    → Emit 'video-frame' to all connected clients
    
Frontend: videoStreamService receives 'video-frame'
    → VideoFeed.drawFrame()
    → Create Image from base64
    → Draw to canvas element
    → Display in browser
```

### 3. Message Flow
```
Scientist types command and presses Enter
    → MessageInterface.handleSend()
    → Get current video frameId from videoStreamService
    → ApiService.addMessage() (POST /api/sessions/{id}/messages)
    → DataCollectionService.addMessage()
        → Create message object with frameId
        → Add to session.messages array
        → Persist to sessions.json
    → videoStreamService.sendMessage() (WebSocket)
    → Update local UI
    → Simulate robot response (1 second delay)
    → Repeat flow for robot response
```

### 4. Data Export Flow
```
User runs: npm run export all

exportData.js CLI
    → Load sessions.json
    → DataExporter.exportAll()
    → For each format:
        → exportToTFRecordFormat()
        → exportToHuggingFaceFormat()
        → exportToCSV()
        → exportStatistics()
    → Write files to exports/ directory
    → Create dataset manifest

ML Scientist uses Python:
    → RobotLearningDataset.from_manifest()
    → Load all exported JSON files
    → Convert to desired format:
        → .to_dataframe() for Pandas
        → .to_tensorflow() for TF
        → .to_huggingface() for HF
```

## Component Responsibilities

### Frontend Components

#### VideoFeed.tsx
- Establishes WebSocket connection to backend
- Receives 30 FPS video frames
- Renders frames to HTML5 canvas
- Displays connection status and frame counter

#### MessageInterface.tsx
- Handles user input
- Sends messages to backend API
- Associates messages with current video frame
- Displays conversation history
- Simulates robot responses

#### SessionContext.tsx
- Creates and manages data collection sessions
- Coordinates recording state
- Provides session data to components

### Backend Services

#### DataCollectionService
- CRUD operations for sessions
- Message and label storage
- Video frame metadata storage
- Data persistence to JSON files
- Session lifecycle management

#### VideoStreamService
- WebSocket connection management
- Video frame broadcasting
- Recording state per client
- Frame ID tracking for message association

#### VideoSimulator
- Generates synthetic robot camera feed
- Animates robot arm pick-and-place task
- Renders scene with Canvas API
- 30 FPS frame generation
- Simulates task phases: approaching → grasping → moving → releasing

#### DataExporter
- Exports to TFRecord-compatible JSON
- Exports to HuggingFace datasets format
- Exports to CSV for analysis
- Generates statistics
- Creates dataset manifests

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Socket.IO Client** - WebSocket communication
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.IO** - WebSocket server
- **Canvas** - Server-side image generation
- **UUID** - Unique ID generation

### Data Processing
- **Python 3** - Data loading and analysis
- **Pandas** - Data manipulation
- **TensorFlow** - ML training (optional)
- **HuggingFace Datasets** - Dataset management (optional)

## Key Design Decisions

### 1. WebSocket for Video Streaming
**Why:** Real-time, bidirectional communication with low latency for 30 FPS streaming.

**Alternatives considered:**
- HTTP polling: Too much overhead
- Server-Sent Events: One-way only
- WebRTC: Overkill for simulated feed

### 2. JSON File Storage
**Why:** Simple, human-readable, easy to inspect and export.

**Alternatives considered:**
- SQLite: Added complexity for development
- MongoDB: Requires additional setup
- PostgreSQL: Too heavy for initial prototype

**Production recommendation:** Use PostgreSQL or MongoDB for multi-user production deployment.

### 3. Base64 Encoded Images
**Why:** Easy transmission over WebSocket, works in browser canvas directly.

**Alternatives considered:**
- Binary buffers: More complex client-side handling
- Video streaming protocols: Overkill for frame-by-frame needs

### 4. Simulated Video Feed
**Why:** Enables development and testing without physical robot.

**Real robot integration:** Replace `VideoSimulator` with actual camera feed. The rest of the system remains unchanged.

### 5. Multiple Export Formats
**Why:** Different ML frameworks prefer different formats.

**TFRecord:** TensorFlow ecosystem
**HuggingFace:** Transformers and LLMs
**CSV:** Analysis, debugging, Excel

## Scalability Considerations

### Current Limitations
- Single server (no horizontal scaling)
- File-based storage (not concurrent-safe)
- No user authentication
- In-memory session state

### Production Improvements
1. **Database:** PostgreSQL with TimescaleDB for time-series data
2. **Object Storage:** S3/MinIO for video frames
3. **Load Balancing:** NGINX with multiple backend instances
4. **Message Queue:** Redis/RabbitMQ for async processing
5. **Authentication:** JWT tokens with OAuth2
6. **Monitoring:** Prometheus + Grafana
7. **Video Storage:** Compress and store in cloud storage

## Security Considerations

### Current State (Development Only)
- No authentication
- No authorization
- No input validation
- No rate limiting
- HTTP only (no HTTPS)

### Production Requirements
1. User authentication (JWT)
2. Role-based access control
3. Input sanitization and validation
4. Rate limiting per user/IP
5. HTTPS/WSS encryption
6. CORS configuration
7. API key management
8. Audit logging

## Performance Metrics

### Video Streaming
- **Frame Rate:** 30 FPS
- **Resolution:** 1280x720
- **Encoding:** JPEG (quality 0.8)
- **Frame Size:** ~50 KB average
- **Bandwidth:** ~1.5 MB/s per client

### API Latency
- **Create Session:** < 50ms
- **Add Message:** < 20ms
- **Export Dataset:** < 200ms (small session)

### Storage
- **Session Data:** ~10-50 MB per hour
- **Video Frames:** Metadata only (actual frames not stored by default)

## Future Enhancements

1. **Real-time Labeling UI**
   - Label messages during data collection
   - Keyboard shortcuts for common labels
   - Visual feedback on video

2. **Playback Mode**
   - Review past sessions
   - Scrub through video timeline
   - Edit labels retroactively

3. **Multi-Camera Support**
   - Multiple video feeds simultaneously
   - Synchronized timestamps
   - Camera selection UI

4. **Active Learning**
   - Model uncertainty visualization
   - Suggested samples to label
   - Integration with training pipeline

5. **Collaborative Features**
   - Multiple scientists viewing same feed
   - Shared labeling
   - Comments and annotations

6. **ROS Integration**
   - Direct connection to ROS topics
   - Publish commands to robot
   - Subscribe to sensor data

7. **Model Integration**
   - Real-time model inference
   - Compare model predictions to human labels
   - A/B testing interface

