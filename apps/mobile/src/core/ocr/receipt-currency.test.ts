import assert from 'node:assert/strict';
import test from 'node:test';
import {receiptCurrencyWarning} from './receipt-currency';

test('single fractional price digits warn without treating thousands or quantities as currency',()=>{
  for(const row of ['Tea 12.5','TOTAL 12,5','Tea 12.50']) assert.match(receiptCurrencyWarning(`SHOP\n${row}\nTỔNG 25000`)??'',/thập phân/);
  for(const row of ['Tea 12.000','Tea 12.0','Táo x 0.5','Táo SL: 0.5','Ngày 29.10']) assert.equal(receiptCurrencyWarning(`SHOP\n${row}\nTỔNG 25000`),null,row);
});

test('foreign monetary markers prevent silent VND handoff',()=>{
  for(const text of ['TOTAL Rp. 38.000','TOTAL 38000 IDR','TOTAL USD 12.50','TOTAL €12,50','TOTAL $12.50','TOTAL 12.50 EUR','TOTAL 12.50$','TOTAL 12.50 €','TOTAL 38.000 Rp','TOTAL 38000 Rp.','TOTAL AUD 12500','TOTAL CAD 12500','TOTAL 12500 AUD','TOTAL 12500 CAD','TOTAL KRW 15000','TOTAL ₩15,000','TOTAL ₱12500','TOTAL 12500₱','TOTAL AED 12500','TOTAL 12500 AED','TOTAL SAR 500','TOTAL ₪100','TOTAL ₺250','TOTAL ₦5000','TOTAL RM 45']){
    assert.match(receiptCurrencyWarning(text)??'',/VND|tiền tệ/,text);
  }
});
test('Vietnamese amounts and merchant substrings are not foreign currency markers',()=>{
  for(const text of ['Tổng 38000 VND','Tổng 38.000đ','Tổng 38000','RP STORE\nTrà 25000','USDREAM STORE\nTổng 25000'])assert.equal(receiptCurrencyWarning(text),null,text);
});
test('nonzero decimal currency is never silently rounded into VND',()=>{
  assert.match(receiptCurrencyWarning('TOTAL 12,50')??'',/thập phân/);
  assert.equal(receiptCurrencyWarning('Tổng 12.000,00'),null);
});

test('fractional product quantities do not become a currency warning',()=>{
  for(const text of ['0,50 x Táo xanh 25000\nTổng 25000','Táo xanh 0.50 x 50000 | 25000\nTổng 25000','SL\n0,50\nTổng 25000'])assert.equal(receiptCurrencyWarning(text),null,text);
});

test('nonzero decimal product prices block VND even when the payable total looks integral',()=>{
  for(const row of ['Trà 12.50','Trà 12,50','Trà 12,50 đ','Trà 12.50 VND','Trà 12.50.']){
    const text=`PICKET MART\nHÓA ĐƠN\n29/10/2026\nCà phê 25000\n${row}\nTỔNG 25000`;
    assert.match(receiptCurrencyWarning(text)??'',/thập phân/,row);
  }
});

test('decimal quantity units and receipt metadata are not monetary evidence',()=>{
  for(const row of ['Táo 0,50 kg 25000','Táo 0.50kg','Táo 0.50 x 50000','Táo x 0.50','Táo SL: 0.50','SL 0.50','Số lượng 0,50','Quantity 0.50','Ngày 29.10','Giờ 12.50','Điện thoại 12.50','Mã hóa đơn 12.50']){
    assert.equal(receiptCurrencyWarning(`SHOP\n29/10/2026\n${row}\nTỔNG 25000`),null,row);
  }
  assert.equal(receiptCurrencyWarning('SHOP\nTrà 12.000\nTỔNG 12.000'),null);
  assert.equal(receiptCurrencyWarning('SHOP\nTrà 25000.00\nTỔNG 25000'),null);
});
