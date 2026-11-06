/** Keep native recognition off the encrypted-file persistence critical path. */
export async function prepareCapture<T>(recognize: () => Promise<void>, persist: () => Promise<T>): Promise<T> {
  const started=Date.now();
  const measure=async<R>(phase:string,operation:()=>Promise<R>)=>{
    const start=Date.now();
    try{return await operation();}
    finally{console.info("PICKET_CAPTURE_PERF",JSON.stringify({phase,durationMs:Date.now()-start}));}
  };
  const [ocr, stored] = await Promise.allSettled([
    Promise.resolve().then(()=>measure("recognize",recognize)),
    Promise.resolve().then(()=>measure("persist-image",persist)),
  ]);
  console.info("PICKET_CAPTURE_PERF",JSON.stringify({phase:"capture-total",durationMs:Date.now()-started}));
  if (stored.status === "rejected") throw stored.reason;
  if (ocr.status === "rejected") throw ocr.reason;
  return stored.value;
}
