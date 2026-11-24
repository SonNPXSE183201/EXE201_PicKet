import assert from "node:assert/strict";

export async function validateBillingOcrQuota(db) {
  const owner="77777777-7777-4777-8777-777777777771";
  await db.exec("reset role");
  await db.query("insert into auth.users(id,email) values($1,'billing-quota@example.test')",[owner]);
  const path=owner+"/ocr/quota.jpg";
  await db.query("insert into storage.objects(bucket_id,name) values('picket-media',$1)",[path]);
  async function asOwner(){await db.exec("reset role");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec("set role authenticated");}
  for(const [tier,limit] of [["free",3],["plus",30],["pro",100]]){
    await db.exec("reset role;delete from public.ocr_fallback_jobs where user_id='"+owner+"';delete from public.play_purchases where user_id='"+owner+"'");
    if(tier!=="free") {await db.exec("set role service_role");await db.query("select public.record_play_purchase($1,$2,$3,$4,now()+interval '1 day',true)",["quota-"+tier,owner,"picket_"+tier+"_monthly",tier]);}
    await asOwner();let firstKey,firstId;
    for(let i=0;i<limit;i++){
      const key=(await db.query("select gen_random_uuid() as id")).rows[0].id;
      const job=(await db.query("select id from public.create_ocr_fallback_job($1,0.2,$2)",[path,key])).rows[0];
      if(i===0){firstKey=key;firstId=job.id;}
    }
    const used=(await db.query("select public.current_entitlements() as data")).rows[0].data;
    assert.equal(used.tier,tier);assert.equal(used.ocr_fallback_used,limit);assert.equal(used.ocr_fallback_remaining,0);
    assert.equal((await db.query("select id from public.create_ocr_fallback_job($1,0.2,$2)",[path,firstKey])).rows[0].id,firstId,"Retry at limit must return same job");
    await assert.rejects(()=>db.query("select id from public.create_ocr_fallback_job($1,0.2,gen_random_uuid())",[path]),/OCR_QUOTA_EXCEEDED/);
    await db.exec("reset role");await db.query("update public.ocr_fallback_jobs set status='failed',error_code='TEST_ONLY' where id=$1",[firstId]);await asOwner();
    assert.equal((await db.query("select public.current_entitlements() as data")).rows[0].data.ocr_fallback_remaining,1,"Failed jobs do not consume quota, even with a legacy true flag");
    let job=(await db.query("select * from public.create_ocr_fallback_job($1,0.2,gen_random_uuid())",[path])).rows[0];
    assert.equal(job.counts_quota,true,"New jobs reserve quota by default");
    async function usage(expected, message) {
      await asOwner();
      const data=(await db.query("select public.current_entitlements() as data")).rows[0].data;
      assert.equal(data.ocr_fallback_used,expected,message);
      assert.equal(data.ocr_fallback_remaining,limit-expected,message);
    }
    async function create() {
      await asOwner();
      return (await db.query("select * from public.create_ocr_fallback_job($1,0.2,gen_random_uuid())",[path])).rows[0];
    }
    async function processing(id, attempts=1) {
      await db.exec("reset role");
      await db.query("update public.ocr_fallback_jobs set status='processing',worker_id='quota-worker',attempts=$2,lease_expires_at=now()+interval '5 minutes' where id=$1",[id,attempts]);
      await db.exec("set role service_role");
    }
    async function complete(id,result) {
      await processing(id);
      assert.equal((await db.query("select public.complete_ocr_fallback_job($1,'quota-worker',$2) as ok",[id,result])).rows[0].ok,true);
    }
    async function flag(id,expected) {
      await asOwner();
      assert.equal((await db.query("select counts_quota from public.ocr_fallback_jobs where id=$1",[id])).rows[0].counts_quota,expected);
    }
    async function blocked() {
      await assert.rejects(()=>create(),/OCR_QUOTA_EXCEEDED/);
    }
    await processing(job.id);
    await usage(limit,"Processing jobs reserve quota");
    // The provider returns raw text; only text that reads like a receipt is charged.
    for(const result of [
      {rawText:"",amount:null}, {}, {rawText:"Welcome to the party 2026"}, {rawText:"TOTAL"},
      {rawText:"45000"}, {amount:0}, {amount:"45000"}, {amount:true},
    ]) {
      await complete(job.id,result);
      await flag(job.id,false);
      await usage(limit-1,"Completed jobs whose text is not a receipt release quota");
      job=await create();
      await blocked();
    }
    await complete(job.id,{rawText:"CO.OP MART | Sữa tươi 32.000 | TỔNG CỘNG 64.000",amount:null});
    await flag(job.id,true);
    await usage(limit,"Completed receipts consume quota");
    await blocked();
    await db.exec("reset role");
    await db.query("update public.ocr_fallback_jobs set result=null where id=$1",[job.id]);
    await usage(limit,"Receipt accounting survives result removal");
    await blocked();
    await db.exec("reset role");
    await db.query("update public.ocr_fallback_jobs set created_at=now()-interval '25 hours' where id=$1",[job.id]);
    await usage(limit-1,"Receipts outside the rolling 24-hour window do not count");
    job=await create();
    await processing(job.id);
    assert.equal((await db.query("select public.fail_ocr_fallback_job($1,'quota-worker','PROVIDER_TIMEOUT',true) as ok",[job.id])).rows[0].ok,true);
    await flag(job.id,true);
    await usage(limit,"Retryable failures remain queued and keep their reservation");
    await blocked();
    await processing(job.id);
    await usage(limit,"Processing retries keep their reservation");
    await complete(job.id,{amount:9000000000000});
    await flag(job.id,true);
    await blocked();
    // Expiry wipes results but a completed receipt still counts inside the 24-hour window.
    await db.exec("reset role");
    await db.query("update public.ocr_fallback_jobs set expires_at=now()-interval '1 second' where id=$1",[job.id]);
    await db.exec("set role service_role");
    await db.query("select * from public.expire_ocr_fallback_jobs()");
    await flag(job.id,true);
    assert.deepEqual((await db.query("select status,result from public.ocr_fallback_jobs where id=$1",[job.id])).rows[0],{status:"expired",result:null});
    await usage(limit,"Expired receipts still consume quota");
    await db.exec("reset role");
    await db.query("update public.ocr_fallback_jobs set created_at=now()-interval '25 hours' where id=$1",[job.id]);
    await usage(limit-1,"Receipts leave the rolling window after 24 hours");
    job=await create();
    await processing(job.id);
    assert.equal((await db.query("select public.fail_ocr_fallback_job($1,'quota-worker','INVALID_IMAGE',false) as ok",[job.id])).rows[0].ok,true);
    await flag(job.id,false);
    await usage(limit-1,"Terminal worker failures release quota");
    job=await create();
    await processing(job.id,3);
    await db.query("select public.fail_ocr_fallback_job($1,'quota-worker','PROVIDER_TIMEOUT',true)",[job.id]);
    await flag(job.id,false);
    await usage(limit-1,"Exhausted retries release quota");
    job=await create();
    await processing(job.id,3);
    await db.exec("reset role");
    await db.query("update public.ocr_fallback_jobs set lease_expires_at=now()-interval '1 second' where id=$1",[job.id]);
    await db.exec("set role service_role");
    await db.query("select * from public.claim_ocr_fallback_jobs('quota-worker',1)");
    await flag(job.id,false);
    await usage(limit-1,"Lease exhaustion releases quota");
    job=await create();
    await db.exec("reset role");
    await db.query("update public.ocr_fallback_jobs set status='cancelled' where id=$1",[job.id]);
    await usage(limit-1,"Cancelled jobs do not consume quota");
    await create();
    await blocked();
    await assert.rejects(()=>db.query("update public.ocr_fallback_jobs set counts_quota=false where user_id=$1",[owner]),/permission denied/);
    console.log(`OCR quota ${tier}: ${limit}; reservations, receipts, non-receipts, failures, expiry, idempotency and rolling window passed`);
  }
  await db.exec("reset role");await db.query("delete from storage.objects where name=$1",[path]);await db.query("delete from auth.users where id=$1",[owner]);
}
