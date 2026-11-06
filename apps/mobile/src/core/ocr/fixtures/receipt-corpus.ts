export type ReceiptCorpusCase = {
  name: string;
  rawText: string;
  expected: {
    merchant: string;
    amount: number;
    date: string;
    lineItemNames: string[];
  };
};

/**
 * Synthetic, privacy-safe samples covering layouts commonly produced by
 * Vietnamese retail, convenience-store, cafe and pharmacy receipts.
 */
export const receiptCorpus: ReceiptCorpusCase[] = [
  {
    name: "Vietnamese supermarket with decimal suffix",
    rawText: [
      "PICKET MART QUAN 7",
      "Ngày bán: 09.10.2026 18:42",
      "Sữa tươi 35.500,00",
      "Bánh mì 2 x 12.000,00 24.000,00",
      "Tạm tính 59.500,00",
      "TỔNG THANH TOÁN 59.500,00 đ",
    ].join("\n"),
    expected: {
      merchant: "PICKET MART QUAN 7",
      amount: 59500,
      date: "2026-10-09T00:00:00.000Z",
      lineItemNames: ["Sữa tươi", "Bánh mì"],
    },
  },
  {
    name: "Convenience store with English total and rejected cash tender",
    rawText: [
      "PICKET CONVENIENCE",
      "DATE 08-10-26 21:15",
      "Mineral Water 12,000",
      "Snack 18,500",
      "CASH RECEIVED 50,000",
      "CHANGE 19,500",
      "TOTAL DUE 30,500 VND",
    ].join("\n"),
    expected: {
      merchant: "PICKET CONVENIENCE",
      amount: 30500,
      date: "2026-10-08T00:00:00.000Z",
      lineItemNames: ["Mineral Water", "Snack"],
    },
  },
  {
    name: "Cafe with total amount on the following line",
    rawText: [
      "CA PHE GOC PHO",
      "07/10/2026",
      "Bac xiu 45 000",
      "Tra dao 30 000",
      "TỔNG CỘNG",
      "75 000 ₫",
    ].join("\n"),
    expected: {
      merchant: "CA PHE GOC PHO",
      amount: 75000,
      date: "2026-10-07T00:00:00.000Z",
      lineItemNames: ["Bac xiu", "Tra dao"],
    },
  },
  {
    name: "Pharmacy using amount payable wording",
    rawText: [
      "NHA THUOC PICKET",
      "Ngày: 06/10/2026",
      "Vitamin C 85.000",
      "Khau trang 3 @ 15.000 45.000",
      "SỐ TIỀN PHẢI TRẢ 130.000đ",
    ].join("\n"),
    expected: {
      merchant: "NHA THUOC PICKET",
      amount: 130000,
      date: "2026-10-06T00:00:00.000Z",
      lineItemNames: ["Vitamin C", "Khau trang"],
    },
  },
];
