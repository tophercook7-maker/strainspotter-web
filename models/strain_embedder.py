import torch
import torch.nn as nn
from torchvision import models

class StrainEmbedder(nn.Module):
    def __init__(self, dim=512):
        super().__init__()
        resnet = models.resnet18(pretrained=True)
        self.backbone = nn.Sequential(*list(resnet.children())[:-1])
        self.fc = nn.Linear(resnet.fc.in_features, dim)
        
    def forward(self, x):
        x = self.backbone(x)
        x = x.view(x.size(0), -1)
        x = self.fc(x)
        # L2 normalize for cosine similarity
        x = nn.functional.normalize(x, p=2, dim=1)
        return x
