function json(data,status=200){return Response.json(data,{status});}
async function stripe(env,params){const body=new URLSearchParams();for(const [k,v] of Object.entries(params))body.set(k,v);const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body});const d=await r.json();if(!r.ok)throw new Error(d.error?.message||'Stripe error');return d;}
export async function onRequestPost({request,env}){
 try{
  const b=await request.json(); if(!b.name||!b.email||!b.phone||!/^\d{4}-\d{2}-\d{2}$/.test(b.deliveryDate)||!Array.isArray(b.items)||!b.items.length)return json({error:'Please complete your details and choose a delivery date.'},400);
  const ids=b.items.map(x=>x.id); const placeholders=ids.map(()=>'?').join(','); const {results}=await env.DB.prepare(`SELECT * FROM products WHERE id IN (${placeholders}) AND active=1`).bind(...ids).all();
  const map=new Map(results.map(p=>[p.id,p])); let total=0; const items=[];
  for(const line of b.items){const p=map.get(line.id);const qty=Math.max(1,Math.floor(Number(line.qty)));if(!p||qty>p.stock)return json({error:`${p?.name||'A product'} is no longer available in that quantity.`},409);total+=p.price*qty;items.push({id:p.id,name:p.name,price:p.price,qty});}
  const orderId=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO orders(id,name,email,phone,delivery_date,items,total,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(orderId,b.name,b.email,b.phone,b.deliveryDate,JSON.stringify(items),total,'pending',new Date().toISOString()).run();
  const lineParams={};items.forEach((x,i)=>{lineParams[`line_items[${i}][price_data][currency]`]='gbp';lineParams[`line_items[${i}][price_data][product_data][name]`]=x.name;lineParams[`line_items[${i}][price_data][unit_amount]`]=String(Math.round(x.price*100));lineParams[`line_items[${i}][quantity]`]=String(x.qty);});
  lineParams.mode='payment';lineParams.success_url=new URL('/success.html?order='+orderId,request.url).toString();lineParams.cancel_url=new URL('/?checkout=cancelled',request.url).toString();lineParams.customer_email=b.email;lineParams['metadata[order_id]']=orderId;lineParams['metadata[delivery_date]']=b.deliveryDate;
  const session=await stripe(env,lineParams); await env.DB.prepare('UPDATE orders SET stripe_session_id=? WHERE id=?').bind(session.id,orderId).run(); return json({url:session.url});
 }catch(e){return json({error:e.message||'Unable to start checkout.'},500)}
}
