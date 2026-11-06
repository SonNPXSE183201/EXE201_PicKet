export type BiometricCopy = {promptMessage:string;promptDescription:string;cancelLabel:string};
export function biometricOptions(androidSdk: number,copy?:BiometricCopy) {
  return {
    promptMessage: copy?.promptMessage ?? "Mở khóa Picket",
    promptDescription: copy?.promptDescription ?? "Xác thực để xem dữ liệu tài chính.",
    cancelLabel: copy?.cancelLabel ?? "Hủy",
    disableDeviceFallback: androidSdk < 30,
    biometricsSecurityLevel: "strong" as const,
  };
}
