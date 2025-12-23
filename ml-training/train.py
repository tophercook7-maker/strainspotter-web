"""
Custom ML Training Pipeline for Strain Embeddings
Uses PyTorch with triplet loss or contrastive loss
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import json
import os
from pathlib import Path

from datasets import StrainDataset
from model import EmbeddingModel
from augment import get_augmentations

# Configuration
CONFIG = {
    'batch_size': 32,
    'learning_rate': 0.001,
    'epochs': 50,
    'embedding_dim': 512,
    'loss_type': 'triplet',  # 'triplet', 'contrastive', or 'arcface'
    'margin': 0.5,
    'model_name': 'efficientnet_b0',  # or 'mobilenet_v3'
    'checkpoint_dir': 'checkpoints',
    'output_dir': 'output'
}

def train_epoch(model, dataloader, criterion, optimizer, device):
    """Train for one epoch"""
    model.train()
    total_loss = 0
    
    for batch_idx, batch in enumerate(dataloader):
        optimizer.zero_grad()
        
        if CONFIG['loss_type'] == 'triplet':
            anchor, positive, negative = batch
            anchor = anchor.to(device)
            positive = positive.to(device)
            negative = negative.to(device)
            
            anchor_emb = model(anchor)
            positive_emb = model(positive)
            negative_emb = model(negative)
            
            loss = criterion(anchor_emb, positive_emb, negative_emb)
        
        elif CONFIG['loss_type'] == 'contrastive':
            img1, img2, label = batch
            img1 = img1.to(device)
            img2 = img2.to(device)
            label = label.to(device)
            
            emb1 = model(img1)
            emb2 = model(img2)
            
            loss = criterion(emb1, emb2, label)
        
        else:  # arcface
            images, labels = batch
            images = images.to(device)
            labels = labels.to(device)
            
            embeddings = model(images)
            loss = criterion(embeddings, labels)
        
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
    
    return total_loss / len(dataloader)

def main():
    # Setup
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'Using device: {device}')
    
    # Create directories
    os.makedirs(CONFIG['checkpoint_dir'], exist_ok=True)
    os.makedirs(CONFIG['output_dir'], exist_ok=True)
    
    # Load dataset
    print('Loading dataset...')
    dataset = StrainDataset(
        data_dir='data',
        augment=True
    )
    dataloader = DataLoader(
        dataset,
        batch_size=CONFIG['batch_size'],
        shuffle=True,
        num_workers=4
    )
    
    # Initialize model
    print('Initializing model...')
    model = EmbeddingModel(
        embedding_dim=CONFIG['embedding_dim'],
        model_name=CONFIG['model_name']
    ).to(device)
    
    # Loss function
    if CONFIG['loss_type'] == 'triplet':
        criterion = nn.TripletMarginLoss(margin=CONFIG['margin'])
    elif CONFIG['loss_type'] == 'contrastive':
        criterion = nn.CosineEmbeddingLoss(margin=CONFIG['margin'])
    else:  # arcface
        from model import ArcFaceLoss
        criterion = ArcFaceLoss(
            num_classes=dataset.num_classes,
            embedding_dim=CONFIG['embedding_dim']
        ).to(device)
    
    # Optimizer
    optimizer = optim.Adam(model.parameters(), lr=CONFIG['learning_rate'])
    
    # Training loop
    print('Starting training...')
    best_loss = float('inf')
    
    for epoch in range(CONFIG['epochs']):
        avg_loss = train_epoch(model, dataloader, criterion, optimizer, device)
        print(f'Epoch {epoch+1}/{CONFIG["epochs"]}, Loss: {avg_loss:.4f}')
        
        # Save checkpoint
        if avg_loss < best_loss:
            best_loss = avg_loss
            checkpoint = {
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'loss': avg_loss,
                'config': CONFIG
            }
            torch.save(checkpoint, f'{CONFIG["checkpoint_dir"]}/best_model.pt')
            print(f'  Saved checkpoint (loss: {avg_loss:.4f})')
    
    # Export model
    print('Exporting model...')
    model.eval()
    
    # Save PyTorch model
    torch.save(model.state_dict(), f'{CONFIG["output_dir"]}/model.pt')
    
    # Save architecture info
    with open(f'{CONFIG["output_dir"]}/model.json', 'w') as f:
        json.dump({
            'model_name': CONFIG['model_name'],
            'embedding_dim': CONFIG['embedding_dim'],
            'input_size': 224,
            'architecture': 'embedding_extractor'
        }, f, indent=2)
    
    # Save version
    with open(f'{CONFIG["output_dir"]}/version.txt', 'w') as f:
        f.write(f'v{len(os.listdir(CONFIG["output_dir"])) + 1}\n')
    
    print('✅ Training complete!')
    print(f'   Model saved to: {CONFIG["output_dir"]}/model.pt')

if __name__ == '__main__':
    main()
