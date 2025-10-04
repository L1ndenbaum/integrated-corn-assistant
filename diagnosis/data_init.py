import os, shutil

ABS_BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)
DATA_DIR = os.path.join(
    ABS_BASE_DIR,
    "data"
)
DATASET_NAME = "PlantVillageCorn"
DATASET_PATH = os.path.join(DATA_DIR, DATASET_NAME)

CORN_DISEASE_FOLDER_NAMES = (
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___healthy",
    "Corn_(maize)___Northern_Leaf_Blight"
)
DST_CLASS_NAMES = (
    "CercosporaLeafSpot",
    "Rust",
    "Healthy", 
    "NothernLeafBlight",
)

if __name__ == "__main__":
    rm_set = set(CORN_DISEASE_FOLDER_NAMES)
    for image_type in ("color", "segmented"):
        base_dir = os.path.join(DATASET_PATH, image_type)
        for foldername in os.listdir(base_dir):
            if foldername not in CORN_DISEASE_FOLDER_NAMES:
                path = os.path.join(base_dir, foldername)
                shutil.rmtree(path)

    for image_type in ("color", "segmented"):
        base_dir = os.path.join(DATASET_PATH, image_type)
        for src_name, dst_name in zip(CORN_DISEASE_FOLDER_NAMES, DST_CLASS_NAMES):
            path = os.path.join(base_dir, src_name)
            if(os.path.exists(path)):
                os.rename(
                    path,
                    os.path.join(base_dir, dst_name)
                )