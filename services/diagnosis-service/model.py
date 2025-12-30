import torch
import torch.nn as nn
import torchvision.models as models
from torchvision import transforms

class CornDiseaseClassifier(nn.Module):
    """
    玉米病虫害分类模型
    基于预训练的ConvNeXT模型
    """
    
    def __init__(self, num_classes=4, pretrained=True):
        """
        初始化模型
        
        Args:
            num_classes (int): 分类数量
            pretrained (bool): 是否使用预训练权重
        """
        super(CornDiseaseClassifier, self).__init__()
        
        convnext = models.convnext_tiny(pretrained=pretrained)
        convnext.classifier[2] = torch.nn.Linear(in_features=768, out_features=4)
        self.convnext = convnext
        self.num_classes = num_classes
    
    def forward(self, x):
        """
        前向传播
        
        Args:
            x (torch.Tensor): 输入图像
            
        Returns:
            torch.Tensor: 分类结果
        """
        return self.convnext(x)
    
    def freeze_backbone(self):
        """
        冻结骨干网络的参数（除了分类头）
        """
        for param in self.convnext.features.parameters():
            param.requires_grad = False
    
    def unfreeze_backbone(self):
        """
        解冻骨干网络的参数
        """
        for param in self.convnext.features.parameters():
            param.requires_grad = True

def create_model(num_classes=4, pretrained=True):
    """
    创建玉米病虫害分类模型
    
    Args:
        num_classes (int): 分类数量
        pretrained (bool): 是否使用预训练权重
        
    Returns:
        CornDiseaseClassifier: 初始化的模型
    """
    return CornDiseaseClassifier(num_classes=num_classes, pretrained=pretrained)

def get_preprocessing_transforms():
    """
    获取图像预处理变换
    
    Returns:
        torchvision.transforms.Compose: 图像预处理变换
    """
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
