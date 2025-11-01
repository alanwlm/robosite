import { createCanvas } from 'canvas';
import { v4 as uuidv4 } from 'uuid';

export class VideoStreamService {
  constructor(io) {
    this.io = io;
    this.clients = new Map();
    this.frameRate = 30; // 30 FPS
    this.width = 1280;
    this.height = 720;
    this.streamInterval = null;
    this.simulator = new VideoSimulator(this.width, this.height);
    
    this.startStreaming();
  }

  addClient(socket) {
    this.clients.set(socket.id, {
      socket,
      isRecording: false,
      sessionId: null,
      currentFrameId: null
    });
    console.log(`Added client to video stream: ${socket.id}`);
  }

  removeClient(socket) {
    this.clients.delete(socket.id);
    console.log(`Removed client from video stream: ${socket.id}`);
  }

  startRecording(sessionId, clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.isRecording = true;
      client.sessionId = sessionId;
      console.log(`Started recording for client ${clientId}, session ${sessionId}`);
    }
  }

  stopRecording(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.isRecording = false;
      client.sessionId = null;
      console.log(`Stopped recording for client ${clientId}`);
    }
  }

  getCurrentFrameId(clientId) {
    const client = this.clients.get(clientId);
    return client ? client.currentFrameId : null;
  }

  startStreaming() {
    const frameInterval = 1000 / this.frameRate;
    
    this.streamInterval = setInterval(() => {
      if (this.clients.size === 0) return;

      // Generate a new frame
      const frameData = this.simulator.generateFrame();
      const frameId = uuidv4();

      // Broadcast to all connected clients
      this.clients.forEach((client, clientId) => {
        client.currentFrameId = frameId;
        
        client.socket.emit('video-frame', {
          frameId,
          timestamp: Date.now(),
          data: frameData,
          width: this.width,
          height: this.height
        });
      });
    }, frameInterval);

    console.log(`Video streaming started at ${this.frameRate} FPS`);
  }

  stopStreaming() {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
      console.log('Video streaming stopped');
    }
  }
}

class VideoSimulator {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.canvas = createCanvas(width, height);
    this.ctx = this.canvas.getContext('2d');
    this.frame = 0;
    this.robotArmAngle = 0;
    this.cubePosition = { x: width * 0.3, y: height * 0.5 };
    this.targetPosition = { x: width * 0.7, y: height * 0.5 };
    this.gripperOpen = true;
    this.taskPhase = 'approaching'; // approaching, grasping, moving, releasing
  }

  generateFrame() {
    this.frame++;
    
    // Clear canvas
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw environment
    this.drawEnvironment();
    
    // Draw objects
    this.drawTable();
    this.drawCube();
    this.drawTarget();
    
    // Draw robot arm
    this.drawRobotArm();
    
    // Add overlay information
    this.drawOverlay();

    // Update simulation state
    this.updateSimulation();

    // Convert to base64 JPEG
    return this.canvas.toDataURL('image/jpeg', 0.8);
  }

  drawEnvironment() {
    // Draw grid floor
    this.ctx.strokeStyle = '#2a2a4e';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i < 20; i++) {
      const y = (this.height / 20) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
      
      const x = (this.width / 20) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
  }

  drawTable() {
    // Draw table surface
    this.ctx.fillStyle = '#6b4423';
    this.ctx.fillRect(
      this.width * 0.1,
      this.height * 0.6,
      this.width * 0.8,
      this.height * 0.05
    );
    
    // Table shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(
      this.width * 0.1,
      this.height * 0.65,
      this.width * 0.8,
      this.height * 0.02
    );
  }

  drawCube() {
    const size = 50;
    const x = this.cubePosition.x;
    const y = this.cubePosition.y;
    
    // Red cube
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
    
    // Cube highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(x - size / 2, y - size / 2, size / 2, size / 2);
    
    // Cube border
    this.ctx.strokeStyle = '#c0392b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  }

  drawTarget() {
    const size = 80;
    const x = this.targetPosition.x;
    const y = this.targetPosition.y;
    
    // Blue container
    this.ctx.fillStyle = '#3498db';
    this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
    
    // Container border
    this.ctx.strokeStyle = '#2980b9';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);
    
    // Inner highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(x - size / 2 + 5, y - size / 2 + 5, size - 10, size / 3);
  }

  drawRobotArm() {
    const baseX = this.width * 0.5;
    const baseY = this.height * 0.8;
    
    // Base
    this.ctx.fillStyle = '#7f8c8d';
    this.ctx.beginPath();
    this.ctx.arc(baseX, baseY, 30, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Arm segments
    const arm1Length = 150;
    const arm2Length = 120;
    
    // Calculate arm position based on animation
    const angle1 = this.robotArmAngle + Math.PI / 4;
    const angle2 = -this.robotArmAngle - Math.PI / 3;
    
    // First segment
    const joint1X = baseX + Math.cos(angle1) * arm1Length;
    const joint1Y = baseY + Math.sin(angle1) * arm1Length;
    
    this.ctx.strokeStyle = '#95a5a6';
    this.ctx.lineWidth = 15;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(baseX, baseY);
    this.ctx.lineTo(joint1X, joint1Y);
    this.ctx.stroke();
    
    // Second segment
    const endX = joint1X + Math.cos(angle2) * arm2Length;
    const endY = joint1Y + Math.sin(angle2) * arm2Length;
    
    this.ctx.beginPath();
    this.ctx.moveTo(joint1X, joint1Y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();
    
    // Gripper
    this.drawGripper(endX, endY, angle2);
    
    // Joints
    this.ctx.fillStyle = '#34495e';
    this.ctx.beginPath();
    this.ctx.arc(joint1X, joint1Y, 12, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(endX, endY, 10, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawGripper(x, y, angle) {
    const gripperWidth = this.gripperOpen ? 30 : 15;
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);
    
    this.ctx.strokeStyle = '#2c3e50';
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = 'round';
    
    // Left gripper finger
    this.ctx.beginPath();
    this.ctx.moveTo(-gripperWidth, 0);
    this.ctx.lineTo(-gripperWidth, 25);
    this.ctx.stroke();
    
    // Right gripper finger
    this.ctx.beginPath();
    this.ctx.moveTo(gripperWidth, 0);
    this.ctx.lineTo(gripperWidth, 25);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  drawOverlay() {
    // Frame counter
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(10, 10, 200, 120);
    
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`Frame: ${this.frame}`, 20, 30);
    this.ctx.fillText(`Phase: ${this.taskPhase}`, 20, 50);
    this.ctx.fillText(`Gripper: ${this.gripperOpen ? 'OPEN' : 'CLOSED'}`, 20, 70);
    this.ctx.fillText(`Angle: ${(this.robotArmAngle * 180 / Math.PI).toFixed(1)}°`, 20, 90);
    
    // Timestamp
    this.ctx.fillText(new Date().toISOString().split('T')[1].split('.')[0], 20, 110);
    
    // Task objective indicator
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(this.width - 210, 10, 200, 40);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText('Objective: Pick and Place', this.width - 200, 30);
  }

  updateSimulation() {
    // Animate robot arm
    const speed = 0.02;
    
    switch (this.taskPhase) {
      case 'approaching':
        this.robotArmAngle += speed;
        if (this.robotArmAngle > Math.PI / 6) {
          this.taskPhase = 'grasping';
          this.gripperOpen = false;
        }
        break;
        
      case 'grasping':
        if (this.frame % 60 === 0) {
          this.taskPhase = 'moving';
        }
        break;
        
      case 'moving':
        this.robotArmAngle -= speed;
        this.cubePosition.x += (this.targetPosition.x - this.cubePosition.x) * 0.02;
        this.cubePosition.y += (this.targetPosition.y - this.cubePosition.y) * 0.02;
        
        if (Math.abs(this.cubePosition.x - this.targetPosition.x) < 5) {
          this.taskPhase = 'releasing';
        }
        break;
        
      case 'releasing':
        this.gripperOpen = true;
        if (this.frame % 120 === 0) {
          // Reset simulation
          this.taskPhase = 'approaching';
          this.cubePosition = { x: this.width * 0.3, y: this.height * 0.5 };
          this.robotArmAngle = 0;
        }
        break;
    }
  }
}

