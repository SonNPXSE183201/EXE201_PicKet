export const calendarVi = {
  choose:"Chọn ngày",open:"Mở lịch để chọn ngày",previous:"Tháng trước trên lịch",next:"Tháng sau trên lịch",
  month:"Tháng {{month}}/{{year}}",today:"Hôm nay",cancel:"Hủy chọn ngày",
  openingReceipt:"Đang mở ảnh hóa đơn",receiptPhoto:"Ảnh hóa đơn {{title}}",
  photoError:"Chưa mở được ảnh. Kết nối mạng rồi thử lại.",reloadPhoto:"Tải lại ảnh",
  day:"Ngày {{day}} tháng {{month}}",due:", có hóa đơn cần thanh toán",receipt:", có hóa đơn",transaction:", có giao dịch",scan:", quét hóa đơn",
  monday:"T2",tuesday:"T3",wednesday:"T4",thursday:"T5",friday:"T6",saturday:"T7",sunday:"CN",
};
export const calendarEn:Record<keyof typeof calendarVi,string> = {
  choose:"Choose date",open:"Open calendar to choose a date",previous:"Previous calendar month",next:"Next calendar month",
  month:"{{month}}/{{year}}",today:"Today",cancel:"Cancel date selection",
  openingReceipt:"Opening receipt photo",receiptPhoto:"Receipt photo: {{title}}",
  photoError:"Could not open the photo. Connect to the internet and try again.",reloadPhoto:"Reload photo",
  day:"Day {{day}}, month {{month}}",due:", bill payment due",receipt:", receipt available",transaction:", transactions available",scan:", scan receipt",
  monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat",sunday:"Sun",
};
