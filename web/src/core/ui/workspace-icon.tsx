export function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "m3 10 9-7 9 7v11h-6v-7H9v7H3Z",
    receipt: "M5 3h14v18l-3-2-4 2-4-2-3 2Zm3 5h8m-8 4h8m-8 4h5",
    wallet: "M3 6h17v15H3V3h14v3m3 5h-6v5h6m-3-2h.01",
    chart: "M4 3v18h17M8 17v-4m5 4V8m5 9V4",
    person: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 8 0 0 1 16 0v3",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    calendar: "M4 5h16v16H4ZM8 2v6m8-6v6M4 10h16",
    transfer: "M3 7h17l-4-4m5 14H4l4 4",
    grid: "M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z",
    shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-5 9 3 3 6-6",
    logout: "M9 3H3v18h6m4-5 5-4-5-4m-5 4h13",
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
