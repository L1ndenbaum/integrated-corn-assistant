import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import transforms
import numpy as np
from sklearn.metrics import accuracy_score, classification_report
import os
from datetime import datetime

from dataset import CornDiseaseDataset, get_transforms, current_dir
from model import create_model

def train_model(model, train_loader, val_loader, num_epochs=10, learning_rate=0.001, device='cpu'):
    """
    训练模型
    
    Args:
        model (nn.Module): 要训练的模型
        train_loader (DataLoader): 训练数据加载器
        val_loader (DataLoader): 验证数据加载器
        num_epochs (int): 训练轮数
        learning_rate (float): 学习率
        device (str): 设备 ('cpu' 或 'cuda')
        
    Returns:
        dict: 训练历史记录
    """
    # 将模型移到指定设备
    model.to(device)
    
    # 定义损失函数和优化器
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    
    # 存储训练历史
    train_losses = []
    val_accuracies = []
    
    print(f"开始训练，使用设备: {device}")
    print(f"训练轮数: {num_epochs}")
    
    for epoch in range(num_epochs):
        # 训练阶段
        model.train()
        running_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for batch_idx, (images, labels) in enumerate(train_loader):
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            _, predicted = outputs.max(1)
            train_total += labels.size(0)
            train_correct += predicted.eq(labels).sum().item()
            
            if batch_idx % 10 == 0:
                print(f'Epoch [{epoch+1}/{num_epochs}], Step [{batch_idx}/{len(train_loader)}], Loss: {loss.item():.4f}')
        
        # 损失
        epoch_train_loss = running_loss / len(train_loader)
        train_acc = 100. * train_correct / train_total
        train_losses.append(epoch_train_loss)
        
        # 验证
        model.eval()
        val_correct = 0
        val_total = 0
        all_preds = []
        all_labels = []
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                _, predicted = outputs.max(1)
                
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()
                
                all_preds.extend(predicted.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())
        
        val_acc = 100. * val_correct / val_total
        val_accuracies.append(val_acc)
        
        print(f'Epoch [{epoch+1}/{num_epochs}]')
        print(f'Train Loss: {epoch_train_loss:.4f}, Train Acc: {train_acc:.2f}%')
        print(f'Val Acc: {val_acc:.2f}%')
        print('-' * 50)
    
    return {
        'train_losses': train_losses,
        'val_accuracies': val_accuracies
    }

def evaluate_model(model, test_loader, device='cpu'):
    """
    评估模型性能
    
    Args:
        model (nn.Module): 要评估的模型
        test_loader (DataLoader): 测试数据加载器
        device (str): 设备 ('cpu' 或 'cuda')
        
    Returns:
        dict: 评估结果
    """
    model.eval()
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for images, labels in test_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, predicted = outputs.max(1)
            
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    
    # 计算准确率
    accuracy = accuracy_score(all_labels, all_preds)
    
    # 打印详细报告
    print("分类报告:")
    print(classification_report(all_labels, all_preds))
    
    return {
        'accuracy': accuracy,
        'predictions': all_preds,
        'labels': all_labels
    }

def main():
    """
    执行训练和测试流程
    """
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"使用设备: {device}")

    data_root = f"{current_dir}/data/PlantVillageCorn"
    if not os.path.exists(data_root):
        print(f"警告: 数据路径不存在: {data_root}")
        print("请确保数据集已放置在正确的目录中")
        return
    
    train_transform, test_transform = get_transforms()
    
    print("创建训练数据集...")
    train_dataset = CornDiseaseDataset(
        root_dir=data_root,
        transform=train_transform
    )
    
    print("创建验证和测试数据集...")
    val_dataset = CornDiseaseDataset(
        root_dir=data_root,
        transform=test_transform,
    )
    
    batch_size = 32
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
    model = create_model(num_classes=len(train_dataset.classes), pretrained=True)

    print("开始训练...")
    history = train_model(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        num_epochs=10,
        learning_rate=0.001,
        device=device
    )
    
    # 评估模型
    print("评估模型...")
    results = evaluate_model(model, val_loader, device)
    
    print(f"最终测试准确率: {results['accuracy']:.4f}")
    
    # 保存模型
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = f"{current_dir}/corn_disease_model_{timestamp}.pth"
    torch.save(model.state_dict(), model_path)
    print(f"模型已保存到: {model_path}")

if __name__ == "__main__":
    main()
