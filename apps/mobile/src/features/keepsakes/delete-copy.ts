export function keepsakeDeleteMessage(localMode: boolean): string {
  return localMode
    ? "Ảnh và thông tin của món đồ sẽ bị xóa khỏi thiết bị này."
    : "Món đồ sẽ được lưu trữ và không còn xuất hiện trong bộ sưu tập đã đồng bộ.";
}
