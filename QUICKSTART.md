# Quick Start Guide

## 1. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ..
npm install
```

## 2. Start the System

Open two terminal windows:

### Terminal 1 - Backend Server
```bash
cd server
npm run dev
```

You should see:
```
Server running on port 3001
WebSocket server ready for video streaming
```

### Terminal 2 - Frontend
```bash
npm run dev
```

You should see:
```
VITE v6.3.5  ready in XXX ms

➜  Local:   http://localhost:5173/
```

## 3. Use the Interface

1. Open http://localhost:5173 in your browser
2. You'll see:
   - **Top**: Current objective/task description
   - **Middle**: Live video feed from simulated robot camera
   - **Bottom**: Chat interface for sending commands

3. Type a command (e.g., "Pick up the cube") and press Enter
4. The robot will respond, and all data is automatically saved

## 4. View Collected Data

```bash
cd server

# List all collection sessions
npm run export list

# Export all data
npm run export:all

# View exports
ls data/exports/
```

## What's Being Collected?

Every interaction automatically captures:
- ✅ Your text commands
- ✅ Robot responses
- ✅ Associated video frames
- ✅ Timestamps
- ✅ Session metadata

## Export Formats

Data is exported in multiple formats for ML training:
- **TFRecord JSON** - For TensorFlow
- **HuggingFace** - For Transformers
- **CSV** - For analysis in Excel/Pandas
- **Statistics** - Session metrics

## Next Steps

- Read [IMPLEMENTATION.md](IMPLEMENTATION.md) for detailed documentation
- Add custom labels via the API
- Integrate with your real robot camera
- Export data for ML model training

## Need Help?

Check the troubleshooting section in [IMPLEMENTATION.md](IMPLEMENTATION.md)

