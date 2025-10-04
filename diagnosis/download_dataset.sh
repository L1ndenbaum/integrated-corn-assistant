#!/bin/bash
current_dir="$(pwd)"
target_dir="$current_dir/data/PlantVillageCorn"

if [ ! -d "$target_dir" ]; then
    mkdir -p "$target_dir"
    echo "$target_dir 不存在, 已创建"
fi

cd "$target_dir"
if [ -z "$(ls -A)" ]; then
    curl -L -o "$target_dir/plantvillage-dataset.zip" \
    https://www.kaggle.com/api/v1/datasets/download/abdallahalidev/plantvillage-dataset
fi

unzip "./plantvillage-dataset.zip"
mv "./plantvillage dataset"/* "./"
rm -rf "./plantvillage dataset"
rm -rf "./grayscale"
rm "./plantvillage-dataset.zip"