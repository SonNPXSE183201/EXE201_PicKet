export function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "m3 10 9-7 9 7v11h-6v-7H9v7H3Z",
    receipt: "M5 3h14v18l-3-2-4 2-4-2-3 2Zm3 5h8m-8 4h8m-8 4h5",
    wallet: "M3 6h17v15H3V3h14v3m3 5h-6v5h6m-3-2h.01",
    chart: "M4 3v18h17M8 17v-4m5 4V8m5 9V4",
    person: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 8 0 0 1 16 0v3",
    users: "M12.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM3 20c.5-3.3 2.7-5.5 6-5.5s5.5 2.2 6 5.5M16 4.5a3.5 3.5 0 0 1 0 7m2 3.3c1.7.8 2.7 2.5 3 4.7",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    calendar: "M4 5h16v16H4ZM8 2v6m8-6v6M4 10h16",
    transfer: "M3 7h17l-4-4m5 14H4l4 4",
    grid: "M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z",
    heart: "M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8a4.5 4.5 0 0 1 8.8-1.3 4.5 4.5 0 0 1 8.8 1.3Z",
    shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-5 9 3 3 6-6",
    logout: "M9 3H3v18h6m4-5 5-4-5-4m-5 4h13",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "M18 6 6 18M6 6l12 12",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm6-2 4 4",
    chevronDown: "m6 9 6 6 6-6",
    chevronRight: "m9 18 6-6-6-6",
    eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm10 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    eyeOff: "m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-4 4.9M6.2 6.2C3.5 8.1 2 12 2 12s3.6 7 10 7c1.2 0 2.3-.2 3.3-.6",
    arrowLeft: "M19 12H5m7 7-7-7 7-7",
    arrowRight: "M5 12h14m-7-7 7 7-7 7",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.grid} />
    </svg>
  );
}
