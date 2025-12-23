"""
Dataset loading for strain images
"""

import torch
from torch.utils.data import Dataset
from PIL import Image
import os
import json
from pathlib import Path
from augment import get_augmentations

class StrainDataset(Dataset):
    """Dataset for strain images"""
    
    def __init__(self, data_dir='data', augment=False):
        self.data_dir = Path(data_dir)
        self.augment = augment
        self.transform = get_augmentations(augment=augment)
        
        # Load image paths and labels
        self.samples = []
        self.strain_to_label = {}
        self.label_to_strain = {}
        
        # Load from manifests or directory structure
        manifests_dir = self.data_dir / 'manifests'
        if manifests_dir.exists():
            self._load_from_manifests(manifests_dir)
        else:
            self._load_from_directories()
        
        self.num_classes = len(self.strain_to_label)
        print(f'Loaded {len(self.samples)} samples from {self.num_classes} strains')
    
    def _load_from_manifests(self, manifests_dir):
        """Load images from manifest files"""
        label_idx = 0
        
        for manifest_file in manifests_dir.glob('*.json'):
            with open(manifest_file, 'r') as f:
                manifest = json.load(f)
            
            strain = manifest['strain']
            if strain not in self.strain_to_label:
                self.strain_to_label[strain] = label_idx
                self.label_to_strain[label_idx] = strain
                label_idx += 1
            
            label = self.strain_to_label[strain]
            
            # Add real images
            for img_url in manifest.get('images', {}).get('real', []):
                self.samples.append((img_url, label))
            
            # Add synthetic images
            for img_url in manifest.get('images', {}).get('synthetic', []):
                self.samples.append((img_url, label))
    
    def _load_from_directories(self):
        """Load images from directory structure"""
        strains_dir = self.data_dir / 'strains'
        if not strains_dir.exists():
            return
        
        label_idx = 0
        
        for strain_dir in strains_dir.iterdir():
            if not strain_dir.is_dir():
                continue
            
            strain = strain_dir.name
            if strain not in self.strain_to_label:
                self.strain_to_label[strain] = label_idx
                self.label_to_strain[label_idx] = strain
                label_idx += 1
            
            label = self.strain_to_label[strain]
            
            # Load real images
            real_dir = strain_dir / 'real'
            if real_dir.exists():
                for img_file in real_dir.glob('*.{jpg,jpeg,png,webp}'):
                    self.samples.append((str(img_file), label))
            
            # Load synthetic images
            synthetic_dir = strain_dir / 'synthetic'
            if synthetic_dir.exists():
                for img_file in synthetic_dir.glob('*.{jpg,jpeg,png,webp}'):
                    self.samples.append((str(img_file), label))
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        
        # Load image
        if img_path.startswith('http'):
            # Download from URL (implement if needed)
            raise NotImplementedError('URL loading not implemented')
        else:
            img = Image.open(img_path).convert('RGB')
        
        # Apply transforms
        if self.transform:
            img = self.transform(img)
        
        return img, label
