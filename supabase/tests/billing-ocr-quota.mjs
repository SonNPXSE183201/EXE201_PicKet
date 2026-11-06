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
    await assert.rejects(()=>db.query("select id from public.create_ocr_fallback_job($1,0.2,gen_random_uuid())",[path]),/OCR_QUOTA_EXCEEDED/,"Failed jobs still consume quota");
    await db.exec("reset role");await db.query("update public.ocr_fallback_jobs set created_at=now()-interval '25 hours' where id=$1",[firstId]);await asOwner();
    assert.equal((await db.query("select public.current_entitlements() as data")).rows[0].data.ocr_fallback_remaining,1);
    await db.query("select id from public.create_ocr_fallback_job($1,0.2,gen_random_uuid())",[path]);
    console.log(`OCR quota ${tier}: ${limit} accepted; next blocked; idempotent retry, failed-job accounting and rolling window passed`);
  }
  await db.exec("reset role");await db.query("delete from storage.objects where name=$1",[path]);await db.query("delete from auth.users where id=$1",[owner]);
}
