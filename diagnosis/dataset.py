import os
from PIL import Image
import torch
from torch.utils.data import Dataset
from torchvision import transforms
import numpy as np

current_dir = os.path.dirname(os.path.abspath(__file__))

class CornDiseaseDataset(Dataset):
    """
    玉米病虫害数据集类
    """
    
    # 类别映射：数字标签到人类可读的类别名称
    CLASS_NAMES = {
        0: "CercosporaLeafSpot",
        1: "Healthy", 
        2: "NothernLeafBlight",
        3: "Rust"
    }
    
    def __init__(self, root_dir=f"{current_dir}/data/PlantVillageCorn", transform=None, image_types=['Color', 'Segment']):
        """
        初始化数据集
        
        Args:
            root_dir (str): 数据集根目录路径
            transform (callable, optional): 图像变换函数
            data_type (str): 数据类型 ("Color", "Gray", "Segment")
        """
        self.root_dir = root_dir
        self.transform = transform
        self.image_types = image_types
        # 获取所有类别文件夹
        self.classes = sorted([dir for dir in os.listdir(root_dir) 
                              if os.path.isdir(os.path.join(root_dir, dir))])
        
        # 创建标签映射
        self.class_to_idx = {cls_name: idx for idx, cls_name in enumerate(self.classes)}
        
        # 收集所有图像路径和标签
        self.image_paths = []
        self.labels = []
        
        for class_name in self.classes:
            for image_type in image_types:
                class_dir = os.path.join(root_dir, class_name, image_type)
                if not os.path.exists(class_dir):
                    continue
                    
                for img_name in os.listdir(class_dir):
                    if img_name.lower().endswith(('.png', '.jpg', '.jpeg')):
                        self.image_paths.append(os.path.join(class_dir, img_name))
                        self.labels.append(self.class_to_idx[class_name])
    
    def __len__(self):
        """返回数据集大小"""
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        """
        获取指定索引的样本
        
        Args:
            idx (int): 样本索引
            
        Returns:
            tuple: (image, label)
        """
        # 加载图像
        image_path = self.image_paths[idx]
        image = Image.open(image_path).convert('RGB')
        
        # 获取标签
        label = self.labels[idx]
        
        # 应用变换
        if self.transform:
            image = self.transform(image)
            
        return image, label
    
    @classmethod
    def get_class_name(cls, label):
        """
        根据数字标签获取类别名称
        
        Args:
            label (int): 数字标签
            
        Returns:
            str: 类别名称
        """
        return cls.CLASS_NAMES.get(label, "Unknown")
    
    @classmethod
    def get_label_from_name(cls, class_name):
        """
        根据类别名称获取数字标签
        
        Args:
            class_name (str): 类别名称
            
        Returns:
            int: 数字标签
        """
        for label, name in cls.CLASS_NAMES.items():
            if name == class_name:
                return label
        return -1


def get_transforms():
    """
    获取数据增强变换
    
    Returns:
        torchvision.transforms.Compose: 图像变换组合
    """
    # 训练时的数据增强
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # 测试时的变换（不包括数据增强）
    test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return train_transform, test_transform
