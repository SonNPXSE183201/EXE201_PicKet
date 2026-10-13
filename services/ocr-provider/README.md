# Picket private OCR provider

Dịch vụ nội bộ dùng `PP-OCRv5_mobile_det` và model Latin mobile (có tiếng
Việt), chạy CPU với một inference đồng thời. Endpoint `/predict` yêu cầu Bearer
token và không được publish ra Internet; chỉ `ocr-worker` trong Docker network
được gọi dịch vụ này.

MKL-DNN/oneDNN đang tắt chủ động vì PaddlePaddle 3.3.1 lỗi PIR attribute với
model detection này. Inference Paddle CPU thường vẫn hoạt động; chỉ bật lại sau
khi có benchmark và regression test trên image version mới.

Model được tải khi build image để lần khởi động production không phụ thuộc việc
tải model. Có thể truyền `--build-arg PRELOAD_MODELS=0` khi chỉ kiểm tra nhanh
Dockerfile; lần khởi động đầu sau đó sẽ cần tải model.

PaddlePaddle dùng wheel CPU `3.3.1` từ PyPI chính thức. Docker đặt retry và
timeout riêng vì wheel Linux x86-64 gần 200 MB.

Chạy unit test contract không cần cài PaddleOCR:

```powershell
cd services/ocr-provider
python -m unittest discover -s tests
```
