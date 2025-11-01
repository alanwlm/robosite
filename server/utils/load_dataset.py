#!/usr/bin/env python3
"""
Utility for loading robot learning datasets exported from the data collection system.

Usage:
    from load_dataset import RobotLearningDataset
    
    # Load a single session
    dataset = RobotLearningDataset.from_session('session_id')
    
    # Load all sessions
    dataset = RobotLearningDataset.from_manifest()
    
    # Get as pandas DataFrame
    df = dataset.to_dataframe()
    
    # Get as TensorFlow dataset
    tf_dataset = dataset.to_tensorflow()
    
    # Get as HuggingFace dataset
    hf_dataset = dataset.to_huggingface()
"""

import json
import base64
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd


class RobotLearningDataset:
    """Load and process robot learning interaction datasets."""
    
    def __init__(self, data_dir: str = '../data'):
        self.data_dir = Path(data_dir)
        self.exports_dir = self.data_dir / 'exports'
        self.sessions = []
        
    @classmethod
    def from_session(cls, session_id: str, data_dir: str = '../data') -> 'RobotLearningDataset':
        """Load a single session by ID."""
        dataset = cls(data_dir)
        dataset.load_session(session_id)
        return dataset
    
    @classmethod
    def from_manifest(cls, data_dir: str = '../data') -> 'RobotLearningDataset':
        """Load all sessions from the dataset manifest."""
        dataset = cls(data_dir)
        dataset.load_from_manifest()
        return dataset
    
    def load_session(self, session_id: str):
        """Load a single session's data."""
        session_file = self.exports_dir / f'{session_id}_huggingface.json'
        
        if not session_file.exists():
            raise FileNotFoundError(f"Session export not found: {session_file}")
        
        with open(session_file) as f:
            data = json.load(f)
        
        self.sessions.append({
            'session_id': session_id,
            'data': data['data'],
            'info': data['info']
        })
        
    def load_from_manifest(self):
        """Load all sessions listed in the dataset manifest."""
        manifest_file = self.exports_dir / 'dataset_manifest.json'
        
        if not manifest_file.exists():
            raise FileNotFoundError(f"Dataset manifest not found: {manifest_file}")
        
        with open(manifest_file) as f:
            manifest = json.load(f)
        
        for session in manifest['sessions']:
            try:
                self.load_session(session['session_id'])
            except FileNotFoundError:
                print(f"Warning: Could not load session {session['session_id']}")
    
    def to_dataframe(self) -> pd.DataFrame:
        """Convert dataset to pandas DataFrame."""
        rows = []
        
        for session in self.sessions:
            session_id = session['session_id']
            
            for item in session['data']:
                row = {
                    'session_id': session_id,
                    'message_id': item['id'],
                    'command': item['command'],
                    'sender': item['sender'],
                    'timestamp': pd.to_datetime(item['timestamp']),
                    'video_frame_id': item.get('video_frame_id'),
                }
                
                # Extract labels
                labels = item.get('labels', [])
                row['label_count'] = len(labels)
                
                if labels:
                    # Create columns for each unique label type
                    for label in labels:
                        label_type = label['label_type']
                        row[f'label_{label_type}'] = label['label_data']
                
                rows.append(row)
        
        return pd.DataFrame(rows)
    
    def to_tensorflow(self):
        """Convert dataset to TensorFlow dataset format."""
        try:
            import tensorflow as tf
        except ImportError:
            raise ImportError("TensorFlow is required. Install with: pip install tensorflow")
        
        def generator():
            for session in self.sessions:
                for item in session['data']:
                    yield {
                        'command': item['command'],
                        'sender': item['sender'],
                        'timestamp': item['timestamp'],
                        'video_frame_id': item.get('video_frame_id', ''),
                        'label_count': len(item.get('labels', [])),
                    }
        
        return tf.data.Dataset.from_generator(
            generator,
            output_signature={
                'command': tf.TensorSpec(shape=(), dtype=tf.string),
                'sender': tf.TensorSpec(shape=(), dtype=tf.string),
                'timestamp': tf.TensorSpec(shape=(), dtype=tf.string),
                'video_frame_id': tf.TensorSpec(shape=(), dtype=tf.string),
                'label_count': tf.TensorSpec(shape=(), dtype=tf.int32),
            }
        )
    
    def to_huggingface(self):
        """Convert dataset to HuggingFace datasets format."""
        try:
            from datasets import Dataset, DatasetDict
        except ImportError:
            raise ImportError("HuggingFace datasets is required. Install with: pip install datasets")
        
        # Flatten all sessions into a single dataset
        all_data = []
        for session in self.sessions:
            for item in session['data']:
                all_data.append({
                    'session_id': session['session_id'],
                    'id': item['id'],
                    'command': item['command'],
                    'sender': item['sender'],
                    'timestamp': item['timestamp'],
                    'video_frame_id': item.get('video_frame_id'),
                    'labels': item.get('labels', []),
                })
        
        return Dataset.from_list(all_data)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get dataset statistics."""
        total_messages = sum(len(s['data']) for s in self.sessions)
        
        senders = {}
        total_labels = 0
        
        for session in self.sessions:
            for item in session['data']:
                sender = item['sender']
                senders[sender] = senders.get(sender, 0) + 1
                total_labels += len(item.get('labels', []))
        
        return {
            'total_sessions': len(self.sessions),
            'total_messages': total_messages,
            'total_labels': total_labels,
            'messages_by_sender': senders,
            'avg_messages_per_session': total_messages / len(self.sessions) if self.sessions else 0,
            'avg_labels_per_message': total_labels / total_messages if total_messages else 0,
        }
    
    def filter_by_sender(self, sender: str) -> 'RobotLearningDataset':
        """Filter dataset to only include messages from a specific sender."""
        filtered = RobotLearningDataset(str(self.data_dir))
        
        for session in self.sessions:
            filtered_data = [
                item for item in session['data']
                if item['sender'] == sender
            ]
            
            if filtered_data:
                filtered.sessions.append({
                    'session_id': session['session_id'],
                    'data': filtered_data,
                    'info': session['info']
                })
        
        return filtered
    
    def filter_by_labels(self, label_type: Optional[str] = None) -> 'RobotLearningDataset':
        """Filter dataset to only include messages with labels (optionally of a specific type)."""
        filtered = RobotLearningDataset(str(self.data_dir))
        
        for session in self.sessions:
            filtered_data = []
            
            for item in session['data']:
                labels = item.get('labels', [])
                
                if not labels:
                    continue
                
                if label_type is None:
                    # Include any message with labels
                    filtered_data.append(item)
                else:
                    # Include only if specific label type exists
                    if any(label['label_type'] == label_type for label in labels):
                        filtered_data.append(item)
            
            if filtered_data:
                filtered.sessions.append({
                    'session_id': session['session_id'],
                    'data': filtered_data,
                    'info': session['info']
                })
        
        return filtered
    
    def split_train_test(self, test_size: float = 0.2, random_state: Optional[int] = None):
        """Split dataset into train and test sets."""
        try:
            from sklearn.model_selection import train_test_split
        except ImportError:
            raise ImportError("scikit-learn is required. Install with: pip install scikit-learn")
        
        df = self.to_dataframe()
        
        train_df, test_df = train_test_split(
            df,
            test_size=test_size,
            random_state=random_state
        )
        
        return train_df, test_df


def example_usage():
    """Example usage of the RobotLearningDataset class."""
    
    print("=== Robot Learning Dataset Loader ===\n")
    
    # Load all sessions
    dataset = RobotLearningDataset.from_manifest()
    
    # Print statistics
    stats = dataset.get_statistics()
    print("Dataset Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    print("\n" + "="*40 + "\n")
    
    # Convert to DataFrame
    df = dataset.to_dataframe()
    print("DataFrame Preview:")
    print(df.head())
    
    print("\n" + "="*40 + "\n")
    
    # Filter by sender
    scientist_dataset = dataset.filter_by_sender('scientist')
    print(f"Scientist messages: {len(scientist_dataset.to_dataframe())}")
    
    robot_dataset = dataset.filter_by_sender('robot')
    print(f"Robot messages: {len(robot_dataset.to_dataframe())}")
    
    print("\n" + "="*40 + "\n")
    
    # Filter by labels
    labeled_dataset = dataset.filter_by_labels()
    print(f"Labeled messages: {len(labeled_dataset.to_dataframe())}")
    
    print("\n" + "="*40 + "\n")
    
    # Split train/test
    train_df, test_df = dataset.split_train_test(test_size=0.2, random_state=42)
    print(f"Train set size: {len(train_df)}")
    print(f"Test set size: {len(test_df)}")


if __name__ == '__main__':
    example_usage()

