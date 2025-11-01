# Robot Learning Data Collection System - Implementation Guide

## Overview

This system enables robot learning scientists to collect labeled interaction data through a web interface. It includes:

- **Real-time video streaming** from a simulated robot camera
- **Text-based interaction** between scientists and robots
- **Automatic data collection** with video frame associations
- **Data labeling** capabilities
- **Multiple export formats** for ML training (TFRecord, HuggingFace, CSV)

## Architecture

### Frontend (React + TypeScript + Vite)
- **VideoFeed**: Displays real-time video stream via WebSocket
- **MessageInterface**: Chat interface for robot commands
- **SessionContext**: Manages data collection sessions
- **Services**:
  - `apiService.ts`: REST API communication
  - `videoStreamService.ts`: WebSocket video streaming

### Backend (Node.js + Express + Socket.IO)
- **REST API**: Session, message, and label management
- **WebSocket Server**: Real-time video streaming
- **Services**:
  - `dataCollection.js`: Stores and manages interaction data
  - `videoStream.js`: Simulates and streams robot camera feed
- **Utilities**:
  - `dataExporter.js`: Exports data in multiple ML-ready formats

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd server
npm install
```

### 2. Install Frontend Dependencies

```bash
cd ..
npm install
```

### 3. Start the Backend Server

```bash
cd server
npm run dev
```

The server will start on `http://localhost:3001`

### 4. Start the Frontend Development Server

In a new terminal:

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## Usage

### Data Collection Workflow

1. **Open the web interface** at `http://localhost:5173`
2. **Session auto-creation**: A data collection session is automatically created when you load the page
3. **Video streaming**: The simulated robot camera feed starts automatically
4. **Send commands**: Type commands in the chat interface to interact with the robot
5. **Automatic recording**: All messages are associated with the current video frame
6. **Data persistence**: All interactions are automatically saved to the backend

### Video Stream Features

The simulated video stream shows:
- Animated robot arm performing pick-and-place tasks
- Red cube (object to pick)
- Blue container (target location)
- Real-time overlays with frame info, task phase, and gripper state
- 30 FPS stream at 1280x720 resolution

### Data Collection

All collected data includes:
- **Text messages**: Commands from scientist, responses from robot
- **Video frames**: Associated with each message
- **Timestamps**: Precise timing for temporal alignment
- **Labels**: Custom labels can be added via API
- **Session metadata**: Objective, duration, status

## API Documentation

### REST API Endpoints

#### Sessions

```bash
# Create a new session
POST /api/sessions
Body: { "objective": "string", "metadata": {} }

# Get session by ID
GET /api/sessions/:sessionId

# Get all sessions
GET /api/sessions
```

#### Messages

```bash
# Add message to session
POST /api/sessions/:sessionId/messages
Body: { "sender": "scientist|robot", "content": "string", "videoFrameId": "string?" }

# Get messages for session
GET /api/sessions/:sessionId/messages
```

#### Labels

```bash
# Add label to message
POST /api/labels
Body: { 
  "sessionId": "string",
  "messageId": "string", 
  "labelType": "string",
  "labelData": {}
}

# Get labels for session
GET /api/sessions/:sessionId/labels
```

#### Export

```bash
# Export specific session dataset
GET /api/export/:sessionId

# Export all datasets
GET /api/export
```

### WebSocket Events

#### Client → Server
- `start-recording`: Start recording video for a session
- `stop-recording`: Stop recording video
- `message-sent`: Associate message with current video frame

#### Server → Client
- `video-frame`: Receive video frame data (30 FPS)
  ```json
  {
    "frameId": "uuid",
    "timestamp": 1234567890,
    "data": "base64-encoded-jpeg",
    "width": 1280,
    "height": 720
  }
  ```

## Data Export

### Export CLI Tool

The system includes a CLI tool for exporting collected data in multiple formats:

```bash
cd server

# List all sessions
npm run export list

# Export all sessions in all formats
npm run export:all

# Export specific session
npm run export all <session-id>

# Export in specific format
npm run export tfrecord [session-id]
npm run export huggingface [session-id]
npm run export csv [session-id]
npm run export statistics [session-id]

# Create dataset manifest
npm run export:manifest
```

### Export Formats

#### 1. TFRecord-Compatible JSON
- Ready for TensorFlow training pipelines
- Includes text, video, and label features
- Base64-encoded strings for TFRecord compatibility

#### 2. HuggingFace Datasets Format
- Compatible with HuggingFace `datasets` library
- Includes dataset info and features schema
- Easy integration with Transformers

#### 3. CSV Format
- Simple tabular format for analysis
- Includes message content, timestamps, and label counts
- Easy to import into pandas/Excel

#### 4. Statistics
- Session-level metrics
- Message and label counts by type
- Coverage statistics
- Duration and timing information

### Data Storage

All data is stored in `server/data/`:
```
server/data/
├── sessions.json           # Main session database
├── video_frames/          # Video frame metadata
│   └── {frameId}.json
└── exports/               # Exported datasets
    ├── {sessionId}_tfrecord.json
    ├── {sessionId}_huggingface.json
    ├── {sessionId}_data.csv
    ├── {sessionId}_statistics.json
    └── dataset_manifest.json
```

## Advanced Usage

### Adding Custom Labels

Labels can be added programmatically via the API:

```typescript
import { ApiService } from './services/apiService';

// Add success/failure label
await ApiService.addLabel(
  sessionId,
  messageId,
  'task_outcome',
  { success: true, confidence: 0.95 }
);

// Add trajectory label
await ApiService.addLabel(
  sessionId,
  messageId,
  'trajectory',
  { smoothness: 0.87, collisions: 0 }
);

// Add manipulation label
await ApiService.addLabel(
  sessionId,
  messageId,
  'grasp_quality',
  { force: 12.5, stable: true }
);
```

### Connecting Real Robot Camera

To replace the simulator with a real robot camera:

1. Modify `server/services/videoStream.js`
2. Replace `VideoSimulator` with your camera capture code
3. Use libraries like `node-opencv` or stream from robot's camera endpoint
4. Keep the same frame format for compatibility

Example:
```javascript
// Instead of simulator
generateFrame() {
  // Get frame from real camera
  const frame = await robotCamera.captureFrame();
  return frame.toDataURL('image/jpeg', 0.8);
}
```

### Custom Video Processing

Add custom video processing in the `VideoSimulator` class:

- Object detection overlays
- Pose estimation visualization
- Attention heatmaps
- Segmentation masks

### Batch Data Collection

For collecting multiple sessions automatically:

```typescript
// Create session for each task
for (const task of tasks) {
  const session = await ApiService.createSession(task.objective);
  videoStreamService.startRecording(session.id);
  
  // Execute task...
  await executeTask(task);
  
  videoStreamService.stopRecording();
}
```

## ML Training Integration

### Loading Data in Python

```python
import json
import pandas as pd
from pathlib import Path

# Load from HuggingFace format
with open('exports/{session_id}_huggingface.json') as f:
    data = json.load(f)

# Convert to DataFrame
df = pd.DataFrame(data['data'])

# Load from CSV
df = pd.read_csv('exports/{session_id}_data.csv')

# Load statistics
with open('exports/{session_id}_statistics.json') as f:
    stats = json.load(f)
```

### Creating TFRecord Dataset

```python
import tensorflow as tf
import json

def create_tfrecord(json_path, output_path):
    with open(json_path) as f:
        data = json.load(f)
    
    writer = tf.io.TFRecordWriter(output_path)
    
    for example in data['examples']:
        features = {}
        for key, value in example['features'].items():
            if 'bytes_list' in value:
                features[key] = tf.train.Feature(
                    bytes_list=tf.train.BytesList(value=value['bytes_list']['value'])
                )
            elif 'int64_list' in value:
                features[key] = tf.train.Feature(
                    int64_list=tf.train.Int64List(value=value['int64_list']['value'])
                )
        
        example_proto = tf.train.Example(
            features=tf.train.Features(feature=features)
        )
        writer.write(example_proto.SerializeToString())
    
    writer.close()
```

### Loading HuggingFace Dataset

```python
from datasets import load_dataset

# Load from JSON files
dataset = load_dataset('json', data_files={
    'train': 'exports/*_huggingface.json'
})

# Use with transformers
from transformers import AutoTokenizer, AutoModel

tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
model = AutoModel.from_pretrained('bert-base-uncased')

# Tokenize commands
def tokenize_function(examples):
    return tokenizer(examples['command'], truncation=True, padding=True)

tokenized_dataset = dataset.map(tokenize_function, batched=True)
```

## Troubleshooting

### Video Stream Not Connecting
- Ensure backend server is running on port 3001
- Check browser console for WebSocket errors
- Verify CORS settings in `server/server.js`

### Messages Not Saving
- Check that session was created successfully
- Verify backend API is accessible
- Check browser console for API errors

### Canvas Dependencies (for simulator)
If canvas installation fails:
```bash
# macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Windows
# Download pre-built binaries from node-canvas releases
```

## Performance Considerations

- **Video Stream**: 30 FPS at 1280x720 generates ~1.5 MB/s of data
- **Storage**: Each session stores ~10-50 MB depending on duration
- **Network**: WebSocket connection requires stable connection
- **Browser**: Chrome/Edge recommended for best Canvas performance

## Security Notes

⚠️ **This is a development setup**. For production:
- Add authentication/authorization
- Use HTTPS and WSS (secure WebSocket)
- Implement rate limiting
- Add input validation and sanitization
- Store sensitive data encrypted
- Use environment variables for configuration

## Future Enhancements

Potential improvements:
- [ ] Add user authentication system
- [ ] Implement real-time labeling UI
- [ ] Add video playback and review interface
- [ ] Support multiple robot cameras
- [ ] Add data augmentation pipeline
- [ ] Implement active learning suggestions
- [ ] Add model training integration
- [ ] Support ROS bridge for real robots
- [ ] Add collaborative labeling features
- [ ] Implement data versioning

## License

See LICENSE file for details.

## Support

For issues or questions, please open an issue on the repository.

