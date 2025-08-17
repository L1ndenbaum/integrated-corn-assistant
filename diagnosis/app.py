from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
from PIL import Image
import io, os
from typing import List
import uvicorn
from dataset import CornDiseaseDataset
from model import create_model, get_preprocessing_transforms

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = FastAPI(title="玉米病虫害识别API", description="提供玉米病虫害图像分类服务")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应更具体地指定
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
transform = None
device = None

def initialize_model():
    """初始化模型和相关组件"""
    global model, transform, device
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = create_model(num_classes=4, pretrained=False)
    
    # 加载训练好的模型权重
    try:
        model.load_state_dict(torch.load(f'{BASE_DIR}/corn_disease_model_20250817_230202.pth'))
    except Exception as e:
        print(f"加载模型权重失败: {e}")
        print("继续使用随机初始化的模型")
    
    model.eval()
    model = model.to(device)
    transform = get_preprocessing_transforms()

@app.get("/")
async def root():
    """根路由"""
    return {"message": "玉米病虫害识别API已启动"}

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}

@app.post("/predict")
async def predict(files: List[UploadFile] = File(...)):
    """
    对上传的图像进行病虫害分类预测
    
    Args:
        files (List[UploadFile]): 上传的图像文件列表
        
    Returns:
        Dict[str, Any]: 预测结果
    """
    if not model or not transform:
        initialize_model()
    if not files:
        raise HTTPException(status_code=400, detail="没有上传任何文件")
    
    results = []

    for file in files:
        try:
            # 验证文件类型
            if file.content_type and not file.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail=f"文件 {file.filename} 不是图像文件")
            
            # 读取图像
            contents = await file.read()
            image = Image.open(io.BytesIO(contents)).convert('RGB')
            
            # 预处理图像
            processed_image = transform(image).unsqueeze(0)  # type : ignore
            processed_image = processed_image.to(device)
            
            # 进行预测
            with torch.no_grad():
                outputs = model(processed_image) # type : ignore
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probabilities, 1)
            
            # 获取类别名称
            class_name = CornDiseaseDataset.get_class_name(predicted.item())
            
            results.append({
                "filename": file.filename,
                "predicted_class": class_name,
                "confidence": confidence.item(),
                "class_id": predicted.item()
            })
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"处理文件 {file.filename} 时出错: {str(e)}")
    
    return {"predictions": results}

@app.post("/predict_single")
async def predict_single(file: UploadFile = File(...)):
    """
    对单个图像进行病虫害分类预测
    
    Args:
        file (UploadFile): 上传的图像文件
        
    Returns:
        Dict[str, Any]: 预测结果
    """
    # 为了简化，直接调用批量预测
    return await predict([file])

if __name__ == "__main__":
    # 初始化模型
    initialize_model()
    print("玉米病虫害识别API已启动")
    print("访问 http://localhost:8000/docs 查看API文档")
    uvicorn.run(app, host="localhost", port=8000)
