"""
Embedding model architecture
"""

import torch
import torch.nn as nn
import torchvision.models as models

class EmbeddingModel(nn.Module):
    """Embedding extraction model"""
    
    def __init__(self, embedding_dim=512, model_name='efficientnet_b0'):
        super().__init__()
        self.embedding_dim = embedding_dim
        
        # Load base model
        if model_name == 'efficientnet_b0':
            self.backbone = models.efficientnet_b0(pretrained=True)
            self.backbone.classifier = nn.Identity()
            feature_dim = 1280
        elif model_name == 'mobilenet_v3':
            self.backbone = models.mobilenet_v3_small(pretrained=True)
            self.backbone.classifier = nn.Identity()
            feature_dim = 576
        else:
            raise ValueError(f'Unknown model: {model_name}')
        
        # Embedding projection
        self.embedding = nn.Sequential(
            nn.Linear(feature_dim, 1024),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(1024, embedding_dim),
            nn.L2Norm(dim=1)  # Normalize embeddings
        )
    
    def forward(self, x):
        features = self.backbone(x)
        embeddings = self.embedding(features)
        return embeddings

class ArcFaceLoss(nn.Module):
    """ArcFace loss for classification"""
    
    def __init__(self, num_classes, embedding_dim, margin=0.5, scale=64):
        super().__init__()
        self.num_classes = num_classes
        self.margin = margin
        self.scale = scale
        
        # Classification head
        self.weight = nn.Parameter(torch.FloatTensor(num_classes, embedding_dim))
        nn.init.xavier_uniform_(self.weight)
    
    def forward(self, embeddings, labels):
        # Normalize
        embeddings = nn.functional.normalize(embeddings, dim=1)
        weight = nn.functional.normalize(self.weight, dim=1)
        
        # Compute logits
        logits = torch.matmul(embeddings, weight.t()) * self.scale
        
        # ArcFace margin
        theta = torch.acos(torch.clamp(logits, -1 + 1e-7, 1 - 1e-7))
        target_theta = theta[torch.arange(len(labels)), labels].view(-1, 1)
        theta_m = target_theta + self.margin
        logits_m = torch.cos(theta_m) * self.scale
        
        # Replace target logits
        logits_m = logits.clone()
        logits_m[torch.arange(len(labels)), labels] = torch.cos(theta_m).squeeze()
        logits_m = logits_m * self.scale
        
        # Cross entropy
        return nn.functional.cross_entropy(logits_m, labels)
