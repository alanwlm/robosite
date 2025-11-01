import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class DataExporter {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.exportDir = join(dataDir, 'exports');
    this.ensureExportDirectory();
  }

  ensureExportDirectory() {
    if (!existsSync(this.exportDir)) {
      mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Export session data in TFRecord-compatible JSON format
   */
  exportToTFRecordFormat(session) {
    const tfRecordData = {
      metadata: {
        session_id: session.id,
        objective: session.objective,
        start_time: session.startTime,
        end_time: session.endTime,
        format: 'tfrecord_json',
      },
      examples: session.messages.map((msg, idx) => {
        const labels = session.labels.filter(l => l.messageId === msg.id);
        const videoFrame = session.videoFrames.find(f => f.id === msg.videoFrameId);

        return {
          id: idx,
          features: {
            // Text features
            'text/command': {
              bytes_list: { value: [Buffer.from(msg.content).toString('base64')] }
            },
            'text/sender': {
              bytes_list: { value: [Buffer.from(msg.sender).toString('base64')] }
            },
            'text/timestamp': {
              bytes_list: { value: [Buffer.from(msg.timestamp).toString('base64')] }
            },
            
            // Video features
            'video/frame_id': {
              bytes_list: { value: videoFrame ? [Buffer.from(videoFrame.id).toString('base64')] : [] }
            },
            'video/timestamp': {
              int64_list: { value: videoFrame ? [new Date(videoFrame.timestamp).getTime()] : [] }
            },
            
            // Label features
            'label/count': {
              int64_list: { value: [labels.length] }
            },
            'label/types': {
              bytes_list: { value: labels.map(l => Buffer.from(l.labelType).toString('base64')) }
            },
          }
        };
      })
    };

    const filename = `${session.id}_tfrecord.json`;
    const filepath = join(this.exportDir, filename);
    writeFileSync(filepath, JSON.stringify(tfRecordData, null, 2));
    
    return { format: 'tfrecord_json', path: filepath };
  }

  /**
   * Export session data in HuggingFace datasets format
   */
  exportToHuggingFaceFormat(session) {
    const hfData = {
      info: {
        description: "Robot learning interaction dataset",
        citation: "",
        homepage: "",
        license: "",
        features: {
          id: { dtype: "string", id: null },
          command: { dtype: "string", id: null },
          sender: { dtype: "string", id: null },
          timestamp: { dtype: "string", id: null },
          video_frame_id: { dtype: "string", id: null },
          labels: {
            feature: {
              label_type: { dtype: "string", id: null },
              label_data: { dtype: "string", id: null }
            }
          }
        },
        supervised_keys: null,
        builder_name: "robot_learning_dataset",
        dataset_name: session.id,
        version: { version_str: "1.0.0", major: 1, minor: 0, patch: 0 }
      },
      data: session.messages.map(msg => {
        const labels = session.labels.filter(l => l.messageId === msg.id);
        
        return {
          id: msg.id,
          command: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp,
          video_frame_id: msg.videoFrameId || null,
          labels: labels.map(l => ({
            label_type: l.labelType,
            label_data: JSON.stringify(l.labelData)
          }))
        };
      })
    };

    const filename = `${session.id}_huggingface.json`;
    const filepath = join(this.exportDir, filename);
    writeFileSync(filepath, JSON.stringify(hfData, null, 2));
    
    return { format: 'huggingface', path: filepath };
  }

  /**
   * Export session data in CSV format for easy analysis
   */
  exportToCSV(session) {
    const headers = [
      'message_id',
      'timestamp',
      'sender',
      'content',
      'video_frame_id',
      'label_count',
      'label_types'
    ];

    const rows = session.messages.map(msg => {
      const labels = session.labels.filter(l => l.messageId === msg.id);
      const labelTypes = labels.map(l => l.labelType).join(';');

      return [
        msg.id,
        msg.timestamp,
        msg.sender,
        `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes
        msg.videoFrameId || '',
        labels.length,
        labelTypes
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    const filename = `${session.id}_data.csv`;
    const filepath = join(this.exportDir, filename);
    writeFileSync(filepath, csv);
    
    return { format: 'csv', path: filepath };
  }

  /**
   * Export session statistics and metadata
   */
  exportStatistics(session) {
    const messagesByType = session.messages.reduce((acc, msg) => {
      acc[msg.sender] = (acc[msg.sender] || 0) + 1;
      return acc;
    }, {});

    const labelsByType = session.labels.reduce((acc, label) => {
      acc[label.labelType] = (acc[label.labelType] || 0) + 1;
      return acc;
    }, {});

    const duration = session.endTime && session.startTime
      ? new Date(session.endTime) - new Date(session.startTime)
      : null;

    const stats = {
      session: {
        id: session.id,
        objective: session.objective,
        start_time: session.startTime,
        end_time: session.endTime,
        duration_ms: duration,
        status: session.status
      },
      messages: {
        total: session.messages.length,
        by_sender: messagesByType,
        avg_length: session.messages.length > 0
          ? session.messages.reduce((sum, m) => sum + m.content.length, 0) / session.messages.length
          : 0
      },
      labels: {
        total: session.labels.length,
        by_type: labelsByType,
        coverage: session.messages.length > 0
          ? (session.labels.length / session.messages.length * 100).toFixed(2) + '%'
          : '0%'
      },
      video: {
        total_frames: session.videoFrames.length,
        frames_with_messages: session.messages.filter(m => m.videoFrameId).length
      }
    };

    const filename = `${session.id}_statistics.json`;
    const filepath = join(this.exportDir, filename);
    writeFileSync(filepath, JSON.stringify(stats, null, 2));
    
    return { format: 'statistics', path: filepath };
  }

  /**
   * Export session in multiple formats
   */
  exportAll(session) {
    return {
      tfrecord: this.exportToTFRecordFormat(session),
      huggingface: this.exportToHuggingFaceFormat(session),
      csv: this.exportToCSV(session),
      statistics: this.exportStatistics(session)
    };
  }

  /**
   * Create a dataset manifest file for batch training
   */
  createDatasetManifest(sessions) {
    const manifest = {
      created_at: new Date().toISOString(),
      version: "1.0.0",
      total_sessions: sessions.length,
      sessions: sessions.map(session => {
        const duration = session.endTime && session.startTime
          ? new Date(session.endTime) - new Date(session.startTime)
          : null;

        return {
          session_id: session.id,
          objective: session.objective,
          message_count: session.messages.length,
          label_count: session.labels.length,
          video_frame_count: session.videoFrames.length,
          duration_ms: duration,
          exports: {
            tfrecord: `${session.id}_tfrecord.json`,
            huggingface: `${session.id}_huggingface.json`,
            csv: `${session.id}_data.csv`,
            statistics: `${session.id}_statistics.json`
          }
        };
      }),
      aggregates: {
        total_messages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
        total_labels: sessions.reduce((sum, s) => sum + s.labels.length, 0),
        total_video_frames: sessions.reduce((sum, s) => sum + s.videoFrames.length, 0),
        total_duration_ms: sessions.reduce((sum, s) => {
          const duration = s.endTime && s.startTime
            ? new Date(s.endTime) - new Date(s.startTime)
            : 0;
          return sum + duration;
        }, 0)
      }
    };

    const filename = 'dataset_manifest.json';
    const filepath = join(this.exportDir, filename);
    writeFileSync(filepath, JSON.stringify(manifest, null, 2));
    
    console.log(`Created dataset manifest: ${filepath}`);
    return manifest;
  }
}

