import assert from "node:assert/strict";
import { test } from "node:test";
import { biometricOptions } from "./biometric-options";
test("Android 10 and earlier never combine strong biometric and device credentials", () => {
  for (const sdk of [24, 28, 29]) assert.equal(biometricOptions(sdk).disableDeviceFallback, true);
});
test("Android 11 and later allow device credential fallback", () => {
  assert.equal(biometricOptions(30).disableDeviceFallback, false);
  assert.equal(biometricOptions(36).disableDeviceFallback, false);
});
test("translated prompts retain strong biometric restrictions on Android 10",()=>{
  const options=biometricOptions(29,{promptMessage:"Unlock Picket",promptDescription:"Authenticate to continue",cancelLabel:"Cancel"});
  assert.equal(options.promptMessage,"Unlock Picket");
  assert.equal(options.disableDeviceFallback,true);
  assert.equal(options.biometricsSecurityLevel,"strong");
});
