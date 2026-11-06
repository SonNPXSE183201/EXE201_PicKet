import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { authEn, authVi } from "../../core/i18n/auth-resources";
import { createAppI18n } from "../../core/i18n/instance";

test("auth screens and mapped validation errors have complete vi/en copy",()=>{
  const paths=["features/billing/payos-billing-screen.tsx","app/(auth)/login.tsx","app/(auth)/register.tsx","app/(auth)/forgot-password.tsx","app/(auth)/verify-email.tsx","app/auth/reset-password.tsx","app/auth/callback.tsx","features/auth/auth-errors.ts","features/auth/auth-context.tsx"];
  const missing=new Set<string>();
  for(const path of paths){
    const source=ts.createSourceFile(path,readFileSync(resolve("src",path),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const visit=(node:ts.Node)=>{
      if(ts.isStringLiteralLike(node)&&/[À-ỹ]/.test(node.text)&&(!(authVi as Record<string,string>)[node.text]||!(authEn as Record<string,string>)[node.text]))missing.add(node.text);
      ts.forEachChild(node,visit);
    };
    visit(source);
  }
  assert.deepEqual([...missing],[]);
});
test("auth interpolation and existing validation messages switch language without changing input",async()=>{
  const i18n=createAppI18n("en");
  const email="sample@example.test";
  assert.equal(i18n.t("verificationDestination",{ns:"auth",email}),`Enter the code sent to ${email}.`);
  assert.equal(i18n.t("Email chưa hợp lệ.",{ns:"auth"}),"Enter a valid email address.");
  await i18n.changeLanguage("vi");
  assert.equal(i18n.t("verificationDestination",{ns:"auth",email}),`Nhập mã đã gửi tới ${email}.`);
});
