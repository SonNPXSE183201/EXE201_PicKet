import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeCurrencies } from "./currency-summary";
const wallet=(id:string,currencyCode:string,openingBalance:number)=>({id,currencyCode,openingBalance,archived:false,deletedAt:null});
const tx=(id:string,accountId:string,kind:string,amount:number,destinationAccountId:string|null=null)=>({id,accountId,kind,amount,destinationAccountId,occurredAt:"2026-10-23T00:00:00.000Z",deletedAt:null});
test("balances are currency scoped and transfer is neutral within a currency",()=>{
 const result=summarizeCurrencies([wallet("a","VND",1000),wallet("b","VND",500),wallet("usd","USD",20)],[tx("transfer","a","transfer",100,"b"),tx("spend","a","expense",200),tx("refund","a","refund",50),tx("income","usd","income",10)],"2026-10","Asia/Ho_Chi_Minh");
 assert.deepEqual(result.totals,[{currency:"USD",balance:30,income:10,expense:0},{currency:"VND",balance:1350,income:0,expense:150}]);
 assert.equal(result.walletBalances.a,750);assert.equal(result.walletBalances.b,600);
});
test("deleted records are excluded and cross-currency transfers reject",()=>{
 const accounts=[wallet("a","VND",100),wallet("usd","USD",20)];
 assert.throws(()=>summarizeCurrencies(accounts,[tx("t","a","transfer",1,"usd")],"2026-10","UTC"));
 const result=summarizeCurrencies(accounts,[{...tx("x","a","expense",20),deletedAt:"2026-10-23T01:00:00Z"}],"2026-10","UTC");
 assert.equal(result.walletBalances.a,100);
});
test("monthly grouping uses the selected timezone and does not convert currencies",()=>{
 const result=summarizeCurrencies([wallet("a","VND",100)],[{...tx("x","a","income",20),occurredAt:"2026-09-30T18:00:00Z"}],"2026-10","Asia/Ho_Chi_Minh");
 assert.equal(result.totals[0].income,20);
});
