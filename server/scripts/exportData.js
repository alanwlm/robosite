#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DataExporter } from '../utils/dataExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, '../data');
const sessionsFile = join(dataDir, 'sessions.json');

function loadSessions() {
  if (!existsSync(sessionsFile)) {
    console.error('No sessions file found. Please run the server first to generate data.');
    process.exit(1);
  }

  try {
    const data = readFileSync(sessionsFile, 'utf-8');
    const sessionsObj = JSON.parse(data);
    return Object.values(sessionsObj);
  } catch (error) {
    console.error('Error loading sessions:', error.message);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
Usage: node exportData.js [command] [options]

Commands:
  all [sessionId]         Export all formats for a session or all sessions
  tfrecord [sessionId]    Export in TFRecord-compatible JSON format
  huggingface [sessionId] Export in HuggingFace datasets format
  csv [sessionId]         Export in CSV format
  statistics [sessionId]  Export statistics
  manifest                Create dataset manifest for all sessions
  list                    List all available sessions

Options:
  sessionId               Specific session ID to export (optional for most commands)

Examples:
  node exportData.js all                          # Export all sessions in all formats
  node exportData.js all abc-123                  # Export specific session in all formats
  node exportData.js tfrecord                     # Export all sessions in TFRecord format
  node exportData.js manifest                     # Create manifest file
  node exportData.js list                         # List all sessions
  `);
}

function listSessions(sessions) {
  console.log('\n=== Available Sessions ===\n');
  
  sessions.forEach((session, idx) => {
    const duration = session.endTime && session.startTime
      ? ((new Date(session.endTime) - new Date(session.startTime)) / 1000).toFixed(1)
      : 'ongoing';

    console.log(`${idx + 1}. Session ID: ${session.id}`);
    console.log(`   Objective: ${session.objective}`);
    console.log(`   Messages: ${session.messages.length} | Labels: ${session.labels.length} | Frames: ${session.videoFrames.length}`);
    console.log(`   Duration: ${duration}s | Status: ${session.status}`);
    console.log(`   Started: ${new Date(session.startTime).toLocaleString()}\n`);
  });

  console.log(`Total sessions: ${sessions.length}\n`);
}

function exportSession(exporter, session, format) {
  console.log(`\nExporting session ${session.id}...`);
  
  let result;
  switch (format) {
    case 'all':
      result = exporter.exportAll(session);
      console.log('✓ Exported all formats:');
      Object.entries(result).forEach(([fmt, info]) => {
        console.log(`  - ${fmt}: ${info.path}`);
      });
      break;
    
    case 'tfrecord':
      result = exporter.exportToTFRecordFormat(session);
      console.log(`✓ TFRecord format: ${result.path}`);
      break;
    
    case 'huggingface':
      result = exporter.exportToHuggingFaceFormat(session);
      console.log(`✓ HuggingFace format: ${result.path}`);
      break;
    
    case 'csv':
      result = exporter.exportToCSV(session);
      console.log(`✓ CSV format: ${result.path}`);
      break;
    
    case 'statistics':
      result = exporter.exportStatistics(session);
      console.log(`✓ Statistics: ${result.path}`);
      break;
    
    default:
      console.error(`Unknown format: ${format}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    printUsage();
    return;
  }

  const command = args[0];
  const sessionId = args[1];

  const sessions = loadSessions();
  const exporter = new DataExporter(dataDir);

  switch (command) {
    case 'list':
      listSessions(sessions);
      break;

    case 'manifest':
      console.log('\nCreating dataset manifest...');
      const manifest = exporter.createDatasetManifest(sessions);
      console.log(`✓ Created manifest with ${manifest.total_sessions} sessions`);
      console.log(`  Total messages: ${manifest.aggregates.total_messages}`);
      console.log(`  Total labels: ${manifest.aggregates.total_labels}`);
      console.log(`  Total video frames: ${manifest.aggregates.total_video_frames}`);
      break;

    case 'all':
    case 'tfrecord':
    case 'huggingface':
    case 'csv':
    case 'statistics':
      if (sessionId) {
        // Export specific session
        const session = sessions.find(s => s.id === sessionId);
        if (!session) {
          console.error(`Session not found: ${sessionId}`);
          process.exit(1);
        }
        exportSession(exporter, session, command);
      } else {
        // Export all sessions
        console.log(`\nExporting ${sessions.length} sessions in ${command} format...`);
        sessions.forEach(session => {
          exportSession(exporter, session, command);
        });
        console.log('\n✓ All sessions exported successfully');
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();

